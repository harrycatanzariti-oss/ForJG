//! The sound engine. It has no plugin-framework code so it can be tested on its own.
//!
//! Signal flow, per stereo frame:
//!
//! ```text
//! in -> Body (low cut + mud dip) -> Honk (nasal mids + presence) -> Sparkle (exciter)
//!    -> Punch (transient shaper: louder attack, shorter decay)
//!    -> Squash (stereo-linked compressor)
//!    -> Vintage (ROM-style lower sample rate + bit depth, with reconstruction filters)
//!    -> Chorus -> dry/wet mix -> out
//! ```

use std::f32::consts::{PI, TAU};

/// Values the engine needs from the parameters, all knobs normalised to 0..1.
#[derive(Clone, Copy, Debug)]
pub struct Settings {
    pub body: f32,
    pub honk: f32,
    pub sparkle: f32,
    pub punch: f32,
    pub squash: f32,
    pub vintage: f32,
    pub chorus: f32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            body: 0.55,
            honk: 0.6,
            sparkle: 0.45,
            punch: 0.5,
            squash: 0.5,
            vintage: 0.35,
            chorus: 0.25,
        }
    }
}

// ---------------------------------------------------------------------------
// Biquad filters (RBJ cookbook, transposed direct form II)
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug)]
struct Coefs {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
}

impl Coefs {
    const THRU: Coefs = Coefs {
        b0: 1.0,
        b1: 0.0,
        b2: 0.0,
        a1: 0.0,
        a2: 0.0,
    };

    fn norm(b0: f32, b1: f32, b2: f32, a0: f32, a1: f32, a2: f32) -> Self {
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
        }
    }

    fn w0(sr: f32, f: f32) -> (f32, f32) {
        let f = f.clamp(10.0, sr * 0.49);
        let w = TAU * f / sr;
        (w.cos(), w.sin())
    }

    fn lowpass(sr: f32, f: f32, q: f32) -> Self {
        let (c, s) = Self::w0(sr, f);
        let alpha = s / (2.0 * q);
        Self::norm(
            (1.0 - c) / 2.0,
            1.0 - c,
            (1.0 - c) / 2.0,
            1.0 + alpha,
            -2.0 * c,
            1.0 - alpha,
        )
    }

    fn highpass(sr: f32, f: f32, q: f32) -> Self {
        let (c, s) = Self::w0(sr, f);
        let alpha = s / (2.0 * q);
        Self::norm(
            (1.0 + c) / 2.0,
            -(1.0 + c),
            (1.0 + c) / 2.0,
            1.0 + alpha,
            -2.0 * c,
            1.0 - alpha,
        )
    }

    fn peak(sr: f32, f: f32, q: f32, db: f32) -> Self {
        let (c, s) = Self::w0(sr, f);
        let alpha = s / (2.0 * q);
        let a = 10f32.powf(db / 40.0);
        Self::norm(
            1.0 + alpha * a,
            -2.0 * c,
            1.0 - alpha * a,
            1.0 + alpha / a,
            -2.0 * c,
            1.0 - alpha / a,
        )
    }
}

#[derive(Clone, Copy, Debug)]
struct Biquad {
    c: Coefs,
    z1: f32,
    z2: f32,
}

impl Default for Biquad {
    fn default() -> Self {
        Self {
            c: Coefs::THRU,
            z1: 0.0,
            z2: 0.0,
        }
    }
}

impl Biquad {
    #[inline]
    fn run(&mut self, x: f32) -> f32 {
        let c = &self.c;
        let y = c.b0 * x + self.z1;
        self.z1 = c.b1 * x - c.a1 * y + self.z2;
        self.z2 = c.b2 * x - c.a2 * y;
        y
    }

    fn reset(&mut self) {
        self.z1 = 0.0;
        self.z2 = 0.0;
    }
}

// Butterworth Q values for a 4th-order filter made from two biquads.
const BW4_Q: [f32; 2] = [0.541_196_1, 1.306_563];

// ---------------------------------------------------------------------------
// Per-channel state
// ---------------------------------------------------------------------------

#[derive(Default)]
struct Channel {
    body_hp: Biquad,
    mud: Biquad,
    honk: Biquad,
    presence: Biquad,
    exc_hp_in: Biquad,
    exc_hp_out: Biquad,
    pre_lp: [Biquad; 2],
    post_lp: [Biquad; 2],
    held: f32,
    delay: Vec<f32>,
}

