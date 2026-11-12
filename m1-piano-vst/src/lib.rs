//! House Piano 89: an audio effect that turns a clean sampled grand (Keyscape, or any other)
//! into the bright, thin, punchy late-80s ROM piano heard all over house records.

use nih_plug::prelude::*;
use nih_plug_egui::{create_egui_editor, egui, widgets, EguiState};
use std::sync::Arc;

pub mod dsp;

/// Presets shown as buttons in the editor: (name, body, honk, sparkle, punch, squash, vintage, chorus).
pub const PRESETS: &[(&str, [f32; 7])] = &[
    ("Classic M1", [0.55, 0.60, 0.45, 0.50, 0.50, 0.35, 0.25]),
    ("Deep House", [0.40, 0.45, 0.30, 0.35, 0.60, 0.30, 0.45]),
    ("Rave Stab", [0.80, 0.85, 0.70, 0.80, 0.75, 0.50, 0.15]),
    ("Lo-Fi ROM", [0.65, 0.55, 0.35, 0.45, 0.55, 0.85, 0.30]),
    ("Subtle", [0.30, 0.30, 0.20, 0.25, 0.30, 0.15, 0.10]),
];

pub struct HousePiano {
    params: Arc<HousePianoParams>,
    engine: dsp::Engine,
}

#[derive(Params)]
pub struct HousePianoParams {
    #[persist = "editor-state"]
    editor_state: Arc<EguiState>,

    #[id = "body"]
    pub body: FloatParam,
    #[id = "honk"]
    pub honk: FloatParam,
    #[id = "sparkle"]
    pub sparkle: FloatParam,
    #[id = "punch"]
    pub punch: FloatParam,
    #[id = "squash"]
    pub squash: FloatParam,
    #[id = "vintage"]
    pub vintage: FloatParam,
    #[id = "chorus"]
    pub chorus: FloatParam,
    #[id = "mix"]
    pub mix: FloatParam,
    #[id = "output"]
    pub output: FloatParam,
}

fn knob(name: &str, default: f32) -> FloatParam {
    FloatParam::new(name, default, FloatRange::Linear { min: 0.0, max: 1.0 })
        .with_unit("%")
        .with_value_to_string(formatters::v2s_f32_percentage(0))
        .with_string_to_value(formatters::s2v_f32_percentage())
}

impl Default for HousePianoParams {
    fn default() -> Self {
        let d = PRESETS[0].1;
        Self {
            editor_state: EguiState::from_size(460, 430),
            body: knob("Body Cut", d[0]),
            honk: knob("Honk", d[1]),
            sparkle: knob("Sparkle", d[2]),
            punch: knob("Punch", d[3]),
            squash: knob("Squash", d[4]),
            vintage: knob("Vintage", d[5]),
            chorus: knob("Chorus", d[6]),
            mix: knob("Mix", 1.0).with_smoother(SmoothingStyle::Linear(30.0)),
            output: FloatParam::new(
                "Output",
                util::db_to_gain(-3.0),
                FloatRange::Skewed {
                    min: util::db_to_gain(-24.0),
                    max: util::db_to_gain(12.0),
                    factor: FloatRange::gain_skew_factor(-24.0, 12.0),
                },
            )
            .with_smoother(SmoothingStyle::Logarithmic(50.0))
            .with_unit(" dB")
            .with_value_to_string(formatters::v2s_f32_gain_to_db(1))
            .with_string_to_value(formatters::s2v_f32_gain_to_db()),
        }
    }
}

impl HousePianoParams {
    fn settings(&self) -> dsp::Settings {
        dsp::Settings {
            body: self.body.value(),
            honk: self.honk.value(),
            sparkle: self.sparkle.value(),
            punch: self.punch.value(),
            squash: self.squash.value(),
            vintage: self.vintage.value(),
            chorus: self.chorus.value(),
        }
    }

    fn tone_params(&self) -> [&FloatParam; 7] {
        [
            &self.body,
            &self.honk,
            &self.sparkle,
            &self.punch,
            &self.squash,
            &self.vintage,
            &self.chorus,
        ]
    }
}

impl Default for HousePiano {
    fn default() -> Self {
        Self {
            params: Arc::new(HousePianoParams::default()),
            engine: dsp::Engine::new(44_100.0),
        }
    }
}

