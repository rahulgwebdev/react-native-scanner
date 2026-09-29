package com.scanner

import com.google.mlkit.vision.barcode.common.Barcode

/**
 * Maps between the JS `BarcodeFormat` string enum and ML Kit's integer format
 * constants.
 *
 * Both directions matter:
 *  - [toMlKitFormat] lets the `barcodeTypes` prop actually restrict the scanner.
 *  - [toName] keeps the emitted `format` field a real format name. ML Kit's
 *    `Barcode.format` is an Int, so `toString()` on it yields "256" rather than
 *    "QR_CODE", which broke the `BarcodeScannedEventPayload.format` contract and
 *    made the field disagree with iOS.
 */
internal object BarcodeFormats {

  private val NAME_TO_ML_KIT: Map<String, Int> = mapOf(
    "QR_CODE" to Barcode.FORMAT_QR_CODE,
    "CODE_128" to Barcode.FORMAT_CODE_128,
    "CODE_39" to Barcode.FORMAT_CODE_39,
    "CODE_93" to Barcode.FORMAT_CODE_93,
    "CODABAR" to Barcode.FORMAT_CODABAR,
    "EAN_13" to Barcode.FORMAT_EAN_13,
    "EAN_8" to Barcode.FORMAT_EAN_8,
    "UPC_A" to Barcode.FORMAT_UPC_A,
    "UPC_E" to Barcode.FORMAT_UPC_E,
    "DATA_MATRIX" to Barcode.FORMAT_DATA_MATRIX,
    "PDF_417" to Barcode.FORMAT_PDF417,
    "AZTEC" to Barcode.FORMAT_AZTEC,
    "ITF" to Barcode.FORMAT_ITF
  )

  private val ML_KIT_TO_NAME: Map<Int, String> =
    NAME_TO_ML_KIT.entries.associate { (name, format) -> format to name }

  /** Returns the ML Kit constant for a JS format name, or null if unrecognized. */
  fun toMlKitFormat(name: String): Int? = NAME_TO_ML_KIT[name.trim().uppercase()]

  /** Returns the JS format name for an ML Kit constant, or "UNKNOWN". */
  fun toName(format: Int): String = ML_KIT_TO_NAME[format] ?: "UNKNOWN"
}
