/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the security-pr-test-impact matcher. Run with:
 *   node --test x-pack/solutions/security/plugins/security_solution/.agents/skills/security-pr-test-impact/scripts/matcher.test.mjs
 *
 * Builds a throwaway git repo under $TMPDIR that mimics the Kibana layout.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  analyzePr,
  loadAliases,
  loadKbnPaths,
  VERDICTS,
  LEGEND,
  featureTokens,
} from './lib/matcher.mjs';
import { parseCodeowners, resolveOwners, teamPrefixes, patternToRegex } from './lib/codeowners.mjs';
import { classifyFile, changeType } from './lib/classify.mjs';
import { COMMENT_MARKER, commonRoot, renderPrReport } from './lib/report.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'pr_test_impact.mjs');

const PLUGIN = 'x-pack/solutions/security/plugins/security_solution';
const CYPRESS = 'x-pack/solutions/security/test/security_solution_cypress/cypress/e2e';
const FTR = 'x-pack/solutions/security/test/security_solution_api_integration/test_suites';
const SCOUT = `${PLUGIN}/test/scout/ui/parallel_tests`;
const PKG = 'x-pack/solutions/security/packages/kbn-foo';

const TEAM = '@elastic/security-detection-rule-management';
const OTHER_TEAM = '@elastic/security-threat-hunting';

const FIXTURE_FILES = {
  '.github/CODEOWNERS': [
    `${PLUGIN}/public/detection_engine ${TEAM}`,
    `${PLUGIN}/server/lib/orphan_area ${TEAM}`,
    `${PLUGIN}/public/explore ${OTHER_TEAM}`,
    `${CYPRESS}/detection_response/rule_management ${TEAM}`,
    `${CYPRESS}/explore ${OTHER_TEAM}`,
    `${FTR}/detections_response/rules_management ${TEAM}`,
    `${PLUGIN}/test/scout @elastic/security-engineering-productivity`,
    `${PKG} ${TEAM}`,
    'docs/* @elastic/docs',
    '# a comment line',
  ].join('\n'),
  'tsconfig.base.json': JSON.stringify({
    compilerOptions: {
      paths: {
        '@kbn/foo': [PKG],
        '@kbn/foo/*': [`${PKG}/*`],
      },
    },
  }),

  // production
  [`${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`]:
    'export const RulesTable = () => null;',
  [`${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/helpers.ts`]:
    'export const sortRules = (r) => r;',
  [`${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/translations.ts`]:
    "export const TITLE = i18n.translate('xpack.securitySolution.rulesTable.title', { defaultMessage: 'Rules' });",
  [`${PLUGIN}/server/lib/orphan_area/orphan_service.ts`]: 'export const orphan = () => 1;',
  [`${PLUGIN}/public/explore/hosts/pages/hosts.tsx`]: 'export const Hosts = () => null;',
  [`${PKG}/index.ts`]: "export { bar } from './src/bar';",
  [`${PKG}/src/bar.ts`]: 'export const bar = 1;',

  // tests — jest
  [`${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.test.tsx`]:
    "import { RulesTable } from './rules_table';\ntest('x', () => {});",
  [`${PLUGIN}/public/detection_engine/rule_management_ui/logic/use_rules.test.ts`]:
    "import { sortRules } from '../components/rules_table/helpers';\nimport { bar } from '@kbn/foo/src/bar';\ntest('x', () => {});",
  [`${PLUGIN}/public/detection_engine/some/pkg_consumer.test.ts`]:
    "const foo = require('@kbn/foo');\ntest('x', () => {});",
  // owned by the same team as orphan_service.ts (sibling directory), but does not import it
  [`${PLUGIN}/server/lib/orphan_area/other/unrelated.test.ts`]:
    "import { somethingElse } from './something_else';\ntest('x', () => {});",
  [`${PLUGIN}/server/lib/orphan_area/other/something_else.ts`]: 'export const somethingElse = 1;',

  // tests — cypress / ftr / scout
  [`${CYPRESS}/detection_response/rule_management/rules_table/sorting.cy.ts`]:
    "describe('sorting', () => {});",
  [`${CYPRESS}/detection_response/rule_management/rules_table/filtering.cy.ts`]:
    "describe('filtering', () => {});",
  [`${CYPRESS}/detection_response/rule_management/authorization/auth.cy.ts`]:
    "describe('auth', () => {});",
  [`${CYPRESS}/explore/hosts/hosts_page.cy.ts`]: "describe('hosts', () => {});",
  [`${FTR}/detections_response/rules_management/rules_table/sorting.ts`]:
    "describe('ftr sorting', () => {});",
  [`${FTR}/detections_response/rules_management/utils/helpers.ts`]: 'export const helper = 1;',
  [`${SCOUT}/investigations/timeline_creation.spec.ts`]: "spaceTest('timeline', () => {});",

  // ignored
  'docs/guide.md': '# docs',
};

