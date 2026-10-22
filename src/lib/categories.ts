import imageArt from "@/assets/deck-image.png";
import docArt from "@/assets/deck-document.png";
import videoArt from "@/assets/deck-video.png";
import audioArt from "@/assets/deck-audio.png";

export const categories = [
  {
    id: "image",
    index: "01",
    title: "Image",
    tagline: "Authenticity & manipulation",
    summary: "Trained detectors and, where supported, localization maps tied to pixel coordinates.",
    method: "Image-level manipulation detection plus localization models described exactly as they were trained and evaluated. Frequency-domain (2D FFT) inspection is shown as a separate signal, never folded into a verdict.",
    limits: "A heatmap shows where a model responded — not proof that a specific pixel or face was altered.",
    art: imageArt,
  },
  {
    id: "document",
    index: "02",
    title: "Document",
    tagline: "Edited-text inspection",
    summary: "Forgery localization, optional OCR, and paired comparison against a reference original.",
    method: "Coordinate-aware layout analysis and aligned difference maps against a supplied original. Personal identifiers are masked by default in previews, logs and reports.",
    limits: "A difference map proves two aligned files differ there; it does not prove fraud or reveal who changed them. Not an identity-verification service.",
    art: docArt,
  },
  {
    id: "video",
    index: "03",
    title: "Video",
    tagline: "Temporal deepfake evidence",
    summary: "Decoded, time-indexed frames analysed in chunks, with findings pinned to timestamps.",
    method: "Frames are sampled and scored per chunk so every finding maps to a timestamp range. Optional audio-visual checks only when a validated model is configured.",
    limits: "Low resolution, heavy compression or few faces lower input quality — and PiperTrace says so instead of guessing.",
    art: videoArt,
  },
  {
    id: "audio",
    index: "04",
    title: "Audio",
    tagline: "Synthetic-voice & signal",
    summary: "Real waveform, spectrogram and signal-quality analysis — labelled honestly.",
    method: "If a permitted synthetic-audio checkpoint is installed, its output is shown with its documented semantics. Otherwise PiperTrace presents signal inspection, clearly labelled as not voice-clone detection.",
    limits: "No checkpoint means \u201cmodel not configured\u201d — never a fabricated score.",
    art: audioArt,
  },
] as const;