impl Channel {
    fn reset(&mut self) {
        for f in self
            .pre_lp
            .iter_mut()
            .chain(self.post_lp.iter_mut())
            .chain([
                &mut self.body_hp,
                &mut self.mud,
                &mut self.honk,
                &mut self.presence,
                &mut self.exc_hp_in,
                &mut self.exc_hp_out,
            ])
        {
            f.reset();
        }
        self.held = 0.0;
        self.delay.iter_mut().for_each(|s| *s = 0.0);
    }
}

/// One-pole smoothing coefficient for a time constant in milliseconds.
fn coef(sr: f32, ms: f32) -> f32 {
    (-1.0 / (ms * 0.001 * sr)).exp()
}

#[inline]
fn follow(env: &mut f32, x: f32, att: f32, rel: f32) {
    let a = if x > *env { att } else { rel };
    *env = a * *env + (1.0 - a) * x;
}

#[inline]
fn to_db(x: f32) -> f32 {
    20.0 * (x.max(1e-9)).log10()
}

#[inline]
fn from_db(db: f32) -> f32 {
    10f32.powf(db / 20.0)
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

pub struct Engine {
    sr: f32,
    s: Settings,
    ch: [Channel; 2],

    // Derived from settings.
    exciter_drive: f32,
    exciter_mix: f32,
    vintage_on: bool,
    hold_step: f32,
    quant_step: f32,

    // Dynamics state (stereo-linked).
    fast_env: f32,
    slow_env: f32,
    comp_env: f32,
    c_fast: (f32, f32),
    c_slow: (f32, f32),
    c_comp: (f32, f32),

    hold_phase: f32,

    // Chorus.
    write_pos: usize,
    lfo_phase: f32,
    lfo_inc: f32,
}

const CHORUS_BASE_MS: f32 = 7.0;
const CHORUS_DEPTH_MS: f32 = 2.2;
const CHORUS_RATE_HZ: f32 = 0.6;

impl Engine {
    pub fn new(sample_rate: f32) -> Self {
        let mut e = Self {
            sr: sample_rate,
            s: Settings::default(),
            ch: Default::default(),
            exciter_drive: 1.0,
            exciter_mix: 0.0,
            vintage_on: false,
            hold_step: 1.0,
            quant_step: 0.0,
            fast_env: 0.0,
            slow_env: 0.0,
            comp_env: 0.0,
            c_fast: (0.0, 0.0),
            c_slow: (0.0, 0.0),
            c_comp: (0.0, 0.0),
            hold_phase: 0.0,
            write_pos: 0,
            lfo_phase: 0.0,
            lfo_inc: 0.0,
        };
        // Enough delay for the deepest chorus sweep plus interpolation headroom.
        let len =
            ((CHORUS_BASE_MS + CHORUS_DEPTH_MS + 2.0) * 0.001 * sample_rate).ceil() as usize + 4;
        for c in e.ch.iter_mut() {
            c.delay = vec![0.0; len];
        }
        e.c_fast = (coef(sample_rate, 0.8), coef(sample_rate, 35.0));
        e.c_slow = (coef(sample_rate, 30.0), coef(sample_rate, 350.0));
        e.c_comp = (coef(sample_rate, 3.0), coef(sample_rate, 120.0));
        e.lfo_inc = TAU * CHORUS_RATE_HZ / sample_rate;
        e.set(Settings::default());
        e
    }

    pub fn reset(&mut self) {
        for c in self.ch.iter_mut() {
            c.reset();
        }
        self.fast_env = 0.0;
        self.slow_env = 0.0;
        self.comp_env = 0.0;
        self.hold_phase = 0.0;
        self.write_pos = 0;
        self.lfo_phase = 0.0;
    }

    /// Update filter coefficients and derived values. Cheap; call once per block.
    pub fn set(&mut self, s: Settings) {
        self.s = s;
        let sr = self.sr;

        // Body: thin out the acoustic low end like the small ROM sample.
        let hp_f = 30.0 + 170.0 * s.body;
        let mud = Coefs::peak(sr, 320.0, 0.9, -7.0 * s.body);
        // Honk: the nasal, boxy mid peak and a little bite on top.
        let honk = Coefs::peak(sr, 1150.0, 0.85, 9.0 * s.honk);
        let presence = Coefs::peak(sr, 3400.0, 1.1, 4.0 * s.honk);
        // Sparkle: harmonic exciter on the top end.
        let exc_hp = Coefs::highpass(sr, 2800.0, 0.707);
        self.exciter_drive = 1.0 + 9.0 * s.sparkle;
        self.exciter_mix = 0.9 * s.sparkle;

        // Vintage: a lower internal sample rate and bit depth, as in late-80s ROM players.
        self.vintage_on = s.vintage > 0.001;
        let full = sr.min(48_000.0);
        let hold_rate = full + (15_000.0 - full) * s.vintage;
        self.hold_step = (hold_rate / sr).min(1.0);
        let bits = 16.0 - 6.0 * s.vintage;
        self.quant_step = 2.0 / 2f32.powf(bits);
        let lp_f = (0.42 * hold_rate).min(19_000.0);

        for c in self.ch.iter_mut() {
            c.body_hp.c = Coefs::highpass(sr, hp_f, 0.707);
            c.mud.c = mud;
            c.honk.c = honk;
            c.presence.c = presence;
            c.exc_hp_in.c = exc_hp;
            c.exc_hp_out.c = exc_hp;
            for (f, q) in c.pre_lp.iter_mut().zip(BW4_Q) {
                f.c = Coefs::lowpass(sr, lp_f, q);
            }
            for (f, q) in c.post_lp.iter_mut().zip(BW4_Q) {
                f.c = Coefs::lowpass(sr, lp_f, q);
            }
        }
    }

    /// Process one stereo frame in place. For mono, pass the same sample in both slots.
    #[inline]
    pub fn process(&mut self, frame: &mut [f32; 2]) {
        let s = self.s;

        // --- Tone shaping ---------------------------------------------------
        let mut y = [0.0f32; 2];
        for (i, c) in self.ch.iter_mut().enumerate() {
            let mut v = frame[i];
            v = c.body_hp.run(v);
            v = c.mud.run(v);
            v = c.honk.run(v);
            v = c.presence.run(v);
            let e = c.exc_hp_in.run(v);
            let e = (e * self.exciter_drive).tanh() / self.exciter_drive.sqrt();
            v += c.exc_hp_out.run(e) * self.exciter_mix;
            y[i] = v;
        }

        // --- Dynamics (stereo-linked) ---------------------------------------
        let level = y[0].abs().max(y[1].abs());

        follow(&mut self.fast_env, level, self.c_fast.0, self.c_fast.1);
        follow(&mut self.slow_env, level, self.c_slow.0, self.c_slow.1);
        // Positive during the attack, negative while a note decays.
        let diff = (to_db(self.fast_env + 1e-6) - to_db(self.slow_env + 1e-6)).clamp(-15.0, 15.0);
        let punch_db = (s.punch * 0.9 * diff).clamp(-12.0, 9.0);
        let punch_gain = from_db(punch_db);

        follow(
            &mut self.comp_env,
            level * punch_gain,
            self.c_comp.0,
            self.c_comp.1,
        );
        let thr = -8.0 - 20.0 * s.squash;
        let ratio = 1.0 + 5.0 * s.squash;
        let over = to_db(self.comp_env) - thr;
        let gr = if over > 0.0 {
            over * (1.0 - 1.0 / ratio)
        } else {
            0.0
        };
        let makeup = -thr * (1.0 - 1.0 / ratio) * 0.45;
        let dyn_gain = punch_gain * from_db(makeup - gr);

        for v in y.iter_mut() {
            *v *= dyn_gain;
        }

        // --- Vintage ROM character ------------------------------------------
        if self.vintage_on {
            self.hold_phase += self.hold_step;
            let sample_now = self.hold_phase >= 1.0;
            if sample_now {
                self.hold_phase -= 1.0;
            }
            let q = self.quant_step;
            for (i, c) in self.ch.iter_mut().enumerate() {
                let mut v = y[i];
                for f in c.pre_lp.iter_mut() {
                    v = f.run(v);
                }
                if sample_now {
                    c.held = (v / q).round() * q;
                }
                v = c.held;
                for f in c.post_lp.iter_mut() {
                    v = f.run(v);
                }
                y[i] = v;
            }
        }

        // --- Chorus ---------------------------------------------------------
        let len = self.ch[0].delay.len();
        let wp = self.write_pos;
        if s.chorus > 0.001 {
            let wet_amt = 0.6 * s.chorus;
            for (i, c) in self.ch.iter_mut().enumerate() {
                c.delay[wp] = y[i];
                let mut wet = 0.0;
                for voice in 0..2 {
                    let ph = self.lfo_phase + i as f32 * (PI / 2.0) + voice as f32 * PI;
                    let ms =
                        CHORUS_BASE_MS + CHORUS_DEPTH_MS * s.chorus.sqrt() * 0.5 * (1.0 + ph.sin());
                    let d = ms * 0.001 * self.sr;
                    let mut rp = wp as f32 - d;
                    if rp < 0.0 {
                        rp += len as f32;
                    }
                    let i0 = rp as usize % len;
                    let i1 = (i0 + 1) % len;
                    let fr = rp - rp.floor();
                    wet += c.delay[i0] + (c.delay[i1] - c.delay[i0]) * fr;
                }
                y[i] = y[i] * (1.0 - 0.35 * s.chorus) + wet * 0.5 * wet_amt;
            }
            self.lfo_phase += self.lfo_inc;
            if self.lfo_phase > TAU {
                self.lfo_phase -= TAU;
            }
        } else {
            for (i, c) in self.ch.iter_mut().enumerate() {
                c.delay[wp] = y[i];
            }
        }
        self.write_pos = (wp + 1) % len;

        *frame = y;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A crude decaying piano-ish note: a few harmonics with an exponential envelope.
    fn note(sr: f32, f0: f32, n: usize) -> Vec<f32> {
        (0..n)
            .map(|i| {
                let t = i as f32 / sr;
                let env = (-t * 2.5).exp();
                (1..8)
                    .map(|h| (TAU * f0 * h as f32 * t).sin() / h as f32)
                    .sum::<f32>()
                    * 0.3
                    * env
            })
            .collect()
    }

    fn run(sr: f32, s: Settings, input: &[f32]) -> Vec<[f32; 2]> {
        let mut e = Engine::new(sr);
        e.set(s);
        input
            .iter()
            .map(|&x| {
                let mut f = [x, x];
                e.process(&mut f);
                f
            })
            .collect()
    }

    #[test]
    fn output_is_finite_and_bounded_at_all_sample_rates() {
        for sr in [44_100.0, 48_000.0, 96_000.0, 192_000.0] {
            let input = note(sr, 220.0, sr as usize);
            for s in [
                Settings::default(),
                Settings {
                    body: 1.0,
                    honk: 1.0,
                    sparkle: 1.0,
                    punch: 1.0,
                    squash: 1.0,
                    vintage: 1.0,
                    chorus: 1.0,
                },
                Settings {
                    body: 0.0,
                    honk: 0.0,
                    sparkle: 0.0,
                    punch: 0.0,
                    squash: 0.0,
                    vintage: 0.0,
                    chorus: 0.0,
                },
            ] {
                let out = run(sr, s, &input);
                let peak = out.iter().flatten().fold(0.0f32, |m, v| m.max(v.abs()));
                assert!(out.iter().flatten().all(|v| v.is_finite()), "NaN at {sr}");
                assert!(peak < 4.0, "peak {peak} too hot at {sr} with {s:?}");
                assert!(peak > 0.01, "silent at {sr} with {s:?}");
            }
        }
    }

    #[test]
    fn all_knobs_at_zero_is_close_to_transparent() {
        let sr = 48_000.0;
        let input = note(sr, 440.0, 24_000);
        let s = Settings {
            body: 0.0,
            honk: 0.0,
            sparkle: 0.0,
            punch: 0.0,
            squash: 0.0,
            vintage: 0.0,
            chorus: 0.0,
        };
        let out = run(sr, s, &input);
        // The 30 Hz low cut shifts phase, so compare loudness rather than samples.
        let rms_in = (input[2000..].iter().map(|v| v * v).sum::<f32>() / 22_000.0).sqrt();
        let rms_out = (out[2000..].iter().map(|f| f[0] * f[0]).sum::<f32>() / 22_000.0).sqrt();
        let ratio = rms_out / rms_in;
        assert!((0.9..1.1).contains(&ratio), "level changed by {ratio}");
    }

    #[test]
    fn body_removes_low_end() {
        let sr = 48_000.0;
        let input: Vec<f32> = (0..48_000)
            .map(|i| (TAU * 80.0 * i as f32 / sr).sin() * 0.5)
            .collect();
        let base = Settings {
            honk: 0.0,
            sparkle: 0.0,
            punch: 0.0,
            squash: 0.0,
            vintage: 0.0,
            chorus: 0.0,
            body: 0.0,
        };
        let rms = |o: &[[f32; 2]]| {
            (o[10_000..].iter().map(|f| f[0] * f[0]).sum::<f32>() / (o.len() - 10_000) as f32)
                .sqrt()
        };
        let open = rms(&run(sr, base, &input));
        let thin = rms(&run(sr, Settings { body: 1.0, ..base }, &input));
        assert!(thin < open * 0.5, "80 Hz only went from {open} to {thin}");
    }
}