let repoRoot;
let ctx;

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, stdio: 'pipe' });

before(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-test-impact-'));
  for (const [rel, content] of Object.entries(FIXTURE_FILES)) {
    const abs = path.join(repoRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  git('init', '-q');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'fixture');
  ctx = {
    repoRoot,
    aliases: loadAliases(),
    kbnPaths: loadKbnPaths(repoRoot),
    codeowners: parseCodeowners(FIXTURE_FILES['.github/CODEOWNERS']),
  };
});

after(() => {
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

const analyze = (files) => analyzePr({ ...ctx, files });
const modified = (filename, patch = '+// change') => ({ filename, status: 'modified', patch });
const rowFor = (analysis, file) => analysis.rows.find((r) => r.file === file);
const linkTypes = (row, testPath) => row.links.find((l) => l.path === testPath)?.types ?? [];

test('import link: a Jest test in another directory imports the changed file', () => {
  const file = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/helpers.ts`;
  const analysis = analyze([modified(file)]);
  const row = rowFor(analysis, file);
  const testPath = `${PLUGIN}/public/detection_engine/rule_management_ui/logic/use_rules.test.ts`;
  assert.deepEqual(linkTypes(row, testPath), ['import']);
  assert.equal(row.verdict, VERDICTS.NOT_UPDATED);
  assert.ok(analysis.citedTestPaths.includes(testPath));
});

test('import link: @kbn/* specifiers resolve through tsconfig.base.json paths', () => {
  const bar = `${PKG}/src/bar.ts`;
  const index = `${PKG}/index.ts`;
  const analysis = analyze([modified(bar), modified(index)]);
  assert.deepEqual(
    linkTypes(
      rowFor(analysis, bar),
      `${PLUGIN}/public/detection_engine/rule_management_ui/logic/use_rules.test.ts`
    ),
    ['import']
  );
  assert.deepEqual(
    linkTypes(
      rowFor(analysis, index),
      `${PLUGIN}/public/detection_engine/some/pkg_consumer.test.ts`
    ),
    ['import']
  );
});

test('colocated link: <name>.test.tsx next to <name>.tsx', () => {
  const file = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`;
  const analysis = analyze([modified(file)]);
  const row = rowFor(analysis, file);
  const colocated = `${file.replace(/\.tsx$/, '')}.test.tsx`;
  const types = linkTypes(row, colocated);
  assert.ok(types.includes('colocated'), `expected colocated, got ${types}`);
  assert.ok(types.includes('import'), 'colocated test also imports the file');
  assert.deepEqual(row.links.find((l) => l.path === colocated).via, ['same name']);

  // a Jest test in the same directory with a different name is also colocated (weaker: same directory)
  const helpers = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/helpers.ts`;
  const helpersRow = rowFor(analyze([modified(helpers)]), helpers);
  assert.deepEqual(linkTypes(helpersRow, colocated), ['colocated']);
  assert.deepEqual(helpersRow.links.find((l) => l.path === colocated).via, ['same directory']);
});

test('feature-path link: Cypress/FTR specs under a directory mirroring the feature path, type recorded', () => {
  const file = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`;
  const analysis = analyze([modified(file)]);
  const row = rowFor(analysis, file);

  const cypressSpec = `${CYPRESS}/detection_response/rule_management/rules_table/sorting.cy.ts`;
  const ftrSpec = `${FTR}/detections_response/rules_management/rules_table/sorting.ts`;
  assert.deepEqual(linkTypes(row, cypressSpec), ['feature-path']);
  assert.deepEqual(linkTypes(row, ftrSpec), ['feature-path']);

  // less specific sibling dir (authorization) is not linked, and unrelated features are not linked
  assert.deepEqual(
    linkTypes(row, `${CYPRESS}/detection_response/rule_management/authorization/auth.cy.ts`),
    []
  );
  assert.deepEqual(linkTypes(row, `${CYPRESS}/explore/hosts/hosts_page.cy.ts`), []);
  assert.deepEqual(linkTypes(row, `${SCOUT}/investigations/timeline_creation.spec.ts`), []);

  // the FTR support helper under utils/ is never a candidate
  assert.ok(
    !analysis.citedTestPaths.includes(
      `${FTR}/detections_response/rules_management/utils/helpers.ts`
    )
  );

  const summary = row.featureSummary.find((g) => g.anchorDir.startsWith(CYPRESS));
  assert.ok(summary.tokens.includes('rules_table'));
  assert.equal(summary.total, 2);
});

test('same CODEOWNERS team is not a link', () => {
  const file = `${PLUGIN}/server/lib/orphan_area/orphan_service.ts`;
  const analysis = analyze([modified(file)]);
  const row = rowFor(analysis, file);

  assert.deepEqual(row.owners, [TEAM]);
  // the team owns Cypress + FTR + Jest tests, and the boundary includes them…
  assert.ok(
    analysis.searchBoundary.some(
      (b) => b.prefix === `${CYPRESS}/detection_response/rule_management`
    )
  );
  assert.ok(analysis.counts.candidateTestFilesScanned > 0);
  const siblingTest = `${PLUGIN}/server/lib/orphan_area/other/unrelated.test.ts`;
  const owned = analysis.searchBoundary.find(
    (b) => b.prefix === `${PLUGIN}/server/lib/orphan_area`
  );
  assert.equal(owned.candidateTests, 1, 'the same-team sibling test was scanned');
  // …but without an import, colocated, or feature-path match there is no link.
  assert.deepEqual(linkTypes(row, siblingTest), []);
  assert.deepEqual(row.links, []);
  assert.equal(row.verdict, VERDICTS.NONE);
});

test('verdict UPDATED when this PR modifies a linked test; NOT UPDATED otherwise', () => {
  const file = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`;
  const colocated = `${file.replace(/\.tsx$/, '')}.test.tsx`;

  const notUpdated = analyze([modified(file)]);
  assert.equal(rowFor(notUpdated, file).verdict, VERDICTS.NOT_UPDATED);
  assert.deepEqual(rowFor(notUpdated, file).linkedTestsUpdatedInPr, []);

  const updated = analyze([modified(file), modified(colocated, "+it('renders', () => {});")]);
  const row = rowFor(updated, file);
  assert.equal(row.verdict, VERDICTS.UPDATED);
  assert.deepEqual(row.linkedTestsUpdatedInPr, [colocated]);
  assert.equal(updated.counts.testFiles, 1);
});

test('a brand-new test added by the PR links through its added import lines', () => {
  const file = `${PLUGIN}/server/lib/orphan_area/orphan_service.ts`;
  const newTest = `${PLUGIN}/server/lib/orphan_area/new_orphan.test.ts`;
  const analysis = analyze([
    modified(file),
    {
      filename: newTest,
      status: 'added',
      patch: "+import { orphan } from './orphan_service';\n+test('x', () => {});",
    },
  ]);
  const row = rowFor(analysis, file);
  assert.deepEqual(linkTypes(row, newTest), ['colocated', 'import']);
  assert.equal(row.verdict, VERDICTS.UPDATED);
});

test('a linked test deleted by the PR no longer counts as a link', () => {
  const file = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`;
  const colocated = `${file.replace(/\.tsx$/, '')}.test.tsx`;
  const analysis = analyze([
    modified(file),
    { filename: colocated, status: 'removed', patch: '-x' },
  ]);
  assert.deepEqual(linkTypes(rowFor(analysis, file), colocated), []);
});

test('test-only PR: no production rows, test files listed, legend still present', () => {
  const spec = `${CYPRESS}/detection_response/rule_management/rules_table/sorting.cy.ts`;
  const analysis = analyze([modified(spec), modified('docs/guide.md')]);
  assert.equal(analysis.rows.length, 0);
  assert.equal(analysis.counts.productionFiles, 0);
  assert.equal(analysis.counts.testFiles, 1);
  assert.equal(analysis.counts.ignoredFiles, 1);
  const md = renderPrReport({ pr: { number: 1, title: 't', url: 'u', state: 'OPEN' }, analysis });
  assert.ok(md.includes(LEGEND));
  assert.ok(md.includes('No production files in this diff'));
  assert.ok(!md.includes('## Checks'));
});

test('report: legend present when every file is candidate coverage; Checks only for uncovered rows', () => {
  const covered = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`;
  const mdCovered = renderPrReport({
    pr: { number: 1, title: 't', url: 'u', state: 'OPEN' },
    analysis: analyze([modified(covered)]),
  });
  assert.ok(mdCovered.includes('## Legend'));
  assert.ok(mdCovered.includes(LEGEND));
  assert.ok(!mdCovered.includes('## Checks'));
  assert.ok(mdCovered.indexOf('## Scope') < mdCovered.indexOf('## Legend'));
  assert.ok(mdCovered.indexOf('## Legend') < mdCovered.indexOf('## Summary'));
  assert.ok(mdCovered.indexOf('## Summary') < mdCovered.indexOf('## Production files'));

  const uncovered = `${PLUGIN}/server/lib/orphan_area/orphan_service.ts`;
  const mdUncovered = renderPrReport({
    pr: { number: 1, title: 't', url: 'u', state: 'OPEN' },
    analysis: analyze([modified(uncovered)]),
  });
  assert.ok(mdUncovered.includes('## Checks'));
  assert.ok(mdUncovered.includes(`| ${VERDICTS.NONE} | 1 |`));
});

test('report: paths are shortened for display only; JSON keeps full paths', () => {
  const file = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`;
  const helpers = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/helpers.ts`;
  const analysis = analyze([modified(file), modified(helpers)]);
  const root = commonRoot(analysis.rows);
  assert.equal(root, 'x-pack/solutions/security/');

  const md = renderPrReport({ pr: { number: 1, title: 't', url: 'u', state: 'OPEN' }, analysis });
  assert.ok(md.includes('- Paths below are relative to `x-pack/solutions/security/`'));
  // production file and cross-directory import link: relative to the common root
  assert.ok(
    md.includes(
      '| `plugins/security_solution/public/detection_engine/rule_management_ui/components/rules_table/helpers.ts` |'
    )
  );
  assert.ok(
    md.includes(
      'import: `plugins/security_solution/public/detection_engine/rule_management_ui/logic/use_rules.test.ts`'
    )
  );
  // colocated test: file name only
  assert.ok(md.includes('colocated+import (same name): `rules_table.test.tsx`'));
  // feature-path specs: relative to the (root-relative) anchor dir
  assert.ok(
    md.includes(
      '→ `test/security_solution_cypress/cypress/e2e/detection_response/rule_management/rules_table`'
    )
  );
  assert.ok(md.includes('&nbsp;&nbsp;`sorting.cy.ts`'));
  assert.ok(!md.includes(`\`${file}\``));
  // the data model is untouched
  assert.ok(
    analysis.citedTestPaths.includes(
      `${CYPRESS}/detection_response/rule_management/rules_table/sorting.cy.ts`
    )
  );
  assert.ok(rowFor(analysis, file).links.every((l) => l.path.startsWith('x-pack/')));

  // no stripping when the rows share too little
  assert.equal(commonRoot([{ file: 'src/a/b.ts', links: [{ path: 'x-pack/c/d.test.ts' }] }]), '');
  assert.equal(commonRoot([]), '');
});

