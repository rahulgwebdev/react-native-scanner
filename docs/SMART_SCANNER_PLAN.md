# Smart Scanner Plan

Roadmap for turning `@cleanuidev/react-native-scanner` into a scanner that is
accurate enough for field-service work (HVAC, fire safety) where a wrong read is
far worse than a slow read.

**Design constraint:** operators do not know barcode types. All symbologies must
be enabled at once. Accuracy is therefore defended in the validation layer, not
by restricting the decoder.

**Latency budget:** ~1 second is acceptable. Trade latency for correctness freely.

---

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Correctness bugs | **Code complete — unverified on device** |
| 2 | Verification layer | Not started |
| 3 | Capture quality gate | Not started |
| 4 | ROI into the decoder | Not started |
| 5 | Operator feedback | Not started |
| 6 | Replay harness | Not started |
| 7 | Dual-decoder cross-check | Deferred |

---

## Reported failure mode

Client reports blurred captures producing **wrong values**, noticeably worse on
Android.

This is consistent with two findings in the code:

1. Android `ImageAnalysis` runs at CameraX's **640x480** default
   (`setTargetResolution` is commented out). Fewer pixels per barcode module
   means less margin before motion blur destroys the read.
2. Nothing anywhere gates frames on sharpness, and nothing requires multiple
   frames to agree before emitting.

Blur-induced decode errors are **random** — two blurred frames yield two
*different* wrong values. That is exactly the error class multi-frame consensus
defeats. (Contrast with partial/clipped reads, where every frame agrees on the
same wrong value; those need the geometric checks in Phase 2 instead.)

So Phase 2 and Phase 3 are complementary and together form the actual fix:
the gate stops most bad frames, consensus catches what slips through.

---

## Accuracy model (with all formats enabled)

### Per-format consensus tiers

Not all symbologies are equally trustworthy, so they do not get the same bar.

| Tier | Formats | Why | Frames to accept |
| --- | --- | --- | --- |
| Self-verifying | QR, Data Matrix, PDF417, Aztec | Reed-Solomon error correction | 2 |
| Check-digit | EAN-13, EAN-8, UPC-A/E, Code 128, ITF-14 | Mandatory checksum / self-checking | 2 |
| Unprotected | Code 39, ITF / I2of5, Codabar | No mandatory check digit; a **substring** of a real barcode decodes as a valid code | 4 |

### Cross-format adjudication

- One frame yielding both a Code 128 and a Code 39 candidate → prefer the
  self-checking one.
- Consecutive frames agreeing on payload but disagreeing on format → treat as a
  disagreement, reset the counter.

### Edge-touch / quiet-zone rejection

The one defense consensus cannot provide. If the operator consistently frames a
partial barcode, every frame agrees on the same wrong short value and consensus
*confirms* the error.

Fix is geometric: reject any read whose bounding box touches or comes within a
small margin of the ROI edge. A clipped 1D code is exactly how a valid-looking
partial read happens. Vision and ML Kit both expose corner points for this.

---

## Phase 1 — Correctness bugs

Bugs, not architecture. These cause field failures today. Building consensus on
top of a broken coordinate transform just yields reliable agreement on the wrong
barcode.

- [x] **iOS: orientation + coordinate transform** — `ios/BarcodeDetectionManager.swift:226`, `ios/CoordinateTransformer.swift`
      `getImageOrientation` always returns `.up`, and the video-data-output
      connection rotation is never set (nothing in `ios/` touches
      `videoOrientation` / `videoRotationAngle`). In portrait the buffer is in
      landscape sensor orientation. Vision therefore returns landscape-space
      normalized coords, which are then fed to
      `layerRectConverted(fromMetadataOutputRect:)` — which expects coords
      oriented to the preview layer's portrait connection. X and Y are
      effectively swapped, so `focusRect.contains(viewRect)`
      (`ios/ScannerViewImpl.swift:363`) tests the wrong region and drawn frames
      land in the wrong place. **Likely cause of "scanned the neighbouring label".**
      Must change as one unit with the transformer.
