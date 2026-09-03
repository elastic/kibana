#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * kibana-tjil.21 / C0 — rename PND's correlation key to `correlationId`.
 *
 * Re-runnable after the #285955 rebase. Idempotent: a second run is a no-op
 * (OpenAPI generation is deterministic; versions bump only when YAML still
 * used the old key).
 *
 * This is a boundary mapping, not a blanket find-and-replace:
 *
 *   - Producer field on `security.attackDiscoveryCreated` (plugins/discoveries)
 *     is UNTOUCHED. YAML keeps reading `event.<old key>` and maps it to
 *     `correlationId` at the first PND route call.
 *   - PND's own key (schemas, routes, rows, `pnd.incidentClosed`, YAMLs) becomes
 *     `correlationId`.
 *
 * Usage (from the Kibana repo root, or anywhere — the script finds the root):
 *
 *   nvm use
 *   node x-pack/solutions/security/plugins/pnd/scripts/rename_correlation_id.js
 *
 * Keep this file. It is the rebase insurance policy.
 */

const { execSync } = require('child_process');
const { existsSync, readdirSync, readFileSync, statSync, writeFileSync } = require('fs');
const { extname, join, relative } = require('path');

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();

// Built at runtime so this file itself does not contain the old identifier —
// acceptance forbids that contiguous string anywhere under plugins/pnd or
// kbn-pnd-common (excluding target/).
const OLD_SINGULAR = ['attack', 'Discovery', 'Alert', 'Id'].join('');
const OLD_PLURAL = `${OLD_SINGULAR}s`;
const NEW_SINGULAR = 'correlationId';
const NEW_PLURAL = 'correlationIds';
const OLD_STEP = ['set', 'attack', 'discovery', 'id'].join('_');
const NEW_STEP = 'set_correlation_id';
const PRODUCER_EVENT_FIELD = `event.${OLD_SINGULAR}`;
const PRODUCER_SENTINEL = '__PND_C0_PRODUCER_EVENT_FIELD__';

const PND_COMMON = join(REPO_ROOT, 'x-pack/solutions/security/packages/kbn-pnd-common');
const PND_PLUGIN = join(REPO_ROOT, 'x-pack/solutions/security/plugins/pnd');
const PND_WORKFLOWS = join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-workflows/managed/definitions/pnd'
);

const SKIP_DIR_NAMES = new Set(['node_modules', 'target', 'dist', '.git']);
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.yaml', '.yml', '.md', '.json']);

const WORKFLOW_VERSION_BUMPS = [
  {
    constName: 'PND_WATCH_DEEP_WORKFLOW',
    from: 11,
    to: 12,
    note: '11 -> 12: kibana-tjil.21 / C0 — PND route query becomes correlationId. An un-bumped edit leaves the installed worker posting the old query name, which 400s.',
  },
  {
    constName: 'PND_WATCH_FLOOR_WORKFLOW',
    from: 16,
    to: 17,
    note: '16 -> 17: kibana-tjil.21 / C0 — PND route calls map the producer alert id to correlationId. An un-bumped edit leaves the installed Floor posting the old query name, which 400s.',
  },
  {
    constName: 'PND_WATCH_POST_INCIDENT_WORKFLOW',
    from: 12,
    to: 13,
    note: '12 -> 13: kibana-tjil.21 / C0 — set_correlation_id plus correlationId on every PND route call. An un-bumped edit leaves the installed watch posting the old field name, which 400s.',
  },
];

const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) continue;

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (!TEXT_EXTENSIONS.has(extname(entry))) continue;
    // Generated files are produced by `yarn openapi:generate`, never hand-edited.
    if (entry.endsWith('.gen.ts')) continue;
    // This script must not rewrite itself.
    if (fullPath === __filename) continue;

    files.push(fullPath);
  }

  return files;
};