test('report: long lists are collapsible; the first direct links stay visible', () => {
  const file = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`;
  const analysis = analyze([modified(file)]);
  const md = renderPrReport({ pr: { number: 1, title: 't', url: 'u', state: 'OPEN' }, analysis });

  // Scope: the boundary prefix list is collapsed, the one-line summary stays visible
  assert.ok(md.includes('- Search boundary: CODEOWNERS prefixes'));
  assert.match(
    md,
    /<details>\n<summary>Search boundary prefixes \(\d+ with candidate tests\)<\/summary>\n\n- `/
  );
  // feature-path groups are collapsed, with counts in the summary
  assert.match(
    md,
    /<details><summary>feature-path \(`rule_management\+rules_table` → `test\/security_solution_cypress\/[^`]+`, 2 spec\(s\)\)<\/summary>&nbsp;&nbsp;`filtering\.cy\.ts`<br>&nbsp;&nbsp;`sorting\.cy\.ts`<\/details>/
  );

  // direct links beyond the first four are collapsed, PR-touched ones sorted first
  const mk = (name, inPr = false) => ({
    path: `${PLUGIN}/server/lib/x/${name}.test.ts`,
    types: ['import'],
    via: [],
    framework: 'jest',
    inPr,
    prStatus: inPr ? 'modified' : null,
  });
  const row = {
    file: `${PLUGIN}/server/lib/x/svc.ts`,
    status: 'modified',
    owners: [],
    changeType: { primary: 'API', tags: ['API'], reason: 'r' },
    verdict: VERDICTS.UPDATED,
    featureTokens: [],
    featureSummary: [],
    links: [mk('a'), mk('b'), mk('c'), mk('d'), mk('e'), mk('f', true)],
    linkedTestsUpdatedInPr: [`${PLUGIN}/server/lib/x/f.test.ts`],
  };
  const synthetic = {
    ...analysis,
    rows: [row],
    summary: { [VERDICTS.UPDATED]: 1 },
    counts: { ...analysis.counts, productionFiles: 1 },
  };
  const md2 = renderPrReport({
    pr: { number: 2, title: 't', url: 'u', state: 'OPEN' },
    analysis: synthetic,
  });
  const cell = md2.split('\n').find((l) => l.startsWith('| `svc.ts`'));
  assert.ok(cell, 'row rendered');
  assert.ok(cell.includes('import: `f.test.ts` _(in this PR: modified)_<br>import: `a.test.ts`'));
  assert.ok(
    cell.includes(
      '<details><summary>+2 more import/colocated tests</summary>import: `d.test.ts`<br>import: `e.test.ts`</details>'
    )
  );
});

test('report --compact: attention rows visible, UPDATED rows collapsed, no boundary list, marker present', () => {
  const notUpdated = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`;
  const updated = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/helpers.ts`;
  const updatedTest = `${PLUGIN}/public/detection_engine/rule_management_ui/logic/use_rules.test.ts`;
  const uncovered = `${PLUGIN}/server/lib/orphan_area/orphan_service.ts`;
  const analysis = analyze([
    modified(notUpdated),
    modified(updated),
    modified(updatedTest),
    modified(uncovered),
  ]);
  const pr = { number: 1, title: 't', url: 'u', state: 'OPEN' };
  const full = renderPrReport({ pr, analysis });
  const compact = renderPrReport({ pr, analysis, compact: true });

  assert.ok(compact.startsWith(`${COMMENT_MARKER}\n`));
  assert.ok(!full.includes(COMMENT_MARKER));
  assert.ok(!compact.includes('Search boundary prefixes ('));
  assert.ok(compact.includes(LEGEND));
  // sections still in order
  assert.ok(compact.indexOf('## Scope') < compact.indexOf('## Legend'));
  assert.ok(compact.indexOf('## Legend') < compact.indexOf('## Summary'));
  assert.ok(compact.indexOf('## Summary') < compact.indexOf('## Production files'));
  // attention rows are in the visible table, the UPDATED row only inside the collapsed block
  const detailsStart = compact.indexOf(`<summary>1 file(s) — ${VERDICTS.UPDATED}</summary>`);
  assert.ok(detailsStart > 0);
  const visiblePart = compact.slice(compact.indexOf('## Production files'), detailsStart);
  assert.ok(visiblePart.includes('rules_table.tsx'));
  assert.ok(visiblePart.includes('orphan_service.ts'));
  assert.ok(
    !visiblePart.includes(
      '| `plugins/security_solution/public/detection_engine/rule_management_ui/components/rules_table/helpers.ts`'
    )
  );
  assert.ok(compact.slice(detailsStart).includes('helpers.ts'));
  // Checks: pointer instead of the agent placeholder
  assert.ok(compact.includes('## Checks'));
  assert.ok(!compact.includes('<!-- agent:'));
  assert.ok(compact.includes('run it locally'));
  assert.ok(compact.length < full.length);
});

test('change type: copy-only vs privilege are distinct and carry a reason', () => {
  const copy = changeType(
    `${PLUGIN}/public/detection_engine/foo.tsx`,
    "@@\n-  defaultMessage: 'Old title',\n+  defaultMessage: 'New title',"
  );
  assert.equal(copy.primary, 'copy');

  const translations = changeType(
    `${PLUGIN}/public/detection_engine/translations.ts`,
    '+export const X = 1;'
  );
  assert.equal(translations.primary, 'copy');

  const priv = changeType(
    `${PLUGIN}/server/lib/detection_engine/routes/rules/create.ts`,
    "@@\n+  security: { authz: { requiredPrivileges: ['securitySolution'] } },\n+  router.versioned.post({ path: '/api/x' })"
  );
  assert.equal(priv.primary, 'privilege');
  assert.ok(priv.tags.includes('route'));
  assert.match(priv.reason, /requiredPrivileges/);

  const route = changeType(
    `${PLUGIN}/server/routes/foo.ts`,
    '+router.get({ path: "/internal/x" }, handler)'
  );
  assert.equal(route.primary, 'route');

  // path-only match gets a readable reason, not the regex source
  const routeByPath = changeType(`${PLUGIN}/server/routes/index.ts`, '+export { x };');
  assert.equal(routeByPath.primary, 'route');
  assert.equal(routeByPath.reason, 'under a routes/ directory or named *route.ts');

  // import lines and non-code files never trigger keyword rules
  const importOnly = changeType(
    `${PLUGIN}/server/lib/foo/service.ts`,
    "+import type { MlAuthz } from '../machine_learning/authz';\n+export type { Capabilities } from './types';\n+const x = 1;"
  );
  assert.equal(importOnly.primary, 'API');
  assert.ok(!importOnly.tags.includes('privilege'));
  const yaml = changeType(
    `${PKG}/api/foo.schema.yaml`,
    '+  description: A user without the privilege gets a 403.'
  );
  assert.equal(yaml.primary, 'API');
  assert.deepEqual(yaml.tags, ['API']);

  const flag = changeType(`${PLUGIN}/common/experimental_features.ts`, '+  newThing: false,');
  assert.equal(flag.primary, 'feature flag');

  const so = changeType(`${PLUGIN}/server/saved_objects/foo.ts`, "+  modelVersions: { '2': {} },");
  assert.equal(so.primary, 'saved-object migration');

  const ui = changeType(
    `${PLUGIN}/public/explore/hosts/hosts.tsx`,
    '+<EuiButton onClick={go}>Go</EuiButton>'
  );
  assert.equal(ui.primary, 'UI');

  const api = changeType(`${PLUGIN}/server/lib/foo/service.ts`, '+const x = compute();');
  assert.equal(api.primary, 'API');
});

test('classifyFile: production vs test vs ignored', () => {
  assert.equal(classifyFile(`${PLUGIN}/public/a/b.tsx`).kind, 'production');
  assert.equal(classifyFile(`${PLUGIN}/public/a/b.test.tsx`).framework, 'jest');
  assert.equal(classifyFile(`${CYPRESS}/x/y.cy.ts`).framework, 'cypress');
  assert.equal(classifyFile(`${SCOUT}/x/y.spec.ts`).framework, 'scout');
  assert.equal(classifyFile(`${FTR}/x/y.ts`).framework, 'ftr');
  assert.equal(classifyFile(`${FTR}/x/utils/y.ts`).framework, 'support');
  assert.equal(
    classifyFile('x-pack/solutions/security/test/security_solution_cypress/cypress/tasks/login.ts')
      .framework,
    'support'
  );
  assert.equal(
    classifyFile(`${PLUGIN}/public/management/cypress/tasks/foo.ts`).framework,
    'support'
  );
  assert.equal(classifyFile(`${PLUGIN}/server/__mocks__/foo.ts`).framework, 'support');
  assert.equal(classifyFile('docs/foo.md').kind, 'ignored');
  assert.equal(classifyFile(`${PLUGIN}/public/img.png`).kind, 'ignored');
  assert.equal(classifyFile('yarn.lock').kind, 'ignored');
  // generated OpenAPI artifacts are not production files; hand-written schemas are
  assert.equal(classifyFile('oas_docs/output/kibana.yaml').kind, 'ignored');
  assert.equal(classifyFile(`${PLUGIN}/docs/openapi/ess/x.bundled.schema.yaml`).kind, 'ignored');
  assert.equal(classifyFile(`${PLUGIN}/common/api/foo/foo_route.gen.ts`).kind, 'ignored');
  assert.equal(classifyFile(`${PLUGIN}/common/api/foo/foo_route.schema.yaml`).kind, 'production');
  // test support packages/files
  assert.equal(
    classifyFile('x-pack/solutions/security/packages/test-api-clients/scout/detections.gen.ts')
      .kind,
    'ignored'
  );
  assert.equal(
    classifyFile('x-pack/solutions/security/packages/test-api-clients/scout/client.ts').framework,
    'support'
  );
  assert.equal(classifyFile(`${PLUGIN}/public/a/test_utils.ts`).framework, 'support');
  assert.equal(classifyFile(`${PLUGIN}/common/test/ess_roles.json`).framework, 'support');
  assert.equal(
    classifyFile('x-pack/solutions/security/packages/kbn-evals-suite-foo/evals/foo.spec.ts')
      .framework,
    'evals'
  );
  // tooling / config files are not production
  for (const f of [
    `${PLUGIN}/tsconfig.json`,
    'x-pack/platform/plugins/shared/foo/moon.yml',
    'pnpm-lock.yaml',
    '.i18nrc.json',
    `${PLUGIN}/package.json`,
    `${PLUGIN}/kibana.jsonc`,
    `${PLUGIN}/public/jest.config.js`,
  ]) {
    assert.equal(classifyFile(f).kind, 'ignored', f);
  }
  // copy heuristic only applies to code files
  assert.equal(changeType(`${PLUGIN}/tsconfig.json`, '+    "@kbn/foo",').primary, 'API');
});

test('featureTokens: most specific first, generic segments dropped, aliases applied', () => {
  const tokens = featureTokens(
    `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/rules_table.tsx`,
    ctx.aliases
  );
  assert.deepEqual(tokens, ['rules_table', 'rule_management', 'detection_engine']);

  // plugin / package names become the outermost token; Kibana prefixes/suffixes are stripped
  assert.deepEqual(
    featureTokens(
      'x-pack/solutions/security/plugins/lists/server/routes/bulk_route.ts',
      ctx.aliases
    ),
    ['bulk_route', 'exceptions']
  );
  assert.deepEqual(
    featureTokens(
      'x-pack/solutions/security/packages/kbn-securitysolution-exceptions-common/api/foo/foo.schema.yaml',
      ctx.aliases
    ),
    ['kbn_securitysolution_exceptions_common', 'securitysolution_exceptions_common', 'exceptions']
  );
});

test('CODEOWNERS: last match wins, docs/* only matches direct children, team prefixes dedupe', () => {
  const rules = parseCodeowners(
    [
      'x-pack/a @elastic/one',
      'x-pack/a/b @elastic/two',
      '/docs/* @elastic/docs',
      'x-pack/a/b/c @elastic/one',
    ].join('\n')
  );
  assert.deepEqual(resolveOwners(rules, 'x-pack/a/file.ts').owners, ['@elastic/one']);
  assert.deepEqual(resolveOwners(rules, 'x-pack/a/b/file.ts').owners, ['@elastic/two']);
  assert.deepEqual(resolveOwners(rules, 'x-pack/a/b/c/file.ts').owners, ['@elastic/one']);
  assert.deepEqual(resolveOwners(rules, 'docs/readme.md').owners, ['@elastic/docs']);
  assert.deepEqual(resolveOwners(rules, 'docs/sub/readme.md').owners, []);
  assert.deepEqual(teamPrefixes(rules, '@elastic/one'), ['x-pack/a']);
  assert.deepEqual(teamPrefixes(rules, 'two'), ['x-pack/a/b']);
  assert.ok(patternToRegex('*.md').test('deep/dir/readme.md'));
  assert.ok(patternToRegex('/x-pack/foo/**').test('x-pack/foo/a/b.ts'));
});

test('--ref reads existing tests from a git ref instead of the working tree', () => {
  const file = `${PLUGIN}/server/lib/orphan_area/orphan_service.ts`;
  const newTest = `${PLUGIN}/server/lib/orphan_area/later/orphan_service.test.ts`;
  const baseline = git('rev-parse', 'HEAD').toString().trim();

  // commit a new importing test, then delete it from the working tree without committing
  fs.mkdirSync(path.dirname(path.join(repoRoot, newTest)), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, newTest),
    "import { orphan } from '../orphan_service';\ntest('x', () => {});"
  );
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'add test');
  fs.rmSync(path.join(repoRoot, newTest));

  const fromHead = analyzePr({ ...ctx, files: [modified(file)], ref: 'HEAD' });
  assert.equal(fromHead.existingTestsSource, 'HEAD');
  assert.deepEqual(linkTypes(rowFor(fromHead, file), newTest), ['import']);
  assert.equal(rowFor(fromHead, file).verdict, VERDICTS.NOT_UPDATED);

  const fromBaseline = analyzePr({ ...ctx, files: [modified(file)], ref: baseline });
  assert.equal(rowFor(fromBaseline, file).verdict, VERDICTS.NONE);

  // working tree (file deleted) sees nothing either
  const fromTree = analyzePr({ ...ctx, files: [modified(file)] });
  assert.equal(fromTree.existingTestsSource, 'working tree');
  assert.equal(rowFor(fromTree, file).verdict, VERDICTS.NONE);

  git('reset', '-q', '--hard', baseline);
});

test('CLI --files renders a markdown report with the legend and refuses --out outside .agents/tmp', () => {
  const file = `${PLUGIN}/public/detection_engine/rule_management_ui/components/rules_table/helpers.ts`;
  const input = path.join(repoRoot, 'changed.json');
  fs.writeFileSync(input, JSON.stringify([modified(file)]));

  const md = execFileSync('node', [CLI, '--files', input, '--repo-root', repoRoot]).toString();
  assert.ok(md.includes(LEGEND));
  assert.ok(md.includes(VERDICTS.NOT_UPDATED));

  const json = JSON.parse(
    execFileSync('node', [
      CLI,
      '--files',
      input,
      '--repo-root',
      repoRoot,
      '--format',
      'json',
    ]).toString()
  );
  assert.ok(Array.isArray(json.analysis.citedTestPaths));

  assert.throws(
    () =>
      execFileSync(
        'node',
        [
          CLI,
          '--files',
          input,
          '--repo-root',
          repoRoot,
          '--out',
          path.join(repoRoot, 'docs', 'r.md'),
        ],
        { stdio: 'pipe' }
      ),
    /must be under/
  );

  const okOut = path.join(repoRoot, '.agents', 'tmp', 'r.md');
  execFileSync('node', [CLI, '--files', input, '--repo-root', repoRoot, '--out', okOut], {
    stdio: 'pipe',
  });
  assert.ok(fs.existsSync(okOut));
});