- [x] **iOS: in-flight guard on detection queue** — `ios/ScannerViewImpl.swift:487`, `ios/BarcodeDetectionManager.swift:117`
      Every frame is dispatched onto a serial queue with no guard.
      `alwaysDiscardsLateVideoFrames` only drops at the output stage; once
      queued, frames stack up unbounded and stale frames get decoded after the
      camera has moved on. Drop frames while a detection is in flight.
- [x] **iOS: `UPC_A` maps to the wrong symbology** — `ios/Models.swift:36`
      `case .upcA: return .upce` with a comment claiming Vision handles UPC-A as
      UPC-E. It does not — Vision reports UPC-A as `.ean13` with a leading `0`.
      Requesting `UPC_A` currently detects nothing. Map to `.ean13` and strip the
      leading zero when the caller asked for UPC-A.
- [x] **Android: `barcodeTypes` never reaches ML Kit** — `android/.../ScannerViewManager.kt:34`, `android/.../ScannerView.kt:48`
      `setBarcodeTypes` is an explicit no-op ("For now, ML Kit will detect all
      supported barcode types") and the client is built with bare
      `BarcodeScanning.getClient()`. Default stays all-formats per the design
      constraint, but the prop must actually work for customers who narrow it.
      Rebuild the client when the set changes.
- [x] **Android: analysis resolution** — `android/.../ScannerView.kt:291`
      `setTargetResolution` is commented out, so CameraX's 640x480 default
      applies. Use `ResolutionSelector` targeting 1920x1080 with a 1280x720
      fallback. **Directly implicated in the reported Android blur problem.**
- [x] **Android: cannot restart after detach** — `android/.../ScannerView.kt:205,252`
      `onDetachedFromWindow` → `stopCamera()` calls `cameraExecutor.shutdown()`
      and `barcodeScanner.close()`, but `onAttachedToWindow` → `startCamera()`
      reuses both. Navigate away and back → `RejectedExecutionException` plus a
      closed scanner. Recreate both in `startCamera()`.
- [x] **Android: `format` emitted as an integer string** — `android/.../ScannerView.kt:476`
      `barcode.format.toString()` yields `"256"`, not `"QR_CODE"`. iOS emits
      symbology names, and `BarcodeScannedEventPayload.format` is typed
      `BarcodeFormat`, so the TS type currently lies on Android.
- [x] **iOS: `format` emitted as a Vision identifier** — found while fixing the
      Android case. `observation.symbology.rawValue` yields
      `"VNBarcodeSymbologyQR"`, which is not a `BarcodeFormat` member either, so
      *both* platforms were breaking the same contract in different ways. Added
      `BarcodeFormat.jsFormatName(for:payload:)`.
- [x] **iOS: UPC-A payload normalization** — Vision reports UPC-A as a 13-digit
      EAN-13 with a leading zero; ML Kit reports UPC_A with 12 digits. iOS now
      strips the leading zero and reports `UPC_A`, so the same physical label
      produces the same string on both platforms.

### Phase 1 notes

**Orientation approach chosen.** Rather than leaving buffers in sensor
orientation and passing a matching `CGImagePropertyOrientation` to Vision (the
cheaper option), the video-data-output and preview-layer connections are both
rotated to the interface orientation and Vision keeps receiving `.up`. This
costs a per-frame transform but gives capture, preview, detection and ROI
cropping one shared coordinate space, and removes the orientation mapping table
that caused the original bug. Revisit once Phase 6 exists to verify the cheaper
path against a corpus.

**Symbology parity (beyond the original bug list).** iOS was only ever offering
10 Vision symbologies, silently missing Code 93, Codabar, MSI Plessey, GS1
DataBar, Micro QR / Micro PDF417 and unchecksummed I2of5. Since operators scan
whatever is on the equipment, the iOS default is now the full set
(`BarcodeDetectionManager.allSymbologies`), and one JS format can map to several
Vision symbologies (`BarcodeFormat.visionSymbologies` — e.g. `CODE_39` covers
plain, checksum and full-ASCII variants). `CODE_93` and `CODABAR` were added to
the JS `BarcodeFormat` enum so the emitted `format` string is always a member of
the enum.

**Platform parity over raw coverage.** MSI Plessey and the GS1 DataBar family
were deliberately left out of the iOS symbology set even though Vision supports
them, because ML Kit has no counterpart. A label that scans on iOS but not
Android is worse for a cross-platform library than one that scans on neither.
Revisit only if a customer needs them, and then find an Android path first.

**Not yet verified.** `node_modules` is not installed in this checkout, so
`yarn typecheck` / `yarn lint` have not been run, and neither native target has
been compiled. See "Verification owed" below.

### Verification owed for Phase 1

- [ ] `yarn install && yarn typecheck && yarn lint`
- [ ] Android: builds, and scanning still works end to end
- [ ] Android: navigate away from the scanner and back — previously
      `RejectedExecutionException`
- [ ] Android: confirm analysis resolution actually negotiates 1080p on target
      devices (log `imageProxy.width/height`)
- [ ] Android: confirm `format` now emits e.g. `CODE_128`, not `256`
- [ ] iOS: builds, and scanning still works end to end
- [ ] iOS: **focus-area containment is now correct** — place two labels side by
      side, confirm only the one inside the frame is read. This is the fix most
      likely to resolve the "wrong barcode" reports.
- [ ] iOS: barcode frame overlays now land on the barcode
- [ ] iOS: rotate the device, confirm preview and detection stay aligned
- [ ] iOS: confirm `UPC_A` in `barcodeTypes` now detects UPC-A labels
- [ ] Both: scan the same physical UPC-A label on each platform and confirm the
      emitted `data` and `format` are now identical

## Phase 2 — Verification layer

Replaces the time-based debounce (`ios/ScannerViewImpl.swift:446` and the Android
equivalent). A 500 ms window spaces out wrong reads; it does not reject them.

```
candidate
  ├─ structural  — length, charset, check digit (EAN/UPC/ITF-14 mod-10)
  ├─ geometric   — bbox not touching ROI edge; displacement < threshold
  ├─ pattern     — optional customer regex
  └─ consensus   — N frames agreeing on payload AND format (N per tier)
        ↓ accept
```

- [ ] Shared consensus buffer (payload + format + bbox + timestamp ring)
- [ ] Per-format tier table and `minStableFrames` resolution
- [ ] Check-digit validators (EAN-13/8, UPC-A/E, ITF-14 mod-10)
- [ ] Edge-touch / quiet-zone rejection
- [ ] Geometric stability (max inter-frame displacement)
- [ ] Cross-format adjudication
- [ ] Optional `validatePattern` regex prop
- [ ] Emit `verification: { frames, consistent, checksumValid }`
- [ ] Remove/deprecate the raw time debounce

At 30 fps, tier-3 consensus costs ~130 ms. Well inside budget.

## Phase 3 — Capture quality gate

Stop feeding the decoder frames that cannot produce a good read.

- [ ] **iOS: pixel format** — `ios/CameraManager.swift:400` switch `32BGRA` →
      `420YpCbCr8BiPlanarFullRange`. Gives a luma plane for free and cuts memory
      bandwidth.
- [ ] **Skip while focusing** — iOS `device.isAdjustingFocus` / Android AF state.
      Mid-hunt frames are the blurry ones; dropping them costs nothing.
- [ ] **Sharpness score** — variance of Laplacian over the ROI luma, downsampled
      4x. Below threshold → drop the frame. Sub-millisecond.
- [ ] **Mean luma** — feeds the low-light signal in Phase 5.
- [ ] **Motion / stability** — inter-frame bbox displacement. Distinguishes
      motion blur (tell the operator to hold steady) from focus blur (refocus).

## Phase 4 — ROI into the decoder

Crop before decoding instead of filtering after. Less work per frame, and
adjacent labels never get decoded at all.

- [ ] **iOS** — `VNDetectBarcodesRequest.regionOfInterest` derived via
      `previewLayer.metadataOutputRectConverted(fromLayerRect:)`, then Y-flipped
      into Vision space. **Depends on Phase 1** or it inherits the same bug.
- [ ] **Android** — `imageProxy.setCropRect(...)`; verify ML Kit honours the media
      image crop rect on-device, fall back to manual Y-plane crop if not.
- [ ] Default `videoZoomFactor` 1.5-2x — more pixels per barcode module without
      paying for 4K.

## Phase 5 — Operator feedback

Guidance text renders in **JS, not native**. A library that draws its own text
overlays cannot be localized or branded, and customers will want both.

- [ ] `onScanQuality` event, throttled to ~4 Hz
- [ ] `torch: 'off' | 'on' | 'auto'` with hysteresis so it does not strobe;
      default `'off'`
- [ ] Tap-to-focus — `setFocusPointOfInterest` (iOS) and `triggerAutoFocusAt`
      (Android) already exist, just need exposing
- [ ] Retarget focus/exposure to a detected barcode's centroid
- [ ] Haptic + tone on confirmed scan — techs look at the equipment, not the screen

## Phase 6 — Replay harness

- [ ] Frame capture mode (dump raw frames + metadata to disk)
- [ ] Offline replay runner over a corpus
- [ ] Corpus of real HVAC nameplates and extinguisher tags: dirty, scratched,
      oblique, low light, glossy, partial
- [ ] Accuracy report (reads, misreads, no-reads per symbology)

Without this, thresholds are tuned blind and there is no way to tell a customer
"99.x% on a 500-frame corpus".

## Phase 7 — Deferred

- [ ] Dual-decoder cross-check (zxing-cpp alongside the native engine, require
      agreement). Two independent decoders failing identically is vanishingly
      rare, but it is a meaningful build-complexity cost. Only if field data
      after Phases 1-6 still shows misreads.

---

## Target API

Defaults chosen so an integrator who passes nothing gets the safe behaviour.

```tsx
<ScannerView
  // omit entirely = all formats (the default case for field service)
  barcodeTypes={undefined}
  focusArea={{ enabled: true, size: 300 }}

  verification={{
    minStableFrames?: number | Partial<Record<BarcodeFormat, number>>,
    // default: 2 self-verifying / 2 check-digit / 4 unprotected
    validatePattern?: string,      // '^FE-\\d{8}$' where you control the tags
    rejectEdgeTouching?: boolean,  // default true
    maxDisplacement?: number,      // default 0.05
  }}

  quality={{
    minSharpness?: number,         // default ~0.35
    skipWhileFocusing?: boolean,   // default true
  }}

  torch={'off' | 'on' | 'auto'}
  onScanQuality={...}
  onBarcodeScanned={...}
/>
```

```ts
// onBarcodeScanned
{
  data: "FE-10023841",
  format: "CODE_128",
  timestamp: 1758700000000,
  boundingBox: { left, top, right, bottom },
  quality: { sharpness: 0.91, brightness: 0.74, stability: 0.96 },
  verification: { frames: 4, consistent: true, checksumValid: true },
}
```

Backward compatibility: `torch={boolean}` keeps working via a union type; all new
props are optional.

---

## Rejected approaches

**`DataScannerViewController` as the iOS backend.** It gives no access to the
frames, which is exactly what every quality-gate idea here requires (sharpness,
luma, skip-while-focusing, motion). Adopting it would mean discarding the layer
that makes the scanner smart for this use case. It would also create two
structurally different codepaths, so iOS and Android would fail differently in
the field — bad for a library sold on scan reliability. Worth a throwaway spike
as an *accuracy baseline* for the Phase 6 corpus, not as a backend.

**`AVCaptureMetadataOutput`.** Faster and lower-power than Vision, but
metadata-only — no frames. Same disqualifying trade. Frame access is what the
compute is being spent on, and it is what buys Phases 3, 4 and 5.

**Closed-loop adaptive zoom.** Zoom amplifies hand shake, and zoom changes
trigger an AF re-hunt on both platforms — each hunt produces exactly the blurry
frames being eliminated. Use barcode-width percentage for *guidance*
("move closer") instead of automatic control. Revisit only if field data demands.

**A custom ML model for barcode localization.** Vision and ML Kit already
localize as the first stage of detection. A second localizer in front adds
latency and a model to maintain for no accuracy gain.

**Restricting symbologies.** Standard advice, ruled out by the design constraint
above. Replaced by per-format consensus tiers, cross-format adjudication, and
edge-touch rejection.
