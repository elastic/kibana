/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/evals', () => ({
  // Scout's first CI attempt resolves one retry; the suite config must override it.
  createPlaywrightEvalsConfig: jest.fn((options: object) => ({ ...options, retries: 1 })),
}));

describe('attack discovery worker playwright config', () => {
  it('disables Playwright retries so a gated miss fails the job', async () => {
    const { default: config } = await import('./playwright.config');

    expect(config.retries).toBe(0);
  });
});
