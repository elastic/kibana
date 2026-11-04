/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Playwright loader cannot parse `.yaml`, which Jest transforms. So a `.yaml` file reached at
 * config time fails the whole config in CI while every Jest suite stays green. The
 * `@kbn/workflows/managed` barrel and a deep import of a definition that imports its workflow both
 * do it. This test loads the config through Jest's module registry and fails on the cause, a loaded
 * `.yaml`, instead of on one import specifier. Plain `.ts` modules under `kbn-workflows/managed/`
 * are fine and are loaded today through `@kbn/alertzero-common`.
 */

// The real `@kbn/evals` is loaded by Playwright from outside this package; this assumes it loads
// no `.yaml` of its own, so it is replaced rather than walked.
jest.mock('@kbn/evals', () => ({
  createPlaywrightEvalsConfig: (config: Record<string, unknown>) => config,
}));

const YAML_MODULE = /\.ya?ml$/;

/** Every module path that loading `entry` pulls in, from a registry emptied beforehand. */
const loadedBy = (entry: string): string[] => {
  jest.resetModules();
  jest.requireActual(entry);
  return Object.keys(require.cache);
};

const yamlIn = (paths: string[]): string[] => paths.filter((path) => YAML_MODULE.test(path));

describe('Playwright config load path', () => {
  it('loads no .yaml module at config time', () => {
    const loaded = loadedBy('../playwright.config');

    expect(yamlIn(loaded)).toEqual([]);
  });

  it('walks the whole chain the config loads', () => {
    const loaded = loadedBy('../playwright.config');

    expect(loaded.some((path) => path.endsWith('/datasets/worker_rows.ts'))).toBe(true);
    expect(loaded.some((path) => path.endsWith('/src/constants.ts'))).toBe(true);
  });

  describe('guard liveness', () => {
    it('reports a deep import of a managed workflow definition', () => {
      const found = yamlIn(loadedBy('./config_load_path_fixtures/deep_managed_import'));

      expect(found.map((path) => path.split('/').pop())).toContain('alert_analysis_workflow.yaml');
    });

    it('reports a direct .yaml import', () => {
      const found = yamlIn(loadedBy('./config_load_path_fixtures/sample.yaml'));

      expect(found.map((path) => path.split('/').pop())).toEqual(['sample.yaml']);
    });

    it('reports the managed barrel', () => {
      expect(yamlIn(loadedBy('@kbn/workflows/managed')).length).toBeGreaterThan(0);
    });
  });
});
