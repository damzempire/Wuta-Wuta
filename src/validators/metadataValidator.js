/**
 * metadataValidator.js
 * Assignment: Develop Art Metadata Validator
 *
 * Middleware service that validates all incoming art metadata
 * (title, description, attributes) against Stellar SEP-38/40 standards
 * before any NFT minting operation is permitted.
 *
 * SEP-38: Quote & asset price protocol — defines asset descriptor format.
 * SEP-40: Asset list standard — defines canonical asset metadata structure.
 *
 * Reference:
 *   https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md
 *   https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0040.md
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** SEP-40 max lengths */
const LIMITS = {
  TITLE_MIN: 1,
  TITLE_MAX: 100,
  DESCRIPTION_MIN: 1,
  DESCRIPTION_MAX: 1000,
  ATTRIBUTE_KEY_MAX: 64,
  ATTRIBUTE_VALUE_MAX: 256,
  ATTRIBUTES_MAX_COUNT: 30,       // SEP-40 §4.2 — max 30 trait entries
  ASSET_CODE_MAX: 12,             // SEP-38 — Stellar asset code limit
  ROYALTY_MIN: 0,
  ROYALTY_MAX: 100,
};

/** SEP-38 canonical asset descriptor pattern: CODE:ISSUER or CODE:native */
const SEP38_ASSET_PATTERN = /^[A-Z0-9]{1,12}:(G[A-Z2-7]{55}|native)$/;

/** SEP-40 allowed attribute display_type values */
const ALLOWED_DISPLAY_TYPES = ["string", "number", "boost_number", "boost_percentage", "date"];

/** Reserved SEP-40 system trait keys that must not be duplicated */
const RESERVED_TRAIT_KEYS = ["Artist", "AI Model", "Collaboration Type", "Asset Code", "Issuer"];

// ─── Validation Result Builder ────────────────────────────────────────────────

