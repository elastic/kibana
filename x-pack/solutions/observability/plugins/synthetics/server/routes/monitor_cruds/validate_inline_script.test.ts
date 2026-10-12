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

  it('accepts step callbacks that take no argument or a plain parameter', () => {
    const script = `step("no args", () => {});
step("plain param", async (page) => { await page.goto("https://example.com"); });`;

    expect(getInlineScriptError(script)).toBeUndefined();
  });

  it('rejects a script with a syntax error', () => {
    const script = 'step("x", async () => {{{ this is not js';

    expect(getInlineScriptError(script)).toContain('The script has a syntax error');
  });

  it('rejects a step callback that destructures its argument', () => {
    const script = `step("open example", async ({ page }) => { await page.goto("https://example.com"); });`;

    expect(getInlineScriptError(script)).toContain('Step "open example" destructures an argument');
  });

  it('rejects a destructured argument on a function expression', () => {
    const script = `step("array form", async function ([first]) { return first; });`;

    expect(getInlineScriptError(script)).toContain('Step "array form" destructures an argument');
  });

  it('rejects a destructured step nested inside another call', () => {
    const script = `journey("outer", () => {
  step("nested", async ({ page }) => {});
});`;

    expect(getInlineScriptError(script)).toContain('Step "nested" destructures an argument');
  });

  it('ignores destructuring in calls that are not step calls', () => {
    const script = `const run = async ({ page }) => page;
other("name", async ({ page }) => page);`;

    expect(getInlineScriptError(script)).toBeUndefined();
  });
});
