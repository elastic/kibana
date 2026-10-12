/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInlineScriptError } from './validate_inline_script';

describe('getInlineScriptError', () => {
  it('accepts a recorder-style browser script', () => {
    const script = `step("open example", async () => {
  await page.goto("https://example.com");
});`;

    expect(getInlineScriptError(script)).toBeUndefined();
  });

  it('accepts top-level await and return', () => {
    const script = `await Promise.resolve();
if (!true) { return; }`;

    expect(getInlineScriptError(script)).toBeUndefined();
  });

  it('rejects a script with a syntax error', () => {
    const script = 'step("x", async () => {{{ this is not js';

    expect(getInlineScriptError(script)).toContain('The script has a syntax error');
  });

  it('rejects an unbalanced closing brace', () => {
    expect(getInlineScriptError('step("x", () => {});}')).toContain('syntax error');
  });
});
