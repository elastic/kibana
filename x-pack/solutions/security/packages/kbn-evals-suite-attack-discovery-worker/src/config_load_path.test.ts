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

// The extensions the Jest preset transforms without swc (`kbn-jest/jest-preset.js` `transform`):
// raw text (`.txt`, `.html`, `.yaml`, `.yml`), `.peggy` and `.text`. The preset's patterns end in
// `peggy?` and `text?`, so `.pegg` and `.tex` are transformed too, and the first is
// `(txt|html|yaml|yml)?`, so a path ending in a bare `.` matches as well (`|\.$`). The Playwright
// loader parses none.
const RAW_TEXT_MODULE = /\.(ya?ml|txt|html|peggy?|text?)$|\.$/;

/** Every module path that loading `entry` pulls in, from a registry emptied beforehand. */
const loadedBy = (entry: string): string[] => {
  jest.resetModules();
  jest.requireActual(entry);
  return Object.keys(require.cache);
};

/** Jest transformers other than the swc/babel ones that parse source: each handles a file type. */
const presetTransforms = (): Array<[string, string]> => {
  const entries = ['@kbn/jest/jest-preset', '@kbn/jest/jest_node/jest-preset'].flatMap((preset) =>
    Object.entries((jest.requireActual(preset) as { transform: Record<string, string> }).transform)
  );
  const unique = new Map(entries);
  return [...unique].filter(([, transformer]) => !/swc|babel/.test(transformer));
};

/**
 * Module paths a transform key matches. The keys are regexes, so the candidates are built from the
 * words in the pattern (each as written, and with its last letter dropped for a trailing `?`) plus
 * the empty extension, and kept when the key matches them.
 */
const pathsMatchedBy = (key: string): string[] => {
  const words = key.match(/[a-z]+/g) ?? [];
  const extensions = new Set(['', ...words, ...words.map((word) => word.slice(0, -1))]);
  const matcher = new RegExp(key);
  return [...extensions].map((ext) => `/x/module.${ext}`).filter((path) => matcher.test(path));
};

const rawTextIn = (paths: string[]): string[] => paths.filter((path) => RAW_TEXT_MODULE.test(path));

describe('Playwright config load path', () => {
  it('loads no raw-text module (.yaml, .yml, .txt, .html, .peggy, .pegg, .text, .tex) at config time', () => {
    const loaded = loadedBy('../playwright.config');

    expect(rawTextIn(loaded)).toEqual([]);
  });

  it('matches every extension the preset transforms, including a bare trailing dot', () => {
    const extensions = ['yaml', 'yml', 'txt', 'html', 'peggy', 'pegg', 'text', 'tex', ''];
    expect(extensions.map((ext) => RAW_TEXT_MODULE.test(`/x/module.${ext}`))).toEqual(
      extensions.map(() => true)
    );
    expect(RAW_TEXT_MODULE.test('/x/module.ts')).toBe(false);
  });

  describe('against the Jest preset transforms', () => {
    const transforms = presetTransforms();

    it('finds the transforms that handle raw text', () => {
      expect(transforms.length).toBeGreaterThanOrEqual(3);
    });

    it.each(transforms)('flags every path the %s transform handles', (key) => {
      const paths = pathsMatchedBy(key);
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.filter((path) => !RAW_TEXT_MODULE.test(path))).toEqual([]);
    });
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

    it.each(['x.pegg', 'x.tex'])('matches %s, which the preset also transforms', (path) => {
      expect(RAW_TEXT_MODULE.test(path)).toBe(true);
    });

    it.each(['x.peg', 'x.te', 'x.yamll'])('does not match %s', (path) => {
      expect(RAW_TEXT_MODULE.test(path)).toBe(false);
    });

    it('reports the managed barrel', () => {
      expect(rawTextIn(loadedBy('@kbn/workflows/managed')).length).toBeGreaterThan(0);
    });
  });
});
