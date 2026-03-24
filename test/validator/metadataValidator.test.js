/**
 * test/validator/metadataValidator.test.js
 * Assignment: Develop Art Metadata Validator
 *
 * Full Jest test suite covering:
 *  - Valid payloads (should pass)
 *  - SEP-40 title, description, attributes rules
 *  - SEP-38 asset descriptor rules
 *  - Royalty validation
 *  - Edge cases and boundary conditions
 */

const {
  validateArtMetadata,
  validateTitle,
  validateDescription,
  validateAttributes,
  validateSEP38Asset,
  validateRoyalty,
  LIMITS,
} = require("../../src/validators/metadataValidator");

// ─── Shared valid fixtures ────────────────────────────────────────────────────

const VALID_ISSUER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // 56 chars, starts G, valid Stellar key format
const VALID_METADATA = {
  title: "Dreamscape #001",
  description:
    "An AI-human collaborative artwork exploring surrealist dreamscapes.",
  attributes: [
    { trait_type: "AI Model", value: "Stable Diffusion" },
    { trait_type: "Collaboration Type", value: "AI-Human" },
    { trait_type: "Artist", value: "0xArtistAddress" },
  ],
  assetCode: "MUSE",
  issuer: VALID_ISSUER,
  royaltyPercentage: 5,
};

// ─── validateArtMetadata (integration) ───────────────────────────────────────

