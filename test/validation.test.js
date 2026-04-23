import test from "node:test";
import assert from "node:assert/strict";
import { ALLOWED_IMAGE_TYPES, isAllowedImageType, normalizeText } from "../app/validation.js";

test("allowed image types include jpeg and png", () => {
  assert.deepEqual(ALLOWED_IMAGE_TYPES, ["image/jpeg", "image/jpg", "image/png"]);
});

test("isAllowedImageType validates allowed files", () => {
  assert.equal(isAllowedImageType({ type: "image/jpeg" }), true);
  assert.equal(isAllowedImageType({ type: "image/png" }), true);
  assert.equal(isAllowedImageType({ type: "application/pdf" }), false);
  assert.equal(isAllowedImageType(null), false);
});

test("normalizeText trims and normalizes empty input", () => {
  assert.equal(normalizeText("  hola  "), "hola");
  assert.equal(normalizeText(undefined), "");
});

