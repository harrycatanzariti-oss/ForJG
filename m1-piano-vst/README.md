# House Piano 89

An audio effect plugin (VST3 + CLAP) that turns a clean sampled grand piano, such as
Spectrasonics Keyscape, into the bright, thin, punchy late-80s ROM piano heard on classic
house records (the "M1 piano" sound).

Put it straight after Keyscape on the instrument track. Download builds for Windows, macOS
and Linux from this repository's Releases page (`house-piano-v0.1.0`); see `INSTALL.txt`.

## Controls

| Knob     | What it does                                                         |
| -------- | -------------------------------------------------------------------- |
| Body Cut | Low cut (30–200 Hz) and a dip at 320 Hz to remove the grand's weight |
| Honk     | Nasal peak at 1.15 kHz plus presence at 3.4 kHz                      |
| Sparkle  | Harmonic exciter on everything above 2.8 kHz                         |
| Punch    | Transient shaper: harder attack, faster decay                        |
| Squash   | Stereo-linked compressor with auto make-up gain                      |
| Vintage  | Lowers the sample rate (down to 15 kHz) and bit depth (down to 10)   |
| Chorus   | Two-voice stereo chorus                                              |
| Mix      | Dry/wet                                                              |
| Output   | Output level                                                         |

Presets in the editor: Classic M1, Deep House, Rave Stab, Lo-Fi ROM, Subtle.

This is an effect, not a sample player: it reshapes the piano you feed it, so it gets close
to the sound rather than being an exact copy of the original hardware.

## Building

Needs Rust (stable). On Linux also install the X11/GL dev packages listed in
`.github/workflows/house-piano.yml`.

```sh
cargo test --lib                              # DSP tests
cargo xtask bundle house_piano --release      # -> target/bundled/
cargo xtask bundle-universal house_piano --release   # macOS universal build
```

Pushing changes under `m1-piano-vst/` runs the GitHub workflow, which builds every platform
and updates the release.

Built with [nih-plug](https://github.com/robbert-vdh/nih-plug) (ISC); because the VST3
bindings are GPLv3, this plugin is GPL-3.0-or-later.
