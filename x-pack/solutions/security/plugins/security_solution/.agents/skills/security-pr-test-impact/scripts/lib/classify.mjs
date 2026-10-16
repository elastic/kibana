/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * File classification (production / test / ignored) and coarse change-type heuristics.
 * Everything here is pure string matching so results are reproducible.
 */
import path from 'node:path';

/** Conventional Security Solution test roots (repo-relative, trailing slash). */
export const SECURITY_TEST_ROOTS = {
  cypress: ['x-pack/solutions/security/test/security_solution_cypress/'],
  scout: ['x-pack/solutions/security/plugins/security_solution/test/scout/'],
  ftr: [
    'x-pack/solutions/security/test/security_solution_api_integration/',
    'x-pack/solutions/security/test/api_integration/',
    'x-pack/solutions/security/test/api_integration_basic/',
  ],
};

export const CONVENTIONAL_TEST_ROOTS = Object.values(SECURITY_TEST_ROOTS).flat();

const IGNORED_EXT = new Set([
  '.md',
  '.mdx',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.lock',
  '.snap',
]);
const IGNORED_BASENAMES = new Set([
  'yarn.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'CODEOWNERS',
  'package.json',
  'kibana.jsonc',
  'moon.yml',
  'jest.config.js',
  'jest.integration.config.js',
  '.i18nrc.json',
  '.gitignore',
  '.npmrc',
]);
const IGNORED_BASENAME_RE =
  /^(tsconfig[\w.-]*\.json|\.eslintrc[\w.]*|\.prettierrc[\w.]*|README[\w.]*|LICENSE[\w.]*|CHANGELOG[\w.]*)$/;
const IGNORED_PREFIXES = ['docs/', '.github/', '.buildkite/', '.agents/', 'oas_docs/'];
// Any `test/` or `tests/` directory inside a package/plugin holds test support, not product code.
const TEST_DIR_RE = /(^|\/)tests?\//;
const EVALS_RE = /(^|\/)kbn-evals-suite-[^/]+\/|(^|\/)evals\//;
// Generated outputs: OpenAPI bundles and codegen clients/types are derived from *.schema.yaml.
const GENERATED_RE = /(^|\/)docs\/openapi\/|\.gen\.(ts|tsx)$|\.bundled\.schema\.yaml$/;
const TEST_SUPPORT_RE =
  /(^|\/)(test-api-clients|test_utils|test_helpers|test_data|__test__|__tests__|__jest__)(\/|\.(ts|tsx)$)/;

const JEST_RE = /\.test\.(ts|tsx|js|jsx|mjs)$/;
const CYPRESS_RE = /\.cy\.(ts|js)$/;
const SCOUT_ROOT_RE = /(^|\/)test\/scout\//;
const CYPRESS_DIR_RE = /(^|\/)cypress\//;
// FTR / API integration roots: x-pack/test, x-pack/platform/test, x-pack/solutions/<s>/test, src/platform/test
const FTR_ROOT_RE = /^(x-pack\/(solutions\/[^/]+\/|platform\/)?test\/|src\/platform\/test\/)/;
const SUPPORT_RE =
  /(^|\/)(__mocks__|__fixtures__|fixtures|mocks?|es_archives|services|page_objects|screens|objects|tasks|helpers|utils|support|config(s)?|ftr_provider_context[^/]*|playwright[^/]*\.config\.ts|global\.setup\.ts)(\/|\.|$)/;
const MOCK_FILE_RE =
  /\.(mock|mocks|stories|fixtures?)\.(ts|tsx|js)$|(^|\/)(mocks?|__mocks__)\.(ts|tsx)$|(^|\/)__mocks__\//;

/**
 * @typedef {'production' | 'test' | 'ignored'} FileKind
 * @typedef {'jest' | 'cypress' | 'scout' | 'ftr' | 'support'} TestFramework
 * @typedef {{ kind: FileKind, framework?: TestFramework, reason: string }} Classification
 */

/** @returns {Classification} */
export const classifyFile = (filePath) => {
  const ext = path.posix.extname(filePath);
  const base = path.posix.basename(filePath);

  if (IGNORED_BASENAMES.has(base) || IGNORED_BASENAME_RE.test(base) || IGNORED_EXT.has(ext)) {
    return { kind: 'ignored', reason: `ignored extension/basename (${base})` };
  }
  if (IGNORED_PREFIXES.some((p) => filePath.startsWith(p))) {
    return { kind: 'ignored', reason: 'docs/CI/tooling path' };
  }
  if (GENERATED_RE.test(filePath)) {
    return { kind: 'ignored', reason: 'generated OpenAPI/codegen artifact' };
  }

  if (JEST_RE.test(filePath)) return { kind: 'test', framework: 'jest', reason: '*.test.*' };
  if (TEST_SUPPORT_RE.test(filePath)) {
    return { kind: 'test', framework: 'support', reason: 'test support file' };
  }
  if (CYPRESS_RE.test(filePath)) return { kind: 'test', framework: 'cypress', reason: '*.cy.*' };

  if (SCOUT_ROOT_RE.test(filePath)) {
    const isSpec = /\.spec\.ts$/.test(filePath) || /\/tests\/.*\.ts$/.test(filePath);
    if (isSpec && !SUPPORT_RE.test(filePath)) {
      return { kind: 'test', framework: 'scout', reason: 'under test/scout/' };
    }
    return { kind: 'test', framework: 'support', reason: 'Scout support file' };
  }

  if (filePath.startsWith(SECURITY_TEST_ROOTS.cypress[0]) || CYPRESS_DIR_RE.test(filePath)) {
    return { kind: 'test', framework: 'support', reason: 'Cypress support file' };
  }

  if (FTR_ROOT_RE.test(filePath)) {
    const isLoaderOrConfig = /^index\.(ts|js)$/.test(base) || /config.*\.ts$/.test(base);
    if (/\.(ts|js)$/.test(filePath) && !SUPPORT_RE.test(filePath) && !isLoaderOrConfig) {
      return { kind: 'test', framework: 'ftr', reason: 'under an FTR/API integration root' };
    }
    return { kind: 'test', framework: 'support', reason: 'FTR support/config file' };
  }

  if (MOCK_FILE_RE.test(filePath)) {
    return { kind: 'test', framework: 'support', reason: 'mock/fixture/story file' };
  }
  if (EVALS_RE.test(filePath)) {
    return { kind: 'test', framework: 'evals', reason: 'evals suite' };
  }
  if (TEST_DIR_RE.test(filePath)) {
    return { kind: 'test', framework: 'support', reason: 'under a test/ directory' };
  }

  return { kind: 'production', reason: 'source file' };
};

