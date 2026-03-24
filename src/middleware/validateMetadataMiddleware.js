/**
 * validateMetadataMiddleware.js
 * Assignment: Develop Art Metadata Validator
 *
 * Express middleware that intercepts all incoming mint requests,
 * runs the SEP-38/40 validator, and either passes the request
 * through or blocks it with a structured error response.
 *
 * Usage (in your Express app):
 *   const { validateMetadataMiddleware } = require('./middleware/validateMetadataMiddleware');
 *   app.post('/api/mint', validateMetadataMiddleware, mintController);
 */

const { validateArtMetadata } = require("../validators/metadataValidator");

// ─── HTTP Status Codes ────────────────────────────────────────────────────────
const HTTP_422 = 422; // Unprocessable Entity — validation failure
const HTTP_400 = 400; // Bad Request — malformed payload

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * validateMetadataMiddleware
 *
 * Sits between the route and the mint controller.
 * - Extracts `metadata` from request body.
 * - Runs SEP-38/40 validation.
 * - If INVALID: responds with 422 and full error list (minting blocked).
 * - If VALID:   attaches `req.validatedMetadata` and calls next().
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validateMetadataMiddleware(req, res, next) {
  // ── 1. Extract payload ────────────────────────────────────────────────────
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(HTTP_400).json({
      success: false,
      message: "Request body must be a JSON object.",
      errors: ["Missing or malformed request body."],
      warnings: [],
    });
  }

  // Support two payload shapes:
  //   { metadata: { title, description, ... } }   ← explicit wrapper
  //   { title, description, ... }                  ← flat body
  const metadata =
    body.metadata && typeof body.metadata === "object" ? body.metadata : body;

  // ── 2. Run validator ──────────────────────────────────────────────────────
  const result = validateArtMetadata(metadata);

  // ── 3. Log for audit trail ────────────────────────────────────────────────
  const logEntry = {
    timestamp: result.timestamp,
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    title:
      typeof metadata.title === "string"
        ? metadata.title.slice(0, 40)
        : "[missing]",
  };
  console.log("[MetadataValidator]", JSON.stringify(logEntry));

  // ── 4. Block if invalid ───────────────────────────────────────────────────
  if (!result.valid) {
    return res.status(HTTP_422).json({
      success: false,
      message: "Art metadata failed SEP-38/40 validation. Minting blocked.",
      errors: result.errors,
      warnings: result.warnings,
      timestamp: result.timestamp,
    });
  }

  // ── 5. Pass through if valid ──────────────────────────────────────────────
  // Attach sanitised metadata to request so the mint controller can use it
  req.validatedMetadata = {
    title: metadata.title.trim(),
    description: metadata.description.trim(),
    attributes: metadata.attributes,
    assetCode: metadata.assetCode || null,
    issuer: metadata.issuer || null,
    royaltyPercentage: metadata.royaltyPercentage ?? null,
    artistAddress: metadata.artistAddress || null,
    aiModel: metadata.aiModel || null,
    collaborators: metadata.collaborators || [],
    image: metadata.image || null,
    _validationWarnings: result.warnings, // surfaced to controller for optional logging
  };

  next();
}

// ─── Standalone validator endpoint (optional utility route) ──────────────────

/**
 * validateOnlyHandler
 *
 * Useful for a dry-run validation endpoint: POST /api/validate-metadata
 * Returns the full validation result without triggering a mint.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
function validateOnlyHandler(req, res) {
  const body = req.body;
  const metadata =
    body?.metadata && typeof body.metadata === "object" ? body.metadata : body;

  const result = validateArtMetadata(metadata);

  return res.status(result.valid ? 200 : HTTP_422).json({
    success: result.valid,
    message: result.valid
      ? "Metadata is valid and ready for minting."
      : "Metadata failed SEP-38/40 validation.",
    errors: result.errors,
    warnings: result.warnings,
    timestamp: result.timestamp,
  });
}

module.exports = {
  validateMetadataMiddleware,
  validateOnlyHandler,
};