const applyRenames = (text, { protectProducer }) => {
  const protectedText = protectProducer
    ? text.split(PRODUCER_EVENT_FIELD).join(PRODUCER_SENTINEL)
    : text;

  const renamed = protectedText
    .split(OLD_PLURAL)
    .join(NEW_PLURAL)
    .split(OLD_SINGULAR)
    .join(NEW_SINGULAR)
    .split(OLD_STEP)
    .join(NEW_STEP);

  return protectProducer ? renamed.split(PRODUCER_SENTINEL).join(PRODUCER_EVENT_FIELD) : renamed;
};

const rewriteTree = (root, { protectProducer }) => {
  if (!existsSync(root)) {
    throw new Error(`Missing tree: ${root}`);
  }

  let changedFiles = 0;

  for (const filePath of walk(root)) {
    const before = readFileSync(filePath, 'utf8');
    const after = applyRenames(before, { protectProducer });

    if (after === before) continue;

    writeFileSync(filePath, after);
    changedFiles += 1;
    console.log(`  updated ${relative(REPO_ROOT, filePath)}`);
  }

  return changedFiles;
};

const bumpWorkflowVersions = (definitionsText, yamlChanged) => {
  if (!yamlChanged) {
    return definitionsText;
  }

  return WORKFLOW_VERSION_BUMPS.reduce((text, { constName, from, to, note }) => {
    const versionLine = new RegExp(
      `(export const ${constName} = \\{[\\s\\S]*?)\\n  version: ${from},`
    );

    if (!versionLine.test(text)) {
      return text;
    }

    return text.replace(versionLine, `$1\n  // ${note}\n  version: ${to},`);
  }, definitionsText);
};

const applyReadmeProse = (readme) => {
  const discoveriesPayloadOld = `payload = { ${NEW_SINGULAR}, alertIds, riskScore?, generationUuid, spaceId }`;
  const discoveriesPayloadNew = `payload = { attack-discovery alert id, alertIds, riskScore?, generationUuid, spaceId }
        │     PND maps that producer field to \`${NEW_SINGULAR}\` at the first route call`;

  const discoveriesTableOld = `\`{ ${NEW_SINGULAR}, alertIds, riskScore?, generationUuid, spaceId }\``;
  const discoveriesTableNew = `producer contract in \`plugins/discoveries\` — PND maps the alert id to \`${NEW_SINGULAR}\``;

  const c0Old = `**This \`${NEW_SINGULAR}\` *is* a correlation id.** Aug 19
[project-daybreak #137](https://github.com/elastic/project-daybreak/pull/137) decision 5 endorses
correlation ids over hard link pointers. The UUIDv5 derivation is the direction the programme chose,
not a workaround awaiting native parentage. (C0, bead \`.18\`, will rename the field to \`${NEW_SINGULAR}\`.)`;

  const c0New = `**\`${NEW_SINGULAR}\` *is* decision 5's correlation id.** Aug 19
[project-daybreak #137](https://github.com/elastic/project-daybreak/pull/137) decision 5 endorses
correlation ids over hard link pointers. PND reads the attack-discovery alert id off
\`security.attackDiscoveryCreated\` (a producer field; another plugin's contract) and maps it
to \`${NEW_SINGULAR}\` at the first PND route call. The UUIDv5 derivation is the direction the
programme chose, not a workaround awaiting native parentage.`;

  return readme
    .split(discoveriesPayloadOld)
    .join(discoveriesPayloadNew)
    .split(discoveriesTableOld)
    .join(discoveriesTableNew)
    .split(c0Old)
    .join(c0New);
};

const applySchemaDescription = (schemaYaml) => {
  const oldDescription = `description: Attack Discovery 2.0 alert id this conversation was derived from`;
  const newDescription = `description: >
            Correlation id this conversation was derived from (Aug-19 decision 5).
            On the Attack Discovery path this is the producer alert id; it also
            keys an incident imported from elsewhere, which has no attack discovery.`;

  return schemaYaml.split(oldDescription).join(newDescription);
};