/**
 * Creates a structured validation result object.
 * @param {boolean}  valid
 * @param {string[]} errors  - Hard failures (block minting).
 * @param {string[]} warnings - Soft issues (allow minting with notice).
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function buildResult(errors = [], warnings = []) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

// ─── Field-level Validators ───────────────────────────────────────────────────

/**
 * Validates the artwork title per SEP-40 §3.1.
 * @param {*} title
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateTitle(title) {
  const errors = [];
  const warnings = [];

  if (title === undefined || title === null) {
    errors.push("SEP-40 §3.1: 'title' is required.");
    return { errors, warnings };
  }
  if (typeof title !== "string") {
    errors.push("SEP-40 §3.1: 'title' must be a string.");
    return { errors, warnings };
  }

  const trimmed = title.trim();
  if (trimmed.length < LIMITS.TITLE_MIN) {
    errors.push(`SEP-40 §3.1: 'title' must not be empty.`);
  }
  if (trimmed.length > LIMITS.TITLE_MAX) {
    errors.push(`SEP-40 §3.1: 'title' exceeds maximum length of ${LIMITS.TITLE_MAX} characters (got ${trimmed.length}).`);
  }
  // Warn if title contains leading/trailing whitespace
  if (title !== trimmed) {
    warnings.push("'title' has leading or trailing whitespace — it will be trimmed.");
  }
  // Warn if title contains control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    warnings.push("'title' contains control characters which may render incorrectly.");
  }

  return { errors, warnings };
}

/**
 * Validates the artwork description per SEP-40 §3.2.
 * @param {*} description
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateDescription(description) {
  const errors = [];
  const warnings = [];

  if (description === undefined || description === null) {
    errors.push("SEP-40 §3.2: 'description' is required.");
    return { errors, warnings };
  }
  if (typeof description !== "string") {
    errors.push("SEP-40 §3.2: 'description' must be a string.");
    return { errors, warnings };
  }

  const trimmed = description.trim();
  if (trimmed.length < LIMITS.DESCRIPTION_MIN) {
    errors.push("SEP-40 §3.2: 'description' must not be empty.");
  }
  if (trimmed.length > LIMITS.DESCRIPTION_MAX) {
    errors.push(
      `SEP-40 §3.2: 'description' exceeds maximum length of ${LIMITS.DESCRIPTION_MAX} characters (got ${trimmed.length}).`
    );
  }
  if (description !== trimmed) {
    warnings.push("'description' has leading or trailing whitespace — it will be trimmed.");
  }

  return { errors, warnings };
}

/**
 * Validates the attributes array per SEP-40 §4.
 * Each attribute must have: { trait_type: string, value: string|number, display_type?: string }
 * @param {*} attributes
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateAttributes(attributes) {
  const errors = [];
  const warnings = [];

  if (attributes === undefined || attributes === null) {
    errors.push("SEP-40 §4: 'attributes' is required.");
    return { errors, warnings };
  }
  if (!Array.isArray(attributes)) {
    errors.push("SEP-40 §4: 'attributes' must be an array.");
    return { errors, warnings };
  }
  if (attributes.length === 0) {
    errors.push("SEP-40 §4: 'attributes' array must contain at least one entry.");
    return { errors, warnings };
  }
  if (attributes.length > LIMITS.ATTRIBUTES_MAX_COUNT) {
    errors.push(
      `SEP-40 §4.2: 'attributes' exceeds maximum of ${LIMITS.ATTRIBUTES_MAX_COUNT} entries (got ${attributes.length}).`
    );
  }

  // Track trait_type keys for duplicate detection
  const seenKeys = new Set();

  attributes.forEach((attr, idx) => {
    const prefix = `SEP-40 §4 attributes[${idx}]`;

    if (typeof attr !== "object" || attr === null || Array.isArray(attr)) {
      errors.push(`${prefix}: each attribute must be a plain object.`);
      return;
    }

    // ── trait_type ───────────────────────────────────────────────────────────
    if (!attr.trait_type) {
      errors.push(`${prefix}: 'trait_type' is required.`);
    } else if (typeof attr.trait_type !== "string") {
      errors.push(`${prefix}: 'trait_type' must be a string.`);
    } else if (attr.trait_type.trim().length === 0) {
      errors.push(`${prefix}: 'trait_type' must not be empty.`);
    } else if (attr.trait_type.length > LIMITS.ATTRIBUTE_KEY_MAX) {
      errors.push(`${prefix}: 'trait_type' exceeds ${LIMITS.ATTRIBUTE_KEY_MAX} characters.`);
    } else {
      // Duplicate key check
      const key = attr.trait_type.toLowerCase();
      if (seenKeys.has(key)) {
        errors.push(`${prefix}: duplicate 'trait_type' "${attr.trait_type}" — SEP-40 requires unique trait keys.`);
      }
      seenKeys.add(key);
    }

    // ── value ────────────────────────────────────────────────────────────────
    if (attr.value === undefined || attr.value === null) {
      errors.push(`${prefix}: 'value' is required.`);
    } else if (typeof attr.value === "string") {
      if (attr.value.trim().length === 0) {
        errors.push(`${prefix}: 'value' string must not be empty.`);
      }
      if (attr.value.length > LIMITS.ATTRIBUTE_VALUE_MAX) {
        errors.push(`${prefix}: 'value' string exceeds ${LIMITS.ATTRIBUTE_VALUE_MAX} characters.`);
      }
    } else if (typeof attr.value === "number") {
      if (!isFinite(attr.value)) {
        errors.push(`${prefix}: 'value' number must be finite (no NaN/Infinity).`);
      }
    } else {
      errors.push(`${prefix}: 'value' must be a string or number (got ${typeof attr.value}).`);
    }

    // ── display_type (optional) ──────────────────────────────────────────────
    if (attr.display_type !== undefined) {
      if (!ALLOWED_DISPLAY_TYPES.includes(attr.display_type)) {
        errors.push(
          `${prefix}: 'display_type' "${attr.display_type}" is not a valid SEP-40 display type. ` +
          `Allowed: ${ALLOWED_DISPLAY_TYPES.join(", ")}.`
        );
      }
      // Numeric display types require a numeric value
      if (["number", "boost_number", "boost_percentage", "date"].includes(attr.display_type)) {
        if (typeof attr.value !== "number") {
          errors.push(
            `${prefix}: display_type "${attr.display_type}" requires a numeric 'value' (got ${typeof attr.value}).`
          );
        }
      }
    }

    // ── warn about reserved keys being overridden manually ───────────────────
    if (RESERVED_TRAIT_KEYS.includes(attr.trait_type)) {
      warnings.push(
        `attributes[${idx}]: '${attr.trait_type}' is a reserved SEP-40 system trait — ensure the value is accurate.`
      );
    }
  });

  return { errors, warnings };
}

/**
 * Validates the SEP-38 asset descriptor (assetCode + issuer).
 * SEP-38 §3 defines asset descriptors as "CODE:ISSUER" or "CODE:native".
 * @param {*} assetCode
 * @param {*} issuer
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateSEP38Asset(assetCode, issuer) {
  const errors = [];
  const warnings = [];

  if (!assetCode && !issuer) {
    // Neither field present — optional block, skip
    return { errors, warnings };
  }

  if (!assetCode) {
    errors.push("SEP-38 §3: 'assetCode' is required when 'issuer' is provided.");
  } else if (typeof assetCode !== "string") {
    errors.push("SEP-38 §3: 'assetCode' must be a string.");
  } else if (!/^[A-Z0-9]{1,12}$/.test(assetCode)) {
    errors.push(
      `SEP-38 §3: 'assetCode' "${assetCode}" is invalid — must be 1–12 uppercase alphanumeric characters.`
    );
  }

  if (!issuer) {
    errors.push("SEP-38 §3: 'issuer' is required when 'assetCode' is provided.");
  } else if (typeof issuer !== "string") {
    errors.push("SEP-38 §3: 'issuer' must be a string.");
  } else if (issuer !== "native") {
    // Stellar public key: starts with G, 56 base32 chars
    if (!/^G[A-Z2-7]{55}$/.test(issuer)) {
      errors.push(
        `SEP-38 §3: 'issuer' "${issuer}" is not a valid Stellar public key (must start with G and be 56 chars) or "native".`
      );
    }
  }

  // Build and verify the combined descriptor
  if (assetCode && issuer && typeof assetCode === "string" && typeof issuer === "string") {
    const descriptor = `${assetCode}:${issuer}`;
    if (!SEP38_ASSET_PATTERN.test(descriptor)) {
      errors.push(`SEP-38 §3: Combined asset descriptor "${descriptor}" does not match the required pattern CODE:ISSUER.`);
    }
  }

  return { errors, warnings };
}

/**
 * Validates the royalty percentage.
 * @param {*} royaltyPercentage
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateRoyalty(royaltyPercentage) {
  const errors = [];
  const warnings = [];

  if (royaltyPercentage === undefined || royaltyPercentage === null) {
    return { errors, warnings }; // optional field
  }

  if (typeof royaltyPercentage !== "number") {
    errors.push("'royaltyPercentage' must be a number.");
    return { errors, warnings };
  }
  if (!isFinite(royaltyPercentage)) {
    errors.push("'royaltyPercentage' must be a finite number.");
    return { errors, warnings };
  }
  if (royaltyPercentage < LIMITS.ROYALTY_MIN || royaltyPercentage > LIMITS.ROYALTY_MAX) {
    errors.push(
      `'royaltyPercentage' must be between ${LIMITS.ROYALTY_MIN} and ${LIMITS.ROYALTY_MAX} (got ${royaltyPercentage}).`
    );
  }
  if (royaltyPercentage > 10) {
    warnings.push(`'royaltyPercentage' of ${royaltyPercentage}% is unusually high — confirm this is intentional.`);
  }

  return { errors, warnings };
}

// ─── Main Validator ───────────────────────────────────────────────────────────

/**
 * validateArtMetadata
 *
 * Primary entry point. Validates the full metadata payload against
 * SEP-38 and SEP-40 standards before minting is allowed.
 *
 * @param {object} metadata - Raw metadata object from the frontend/API.
 * @returns {{ valid: boolean, errors: string[], warnings: string[], timestamp: string }}
 *
 * @example
 * const result = validateArtMetadata({
 *   title: "Dreamscape #001",
 *   description: "An AI-human collaborative piece.",
 *   attributes: [{ trait_type: "AI Model", value: "Stable Diffusion" }],
 *   assetCode: "MUSE",
 *   issuer: "GABC...XYZ",
 *   royaltyPercentage: 5,
 * });
 * if (!result.valid) throw new Error(result.errors.join("; "));
 */
