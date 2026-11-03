/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MANAGED_BARREL_ERROR = '@kbn/workflows/managed was loaded on the Playwright config load path';

/**
 * `@kbn/workflows/managed` requires `.yaml` files. Jest transforms them, so the rest of this suite
 * cannot notice the import, but the Playwright loader fails the whole config with a parse error.
 * The mock makes the barrel throw when it is required, which turns that CI-only failure into a
 * local one.
 */
jest.mock('@kbn/workflows/managed', () => {
  throw new Error(MANAGED_BARREL_ERROR);
});

/** The config's own `@kbn/evals` import is loaded by Playwright from outside this package. */
jest.mock('@kbn/evals', () => ({
  createPlaywrightEvalsConfig: (config: Record<string, unknown>) => config,
}));

const requireIsolated = (path: string): void => {
  jest.isolateModules(() => {
    jest.requireActual(path);
  });
};

describe('Playwright config load path', () => {
  it('has a live guard: requiring the managed barrel throws', () => {
    expect(() => jest.requireMock('@kbn/workflows/managed')).toThrow(MANAGED_BARREL_ERROR);
  });

  it.each(['../playwright.config', '../datasets/worker_rows', './constants'])(
    'loads %s without the managed workflows barrel',
    (path) => {
      expect(() => requireIsolated(path)).not.toThrow();
    }
  );
});
