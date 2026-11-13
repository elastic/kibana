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
// no raw-text module of its own, so it is replaced rather than walked.
jest.mock('@kbn/evals', () => ({
  createPlaywrightEvalsConfig: (config: Record<string, unknown>) => config,
}));

// Raw-text extensions the Jest preset transforms that the Playwright loader cannot parse
// (`.pegg`/`.tex` come from the preset's trailing-`?` patterns; a bare trailing `.` matches the
// preset's `|\.$` alternative). `.peg`, `.te` and `.yamll` are not transformed, so they are not
// listed. Verified against the kbn-jest jest-preset.js `transform` list as of Nov 2026
// (packages/kbn-jest/src/jest-preset.js); if the preset's transform list changes, re-check here. See `kbn-jest/jest-preset.js` `transform`.
const RAW_TEXT_MODULE = /\.(ya?ml|txt|html|peggy?|text?)$|\.$/;

/** Every module path that loading `entry` pulls in, from a registry emptied beforehand. */
const loadedBy = (entry: string): string[] => {
  jest.resetModules();
  jest.requireActual(entry);
  return Object.keys(require.cache);
};

const rawTextIn = (paths: string[]): string[] => paths.filter((path) => RAW_TEXT_MODULE.test(path));

describe('Playwright config load path', () => {
  it('loads no raw-text module (.yaml, .yml, .txt, .html, .peggy, .pegg, .text, .tex) at config time', () => {
    const loaded = loadedBy('../playwright.config');

    expect(rawTextIn(loaded)).toEqual([]);
  });

  it('matches every raw-text extension the preset transforms, including a bare trailing dot', () => {
    const extensions = ['yaml', 'yml', 'txt', 'html', 'peggy', 'pegg', 'text', 'tex', ''];
    expect(extensions.map((ext) => RAW_TEXT_MODULE.test(`/x/module.${ext}`))).toEqual(
      extensions.map(() => true)
    );
    expect(RAW_TEXT_MODULE.test('/x/module.ts')).toBe(false);
  });

  it('does not match extensions the preset does not transform', () => {
    expect(RAW_TEXT_MODULE.test('x.peg')).toBe(false);
    expect(RAW_TEXT_MODULE.test('x.te')).toBe(false);
    expect(RAW_TEXT_MODULE.test('x.yamll')).toBe(false);
  });

  it('walks the whole chain the config loads', () => {
    const loaded = loadedBy('../playwright.config');

    expect(loaded.some((path) => path.endsWith('/datasets/worker_rows.ts'))).toBe(true);
    expect(loaded.some((path) => path.endsWith('/src/constants.ts'))).toBe(true);
  });

  describe('guard liveness', () => {
    it('reports a deep import of a managed workflow definition', () => {
      const found = rawTextIn(loadedBy('./config_load_path_fixtures/deep_managed_import'));

      expect(found.map((path) => path.split('/').pop())).toContain('alert_analysis_workflow.yaml');
    });

    it('reports a direct .yaml import', () => {
      const found = rawTextIn(loadedBy('./config_load_path_fixtures/sample.yaml'));

      expect(found.map((path) => path.split('/').pop())).toEqual(['sample.yaml']);
    });

    it.each(['sample.yml', 'sample.txt', 'sample.text', 'sample.html', 'sample.peggy'])(
      'reports a direct %s import',
      (fixture) => {
        const found = rawTextIn(loadedBy(`./config_load_path_fixtures/${fixture}`));

        expect(found.map((path) => path.split('/').pop())).toEqual([fixture]);
      }
    );

    it('reports the managed barrel', () => {
      expect(rawTextIn(loadedBy('@kbn/workflows/managed')).length).toBeGreaterThan(0);
    });
  });
});