describe("validateArtMetadata — valid payload", () => {
  it("returns valid=true for a correct metadata object", () => {
    const result = validateArtMetadata(VALID_METADATA);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("includes a timestamp in every result", () => {
    const result = validateArtMetadata(VALID_METADATA);
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it("returns valid=true when assetCode and issuer are omitted (optional)", () => {
    const { assetCode, issuer, ...partial } = VALID_METADATA;
    const result = validateArtMetadata(partial);
    expect(result.valid).toBe(true);
  });

  it("returns valid=true when royaltyPercentage is omitted (optional)", () => {
    const { royaltyPercentage, ...partial } = VALID_METADATA;
    const result = validateArtMetadata(partial);
    expect(result.valid).toBe(true);
  });

  it("warns about unknown fields", () => {
    const result = validateArtMetadata({
      ...VALID_METADATA,
      unknownField: "xyz",
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("unknownField"))).toBe(true);
  });

  it("returns valid=false for a null payload", () => {
    const result = validateArtMetadata(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/plain object/i);
  });

  it("returns valid=false for an array payload", () => {
    const result = validateArtMetadata([]);
    expect(result.valid).toBe(false);
  });
});

// ─── validateTitle ────────────────────────────────────────────────────────────

describe("validateTitle — SEP-40 §3.1", () => {
  it("accepts a normal title", () => {
    const { errors } = validateTitle("Dreamscape #001");
    expect(errors).toHaveLength(0);
  });

  it("rejects a missing title", () => {
    const { errors } = validateTitle(undefined);
    expect(errors.some((e) => e.includes("required"))).toBe(true);
  });

  it("rejects a null title", () => {
    const { errors } = validateTitle(null);
    expect(errors.some((e) => e.includes("required"))).toBe(true);
  });

  it("rejects a non-string title", () => {
    const { errors } = validateTitle(42);
    expect(errors.some((e) => e.includes("string"))).toBe(true);
  });

  it("rejects an empty string title", () => {
    const { errors } = validateTitle("");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a title exceeding 100 characters", () => {
    const { errors } = validateTitle("A".repeat(LIMITS.TITLE_MAX + 1));
    expect(errors.some((e) => e.includes("maximum length"))).toBe(true);
  });

  it("accepts a title exactly 100 characters long", () => {
    const { errors } = validateTitle("A".repeat(LIMITS.TITLE_MAX));
    expect(errors).toHaveLength(0);
  });

  it("warns about leading/trailing whitespace", () => {
    const { warnings } = validateTitle("  My Art  ");
    expect(warnings.some((w) => w.includes("whitespace"))).toBe(true);
  });
});

// ─── validateDescription ──────────────────────────────────────────────────────

describe("validateDescription — SEP-40 §3.2", () => {
  it("accepts a normal description", () => {
    const { errors } = validateDescription("A great collaborative piece.");
    expect(errors).toHaveLength(0);
  });

  it("rejects a missing description", () => {
    const { errors } = validateDescription(undefined);
    expect(errors.some((e) => e.includes("required"))).toBe(true);
  });

  it("rejects a non-string description", () => {
    const { errors } = validateDescription(true);
    expect(errors.some((e) => e.includes("string"))).toBe(true);
  });

  it("rejects an empty description", () => {
    const { errors } = validateDescription("");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a description exceeding 1000 characters", () => {
    const { errors } = validateDescription(
      "X".repeat(LIMITS.DESCRIPTION_MAX + 1),
    );
    expect(errors.some((e) => e.includes("maximum length"))).toBe(true);
  });

  it("accepts a description exactly 1000 characters", () => {
    const { errors } = validateDescription("X".repeat(LIMITS.DESCRIPTION_MAX));
    expect(errors).toHaveLength(0);
  });
});

// ─── validateAttributes ───────────────────────────────────────────────────────

describe("validateAttributes — SEP-40 §4", () => {
  const validAttrs = [
    { trait_type: "AI Model", value: "DALL-E 3" },
    { trait_type: "Style", value: "Surrealism" },
  ];

  it("accepts a valid attributes array", () => {
    const { errors } = validateAttributes(validAttrs);
    expect(errors).toHaveLength(0);
  });

  it("rejects missing attributes", () => {
    const { errors } = validateAttributes(undefined);
    expect(errors.some((e) => e.includes("required"))).toBe(true);
  });

  it("rejects non-array attributes", () => {
    const { errors } = validateAttributes({ trait_type: "X", value: "Y" });
    expect(errors.some((e) => e.includes("array"))).toBe(true);
  });

  it("rejects an empty attributes array", () => {
    const { errors } = validateAttributes([]);
    expect(errors.some((e) => e.includes("at least one"))).toBe(true);
  });

  it("rejects when count exceeds 30", () => {
    const many = Array.from({ length: 31 }, (_, i) => ({
      trait_type: `Key${i}`,
      value: "v",
    }));
    const { errors } = validateAttributes(many);
    expect(errors.some((e) => e.includes("maximum"))).toBe(true);
  });

  it("accepts exactly 30 attributes", () => {
    const thirty = Array.from({ length: 30 }, (_, i) => ({
      trait_type: `Key${i}`,
      value: "v",
    }));
    const { errors } = validateAttributes(thirty);
    expect(errors).toHaveLength(0);
  });

  it("rejects an attribute missing trait_type", () => {
    const { errors } = validateAttributes([{ value: "test" }]);
    expect(
      errors.some((e) => e.includes("trait_type") && e.includes("required")),
    ).toBe(true);
  });

  it("rejects an attribute with empty trait_type", () => {
    const { errors } = validateAttributes([{ trait_type: "", value: "test" }]);
    expect(errors.some((e) => e.includes("trait_type"))).toBe(true);
  });

  it("rejects an attribute missing value", () => {
    const { errors } = validateAttributes([{ trait_type: "Style" }]);
    expect(
      errors.some((e) => e.includes("value") && e.includes("required")),
    ).toBe(true);
  });

  it("rejects a boolean value", () => {
    const { errors } = validateAttributes([
      { trait_type: "Style", value: true },
    ]);
    expect(errors.some((e) => e.includes("string or number"))).toBe(true);
  });

  it("accepts a numeric value", () => {
    const { errors } = validateAttributes([{ trait_type: "Score", value: 42 }]);
    expect(errors).toHaveLength(0);
  });

  it("rejects NaN as a value", () => {
    const { errors } = validateAttributes([
      { trait_type: "Score", value: NaN },
    ]);
    expect(errors.some((e) => e.includes("finite"))).toBe(true);
  });

  it("rejects duplicate trait_type keys", () => {
    const { errors } = validateAttributes([
      { trait_type: "Style", value: "A" },
      { trait_type: "Style", value: "B" },
    ]);
    expect(errors.some((e) => e.includes("duplicate"))).toBe(true);
  });

  it("rejects invalid display_type", () => {
    const { errors } = validateAttributes([
      { trait_type: "X", value: "Y", display_type: "invalid" },
    ]);
    expect(errors.some((e) => e.includes("display_type"))).toBe(true);
  });

  it("accepts valid display_type 'number' with numeric value", () => {
    const { errors } = validateAttributes([
      { trait_type: "Score", value: 99, display_type: "number" },
    ]);
    expect(errors).toHaveLength(0);
  });

  it("rejects display_type 'number' with string value", () => {
    const { errors } = validateAttributes([
      { trait_type: "Score", value: "high", display_type: "number" },
    ]);
    expect(errors.some((e) => e.includes("numeric"))).toBe(true);
  });

  it("warns about reserved trait keys", () => {
    const { warnings } = validateAttributes([
      { trait_type: "Artist", value: "0xAbc" },
    ]);
    expect(warnings.some((w) => w.includes("reserved"))).toBe(true);
  });
});

// ─── validateSEP38Asset ───────────────────────────────────────────────────────

describe("validateSEP38Asset — SEP-38 §3", () => {
  it("accepts a valid assetCode + Stellar issuer", () => {
    const { errors } = validateSEP38Asset("MUSE", VALID_ISSUER);
    expect(errors).toHaveLength(0);
  });

  it("accepts CODE:native descriptor", () => {
    const { errors } = validateSEP38Asset("XLM", "native");
    expect(errors).toHaveLength(0);
  });

  it("passes silently when both assetCode and issuer are omitted", () => {
    const { errors } = validateSEP38Asset(undefined, undefined);
    expect(errors).toHaveLength(0);
  });

  it("rejects issuer without assetCode", () => {
    const { errors } = validateSEP38Asset(undefined, VALID_ISSUER);
    expect(errors.some((e) => e.includes("assetCode"))).toBe(true);
  });

  it("rejects assetCode without issuer", () => {
    const { errors } = validateSEP38Asset("MUSE", undefined);
    expect(errors.some((e) => e.includes("issuer"))).toBe(true);
  });

  it("rejects lowercase assetCode", () => {
    const { errors } = validateSEP38Asset("muse", VALID_ISSUER);
    expect(errors.some((e) => e.includes("assetCode"))).toBe(true);
  });

  it("rejects assetCode longer than 12 characters", () => {
    const { errors } = validateSEP38Asset("TOOLONGASSETC", VALID_ISSUER);
    expect(errors.some((e) => e.includes("assetCode"))).toBe(true);
  });

  it("rejects an invalid Stellar issuer (wrong length)", () => {
    const { errors } = validateSEP38Asset("MUSE", "GSHORT");
    expect(errors.some((e) => e.includes("issuer"))).toBe(true);
  });

  it("rejects an issuer that does not start with G", () => {
    const badIssuer =
      "BABC2DEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQR56789";
    const { errors } = validateSEP38Asset("MUSE", badIssuer);
    expect(errors.some((e) => e.includes("issuer"))).toBe(true);
  });
});

// ─── validateRoyalty ──────────────────────────────────────────────────────────

describe("validateRoyalty", () => {
  it("accepts a normal royalty of 5", () => {
    const { errors } = validateRoyalty(5);
    expect(errors).toHaveLength(0);
  });

  it("accepts 0%", () => {
    const { errors } = validateRoyalty(0);
    expect(errors).toHaveLength(0);
  });

  it("accepts 100%", () => {
    const { errors } = validateRoyalty(100);
    expect(errors).toHaveLength(0);
  });

  it("passes when royaltyPercentage is omitted", () => {
    const { errors } = validateRoyalty(undefined);
    expect(errors).toHaveLength(0);
  });

  it("rejects a string royalty", () => {
    const { errors } = validateRoyalty("5%");
    expect(errors.some((e) => e.includes("number"))).toBe(true);
  });

  it("rejects a negative royalty", () => {
    const { errors } = validateRoyalty(-1);
    expect(errors.some((e) => e.includes("between"))).toBe(true);
  });

  it("rejects a royalty above 100", () => {
    const { errors } = validateRoyalty(101);
    expect(errors.some((e) => e.includes("between"))).toBe(true);
  });

  it("warns when royalty exceeds 10%", () => {
    const { warnings } = validateRoyalty(15);
    expect(warnings.some((w) => w.includes("unusually high"))).toBe(true);
  });
});

// ─── Full integration — invalid combinations ─────────────────────────────────

describe("validateArtMetadata — invalid payloads block minting", () => {
  it("fails when title is missing", () => {
    const { valid, errors } = validateArtMetadata({
      ...VALID_METADATA,
      title: undefined,
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("title"))).toBe(true);
  });

  it("fails when description is missing", () => {
    const { valid } = validateArtMetadata({
      ...VALID_METADATA,
      description: undefined,
    });
    expect(valid).toBe(false);
  });

  it("fails when attributes array is empty", () => {
    const { valid } = validateArtMetadata({
      ...VALID_METADATA,
      attributes: [],
    });
    expect(valid).toBe(false);
  });

  it("accumulates multiple errors in one pass", () => {
    const { errors } = validateArtMetadata({
      title: "",
      description: undefined,
      attributes: [],
    });
    expect(errors.length).toBeGreaterThan(2);
  });

  it("fails with an http:// image — no errors raised by validator (image not validated)", () => {
    // The validator does not block on image field — that is IPFS service's job (Issue #6)
    const result = validateArtMetadata({
      ...VALID_METADATA,
      image: "http://example.com/art.png",
    });
    // Should still be valid from metadata perspective
    expect(result.valid).toBe(true);
  });
});