function validateArtMetadata(metadata) {
  const allErrors   = [];
  const allWarnings = [];

  // ── Type guard ───────────────────────────────────────────────────────────
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return buildResult(["Metadata must be a plain object."], []);
  }

  // ── Field validations ────────────────────────────────────────────────────
  const checks = [
    validateTitle(metadata.title),
    validateDescription(metadata.description),
    validateAttributes(metadata.attributes),
    validateSEP38Asset(metadata.assetCode, metadata.issuer),
    validateRoyalty(metadata.royaltyPercentage),
  ];

  checks.forEach(({ errors, warnings }) => {
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  });

  // ── Unknown field warning ─────────────────────────────────────────────────
  const knownFields = new Set([
    "title", "description", "attributes",
    "assetCode", "issuer", "royaltyPercentage",
    "artistAddress", "aiModel", "collaborators", "image",
  ]);
  Object.keys(metadata).forEach((key) => {
    if (!knownFields.has(key)) {
      allWarnings.push(`Unknown field '${key}' will be ignored during minting.`);
    }
  });

  return buildResult(allErrors, allWarnings);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  validateArtMetadata,
  validateTitle,
  validateDescription,
  validateAttributes,
  validateSEP38Asset,
  validateRoyalty,
  LIMITS,
  ALLOWED_DISPLAY_TYPES,
};