/**
 * Lines added or removed by a unified diff hunk (without the leading +/-).
 */
export const changedLines = (patch) => {
  if (!patch) return [];
  return patch
    .split('\n')
    .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
    .map((l) => l.slice(1));
};

// Line patterns apply to code files only and never to import/export lines (an import path such
// as `machine_learning/authz` is not a privilege change). Path patterns apply to any file.
const RISK_RULES = [
  {
    cls: 'privilege',
    re: /requiredPrivileges|[Pp]rivileges?\b|\bauthz\b|\bauthc\b|\bcapabilities\b|hasPrivilege|registerKibanaFeature|subFeature|kibanaFeature|\bsecurity:\s*\{|SECURITY_FEATURE_ID|\bRBAC\b/,
  },
  {
    cls: 'saved-object migration',
    re: /modelVersions?\b|savedObjects\.registerType|SavedObjectsType\b|\bmigrations\s*:|savedObjectMigration|SavedObjectsModelVersion/,
  },
  {
    cls: 'route',
    re: /router\.(get|post|put|delete|patch|versioned)\b|\.versioned\.(get|post|put|delete|patch)\b|\.addVersion\(|path:\s*['"`]\/(api|internal)\//,
    pathRe: /(^|\/)routes?\/|(^|\/)\w*route\.(ts|tsx)$/,
    pathReason: 'under a routes/ directory or named *route.ts',
  },
  {
    cls: 'feature flag',
    re: /ExperimentalFeatures?\b|experimentalFeatures|useIsExperimentalFeatureEnabled|featureFlags?\.|isFeatureEnabled|FEATURE_FLAG|getFeatureFlag/,
    pathRe: /experimental_features\.ts$|feature_flags?\./,
    pathReason: 'experimental_features / feature_flags file',
  },
];

const IMPORT_LINE_RE =
  /^\s*(import\b|export\s+(type\s+)?(\*|\{)[^;]*\bfrom\b|export\s+\*\s+from\b)/;

// i18n ids look like `xpack.securitySolution.some.key`; a bare `id:` is not copy.
const COPY_LINE_RE =
  /defaultMessage\s*[:=]|i18n\.translate\(|<\/?FormattedMessage|^\s*(defaultMessage|description|values)\s*:|^\s*id\s*[:=]\s*['"`][a-zA-Z]+\.[\w.]+['"`]|^\s*['"`][^'"`]*['"`],?\s*$/;
const NOISE_LINE_RE = /^\s*[{}()[\],;]*\s*$/;

const firstMatchingLine = (lines, re) => lines.find((l) => re.test(l));

const shorten = (s, n = 90) => {
  const trimmed = s.trim();
  return trimmed.length > n ? `${trimmed.slice(0, n - 1)}…` : trimmed;
};

/**
 * Coarse change type with the reason that produced it.
 * Precedence: copy-only check first, then privilege > saved-object migration > route >
 * feature flag, then the UI/API default by location.
 *
 * @returns {{ primary: string, tags: string[], reason: string }}
 */
export const changeType = (filePath, patch) => {
  const lines = changedLines(patch);
  const meaningful = lines.filter((l) => !NOISE_LINE_RE.test(l));
  const base = path.posix.basename(filePath);
  const tags = [];

  const isTranslationsFile = /^translations\.(ts|tsx)$/.test(base);
  const isCode = /\.(ts|tsx|js|jsx)$/.test(filePath);
  const copyOnly =
    isTranslationsFile ||
    (isCode && meaningful.length > 0 && meaningful.every((l) => COPY_LINE_RE.test(l)));
  if (copyOnly) {
    return {
      primary: 'copy',
      tags: ['copy'],
      reason: isTranslationsFile ? 'translations file' : 'all changed lines are i18n/copy',
    };
  }

  let primary = null;
  let reason = '';
  const codeLines = isCode ? meaningful.filter((l) => !IMPORT_LINE_RE.test(l)) : [];
  for (const rule of RISK_RULES) {
    const pathHit = rule.pathRe ? rule.pathRe.test(filePath) : false;
    const lineHit = firstMatchingLine(codeLines, rule.re);
    if (pathHit || lineHit) {
      tags.push(rule.cls);
      if (!primary) {
        primary = rule.cls;
        reason = lineHit ? `diff: \`${shorten(lineHit)}\`` : rule.pathReason;
      }
    }
  }

  const isUi = /\.tsx$/.test(filePath) || /(^|\/)public\//.test(filePath);
  const locationClass = isUi ? 'UI' : 'API';
  const locationReason = isUi ? '.tsx or public/ path' : 'server/common/package code';
  tags.push(locationClass);

  if (!primary) {
    primary = locationClass;
    reason = locationReason;
  }

  return { primary, tags: [...new Set(tags)], reason };
};
