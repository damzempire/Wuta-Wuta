/**
 * test/validator/middleware.test.js
 * Assignment: Develop Art Metadata Validator
 *
 * Tests for the Express middleware using lightweight mock req/res objects.
 * No real HTTP server needed.
 */

const {
  validateMetadataMiddleware,
  validateOnlyHandler,
} = require("../../src/middleware/validateMetadataMiddleware");

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const VALID_ISSUER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // valid 56-char Stellar key

const VALID_BODY = {
  title: "Dreamscape #001",
  description: "An AI-human collaborative artwork.",
  attributes: [
    { trait_type: "AI Model", value: "Stable Diffusion" },
    { trait_type: "Collaboration Type", value: "AI-Human" },
  ],
  assetCode: "MUSE",
  issuer: VALID_ISSUER,
  royaltyPercentage: 5,
};

// ─── validateMetadataMiddleware ───────────────────────────────────────────────

describe("validateMetadataMiddleware", () => {
  it("calls next() for valid metadata", () => {
    const req = { body: VALID_BODY };
    const res = mockRes();
    const next = jest.fn();

    validateMetadataMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("attaches req.validatedMetadata on success", () => {
    const req = { body: VALID_BODY };
    const res = mockRes();
    const next = jest.fn();

    validateMetadataMiddleware(req, res, next);
    expect(req.validatedMetadata).toBeDefined();
    expect(req.validatedMetadata.title).toBe("Dreamscape #001");
  });

  it("trims whitespace from title in validatedMetadata", () => {
    const req = { body: { ...VALID_BODY, title: "  My Art  " } };
    const res = mockRes();
    const next = jest.fn();

    validateMetadataMiddleware(req, res, next);
    expect(req.validatedMetadata.title).toBe("My Art");
  });

  it("responds 422 for invalid metadata and does NOT call next()", () => {
    const req = { body: { title: "", description: "Desc", attributes: [] } };
    const res = mockRes();
    const next = jest.fn();

    validateMetadataMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errors: expect.any(Array) }),
    );
  });

  it("responds 400 when body is missing", () => {
    const req = { body: null };
    const res = mockRes();
    const next = jest.fn();

    validateMetadataMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("supports the wrapped { metadata: { ... } } payload shape", () => {
    const req = { body: { metadata: VALID_BODY } };
    const res = mockRes();
    const next = jest.fn();

    validateMetadataMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("includes validation errors in the 422 response body", () => {
    const req = {
      body: { title: undefined, description: undefined, attributes: [] },
    };
    const res = mockRes();
    const next = jest.fn();

    validateMetadataMiddleware(req, res, next);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.errors.length).toBeGreaterThan(0);
    expect(jsonArg.message).toMatch(/minting blocked/i);
  });
});

// ─── validateOnlyHandler ──────────────────────────────────────────────────────

describe("validateOnlyHandler", () => {
  it("returns 200 for valid metadata", () => {
    const req = { body: VALID_BODY };
    const res = mockRes();

    validateOnlyHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const json = res.json.mock.calls[0][0];
    expect(json.success).toBe(true);
  });

  it("returns 422 for invalid metadata", () => {
    const req = { body: { title: "" } };
    const res = mockRes();

    validateOnlyHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    const json = res.json.mock.calls[0][0];
    expect(json.success).toBe(false);
  });

  it("response includes errors and warnings arrays", () => {
    const req = { body: VALID_BODY };
    const res = mockRes();

    validateOnlyHandler(req, res);
    const json = res.json.mock.calls[0][0];
    expect(Array.isArray(json.errors)).toBe(true);
    expect(Array.isArray(json.warnings)).toBe(true);
  });
});
