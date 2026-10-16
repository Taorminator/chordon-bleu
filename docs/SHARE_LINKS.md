# Shareable browser ideas — version 1

Added 2026-10-16. Browser only; not evidence of FM1 hardware behavior.

## UX contract

LINK TEILEN opens a native modal dialog with a complete text preview before sharing or clipboard access. The generated link is a frozen snapshot, not a continuously updated live session. Both the normal demo and FM1 concept view expose it. Tab/Escape use native dialog behavior; global instrument shortcuts do not run inside the dialog; closing restores focus.

The preview discloses four root/quality pairs and independent AUTO/manual locks; selected chord; instrument and integrated DX7 preset; tempo and HOLD/PULSE/ARP; ARP rate, gate, direction and order; PULSE hits, rate and gate; recipe, key/scale, FEEL, SPICE; KEEP 1/ALL 4; and prepared delay time. Inactive ARP/PULSE settings are marked as prepared. Exclusions and access-by-link are stated explicitly.

## Encoding and validation

`#idea=<base64url UTF-8 JSON>` carries an allowlisted object with `v: 1`. Encoding is not encryption. Values are limited to existing enums, known chord qualities, built-in preset slots and browser parameter bounds. Only four chord slots are accepted. Maximum decoded size is 4096 bytes and maximum fragment length is 6000 characters. Unknown object properties are discarded, never assigned into application state. Preset-slot validation is regression-checked against the generated bundled catalog. Future incompatible schema/catalog changes require an explicit migration or new format version.

Share URLs strip unrelated query parameters; only `view=fm1` is retained if present. They do not include browser favorites, local-storage contents, undo history, imported patches, playback state or user identifiers. No server-side storage is added. The fragment is not sent as part of the HTTP request, but anyone holding the full link can decode it.

## Opening a link

On startup: load the local favorite collection, then prefer a valid shared snapshot over the last session. Render/save the resulting current session without starting audio. The favorite collection is not overwritten. Hash navigation in an already open instrument validates before stopping current playback and applying the new snapshot. Invalid links do not partially mutate the current state.

Imported custom DX7 patches cannot be reproduced on another device and are not embedded. The share dialog rejects an active custom patch and asks for an integrated preset. Inactive custom-preset selection is not transferred. Live keyboard octave/notes, held effects, their tails, FM1 concept screen selection and recording gestures are not transferred. Random ARP shares its settings, not a random seed or performance recording.

## Verification

`tests/share-idea.test.mjs` exercises the actual browser functions: encoding/decoding, bounds and version checks, prototype-property rejection, detached snapshots, independent locks, preset catalog parity, no autoplay, preserved favorites, disclosure preview, explicit clipboard/native-share calls, denied clipboard/manual-copy fallback, canceled share, modal shortcut isolation and focus restoration.

These are Node tests with substituted browser I/O, not actual iPhone share-sheet, clipboard, visual layout or accessibility-device verification.