impl Plugin for HousePiano {
    const NAME: &'static str = "House Piano 89";
    const VENDOR: &'static str = "ForJG";
    const URL: &'static str = "https://github.com/harrycatanzariti-oss/ForJG";
    const EMAIL: &'static str = "";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");

    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[
        AudioIOLayout {
            main_input_channels: NonZeroU32::new(2),
            main_output_channels: NonZeroU32::new(2),
            ..AudioIOLayout::const_default()
        },
        AudioIOLayout {
            main_input_channels: NonZeroU32::new(1),
            main_output_channels: NonZeroU32::new(1),
            ..AudioIOLayout::const_default()
        },
    ];

    const SAMPLE_ACCURATE_AUTOMATION: bool = false;

    type SysExMessage = ();
    type BackgroundTask = ();

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }

    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        let params = self.params.clone();
        create_egui_editor(
            self.params.editor_state.clone(),
            (),
            |_, _| {},
            move |ctx, setter, _| {
                egui::CentralPanel::default().show(ctx, |ui| {
                    ui.heading("House Piano 89");
                    ui.label("Put this after Keyscape (or any clean piano) for that late-80s house piano.");
                    ui.add_space(8.0);

                    ui.horizontal_wrapped(|ui| {
                        for (name, values) in PRESETS {
                            if ui.button(*name).clicked() {
                                for (p, v) in params.tone_params().into_iter().zip(values) {
                                    setter.begin_set_parameter(p);
                                    setter.set_parameter(p, *v);
                                    setter.end_set_parameter(p);
                                }
                            }
                        }
                    });
                    ui.add_space(8.0);

                    let rows: [(&FloatParam, &str); 9] = [
                        (&params.body, "Thins the low end"),
                        (&params.honk, "Nasal, boxy mids"),
                        (&params.sparkle, "Bright harmonic sheen"),
                        (&params.punch, "Harder attack, shorter decay"),
                        (&params.squash, "Compression"),
                        (&params.vintage, "Old ROM sample rate and bits"),
                        (&params.chorus, "Stereo chorus"),
                        (&params.mix, "Dry / wet"),
                        (&params.output, "Output level"),
                    ];
                    egui::Grid::new("params").num_columns(3).spacing([10.0, 8.0]).show(ui, |ui| {
                        for (p, hint) in rows {
                            ui.label(p.name());
                            ui.add(widgets::ParamSlider::for_param(p, setter).with_width(200.0));
                            ui.weak(hint);
                            ui.end_row();
                        }
                    });
                });
            },
        )
    }

    fn initialize(
        &mut self,
        _layout: &AudioIOLayout,
        buffer_config: &BufferConfig,
        _context: &mut impl InitContext<Self>,
    ) -> bool {
        self.engine = dsp::Engine::new(buffer_config.sample_rate);
        true
    }

    fn reset(&mut self) {
        self.engine.reset();
    }

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        _context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        self.engine.set(self.params.settings());
        let stereo = buffer.channels() >= 2;

        for mut frame in buffer.iter_samples() {
            let mix = self.params.mix.smoothed.next();
            let out = self.params.output.smoothed.next();
            let mut it = frame.iter_mut();
            let l = it.next().unwrap();
            if let Some(r) = it.next().filter(|_| stereo) {
                let dry = [*l, *r];
                let mut f = dry;
                self.engine.process(&mut f);
                *l = (dry[0] + (f[0] - dry[0]) * mix) * out;
                *r = (dry[1] + (f[1] - dry[1]) * mix) * out;
            } else {
                let dry = *l;
                let mut f = [dry, dry];
                self.engine.process(&mut f);
                *l = (dry + (0.5 * (f[0] + f[1]) - dry) * mix) * out;
            }
        }

        ProcessStatus::Normal
    }
}

impl ClapPlugin for HousePiano {
    const CLAP_ID: &'static str = "com.forjg.house-piano-89";
    const CLAP_DESCRIPTION: Option<&'static str> =
        Some("Turns a clean piano into an M1-style house piano");
    const CLAP_MANUAL_URL: Option<&'static str> = Some(Self::URL);
    const CLAP_SUPPORT_URL: Option<&'static str> = None;
    const CLAP_FEATURES: &'static [ClapFeature] = &[
        ClapFeature::AudioEffect,
        ClapFeature::Stereo,
        ClapFeature::Mono,
        ClapFeature::Equalizer,
        ClapFeature::Chorus,
    ];
}

impl Vst3Plugin for HousePiano {
    const VST3_CLASS_ID: [u8; 16] = *b"HousePiano89FJG1";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] = &[
        Vst3SubCategory::Fx,
        Vst3SubCategory::Eq,
        Vst3SubCategory::Modulation,
    ];
}

nih_export_clap!(HousePiano);
nih_export_vst3!(HousePiano);
