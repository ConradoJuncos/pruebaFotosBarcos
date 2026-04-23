export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export function isAllowedImageType(file) {
  return Boolean(file && ALLOWED_IMAGE_TYPES.includes(file.type));
}

export function normalizeText(value) {
  return String(value || "").trim();
}