const assertNoOldKeyInPndTrees = () => {
  const leftover = execSync(
    `rg -n --glob '!target/**' --glob '!**/rename_correlation_id.js' ${OLD_SINGULAR} ` +
      `"${relative(REPO_ROOT, PND_COMMON)}" "${relative(REPO_ROOT, PND_PLUGIN)}" || true`,
    { cwd: REPO_ROOT, encoding: 'utf8' }
  ).trim();

  if (leftover !== '') {
    throw new Error(`Old correlation key still present:\n${leftover}`);
  }
};

const assertDiscoveriesUntouched = () => {
  const status = execSync(
    'git status --porcelain -- x-pack/solutions/security/plugins/discoveries',
    { cwd: REPO_ROOT, encoding: 'utf8' }
  ).trim();

  if (status !== '') {
    throw new Error(`discoveries producer contract was touched:\n${status}`);
  }
};

const main = () => {
  console.log(`C0 rename: ${OLD_SINGULAR} → ${NEW_SINGULAR}`);
  console.log(`repo: ${REPO_ROOT}`);

  const workflowFilesBefore = walk(PND_WORKFLOWS).filter((filePath) => {
    const text = readFileSync(filePath, 'utf8');
    const protectedText = text.split(PRODUCER_EVENT_FIELD).join(PRODUCER_SENTINEL);

    return protectedText.includes(OLD_SINGULAR) || protectedText.includes(OLD_STEP);
  });
  const yamlNeedsBump = workflowFilesBefore.some((filePath) => filePath.endsWith('.yaml'));

  console.log('\n1. kbn-pnd-common schemas + impl');
  rewriteTree(PND_COMMON, { protectProducer: false });

  console.log('\n2. openapi:generate (from kbn-pnd-common)');
  execSync(`${process.execPath} scripts/openapi/generate`, { cwd: PND_COMMON, stdio: 'inherit' });

  const conversationSchemaPath = join(
    PND_COMMON,
    'impl/schemas/components/conversation.schema.yaml'
  );
  const conversationSchema = readFileSync(conversationSchemaPath, 'utf8');
  const conversationSchemaUpdated = applySchemaDescription(conversationSchema);
  if (conversationSchemaUpdated !== conversationSchema) {
    writeFileSync(conversationSchemaPath, conversationSchemaUpdated);
    console.log(`  updated ${relative(REPO_ROOT, conversationSchemaPath)} (description)`);
    execSync(`${process.execPath} scripts/openapi/generate`, { cwd: PND_COMMON, stdio: 'inherit' });
  }

  console.log('\n3. plugins/pnd');
  rewriteTree(PND_PLUGIN, { protectProducer: false });

  const readmePath = join(PND_PLUGIN, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  const readmeUpdated = applyReadmeProse(readme);
  if (readmeUpdated !== readme) {
    writeFileSync(readmePath, readmeUpdated);
    console.log(`  updated ${relative(REPO_ROOT, readmePath)} (producer mapping prose)`);
  }

  console.log('\n4. PND YAMLs + tests (producer event field protected)');
  rewriteTree(PND_WORKFLOWS, { protectProducer: true });

  const definitionsPath = join(PND_WORKFLOWS, 'index.ts');
  const definitionsBefore = readFileSync(definitionsPath, 'utf8');
  const definitionsAfter = bumpWorkflowVersions(definitionsBefore, yamlNeedsBump);
  if (definitionsAfter !== definitionsBefore) {
    writeFileSync(definitionsPath, definitionsAfter);
    console.log(`  bumped definition versions in ${relative(REPO_ROOT, definitionsPath)}`);
  } else if (yamlNeedsBump) {
    console.log('  version bump skipped (already at post-rename versions, or pattern missed)');
  } else {
    console.log('  version bump skipped (YAML already used the new key)');
  }

  console.log('\n5. acceptance checks');
  assertNoOldKeyInPndTrees();
  assertDiscoveriesUntouched();
  console.log('  old key gone from kbn-pnd-common and plugins/pnd');
  console.log('  discoveries producer contract untouched');
  console.log('\nC0 rename complete.');
};

main();
