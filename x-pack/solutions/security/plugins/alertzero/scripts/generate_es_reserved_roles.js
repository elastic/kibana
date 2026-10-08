#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates the Elasticsearch reserved roles for AlertZero worker service accounts from
 * WORKER_ROLE_DEFINITIONS (common/worker_roles.ts), so the two never drift apart.
 *
 * Outside Serverless, workers run with these built-in roles instead of roles AlertZero creates.
 * After changing a worker's role, regenerate them and update elastic/elasticsearch:
 *
 *   node x-pack/solutions/security/plugins/alertzero/scripts/generate_es_reserved_roles.js <out_dir>
 *
 * It writes three snippets into <out_dir>:
 *   descriptors.java  replaces the AlertZero block at the end of KibanaOwnedReservedRoleDescriptors.java
 *   entries.java      replaces the AlertZero entries in ReservedRolesStore.initializeReservedRoles()
 *   tests.java        replaces the ALERTZERO_* test data in ReservedRolesStoreTests.java
 *
 * Then run `./gradlew :x-pack:plugin:core:spotlessApply` and
 * `./gradlew :x-pack:plugin:core:test --tests "*ReservedRolesStoreTests*"` in Elasticsearch.
 */

require('@kbn/setup-node-env');
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { WORKER_ROLE_DEFINITIONS } = require('../common/worker_roles');

const outDir = process.argv[2];
if (!outDir) {
  process.stderr.write('Usage: node generate_es_reserved_roles.js <out_dir>\n');
  process.exit(1);
}

const quote = (values) => values.map((value) => JSON.stringify(value)).join(', ');

/** `{ x: ['a', 'b'] }` becomes `feature_x.a`, `feature_x.b`. */
const toFeaturePrivileges = (feature) =>
  Object.entries(feature).flatMap(([featureId, privileges]) =>
    privileges.map((privilege) => `feature_${featureId}.${privilege}`)
  );

/** `alertzero_alert_triage` becomes `alertZeroAlertTriage`. */
const toMethodName = (roleName) =>
  `alertZero${roleName
    .split('_')
    .slice(1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;

const indexBuilder = ({ names, privileges }, indent) =>
  [
    `${indent}RoleDescriptor.IndicesPrivileges.builder()`,
    `${indent}    .indices(${quote(names)})`,
    `${indent}    .privileges(${quote(privileges)})`,
    `${indent}    .build()`,
  ].join('\n');

/** Elasticsearch index patterns here only use `*`, which matches any run of characters. */
const matchesPattern = (index, pattern) =>
  new RegExp(
    `^${pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`
  ).test(index);

const roles = Object.entries(WORKER_ROLE_DEFINITIONS).map(([workerId, { name, role }]) => {
  const { cluster, indices, run_as: runAs } = role.elasticsearch;
  const [kibana, ...otherKibana] = role.kibana;
  const worker = /^Privileges for the AlertZero (.+) worker\./.exec(role.description)?.[1];
  if (
    runAs.length > 0 ||
    otherKibana.length > 0 ||
    !isDeepStrictEqual(kibana.spaces, ['*']) ||
    kibana.base.length > 0 ||
    !worker
  ) {
    throw new Error(`The role for ${workerId} has a shape this script does not support`);
  }
  return { name, worker, cluster, indices, features: toFeaturePrivileges(kibana.feature) };
});

// What every role shares is written once. Check it really is shared, and comes first.
const [first] = roles;
const commonIndices = first.indices.filter((group) =>
  roles.every(({ indices }) => indices.some((other) => isDeepStrictEqual(other, group)))
);
const commonFeatures = first.features.filter((privilege) =>
  roles.every(({ features }) => features.includes(privilege))
);
for (const role of roles) {
  if (
    !isDeepStrictEqual(role.cluster, first.cluster) ||
    !isDeepStrictEqual(role.indices.slice(0, commonIndices.length), commonIndices) ||
    !isDeepStrictEqual(role.features.slice(0, commonFeatures.length), commonFeatures)
  ) {
    throw new Error(`The role ${role.name} does not start with the privileges every role shares`);
  }
  role.ownIndices = role.indices.slice(commonIndices.length);
  role.ownFeatures = role.features.slice(commonFeatures.length);
}

const descriptors = [
  `    private static final String[] ALERTZERO_WORKER_CLUSTER_PRIVILEGES = { ${quote(
    first.cluster
  )} };`,
  '',
  '    private static final RoleDescriptor.IndicesPrivileges[] ALERTZERO_WORKER_COMMON_INDICES = {',
  `${commonIndices.map((group) => indexBuilder(group, '        ')).join(',\n')} };`,
  '',
  '    private static final String[] ALERTZERO_WORKER_COMMON_FEATURE_PRIVILEGES = {',
  `${commonFeatures.map((privilege) => `        ${JSON.stringify(privilege)}`).join(',\n')} };`,
  ...roles.flatMap((role) => [
    '',
    '    // package-private to expose to ReservedRoleStore',
    `    static RoleDescriptor ${toMethodName(role.name)}(String name) {`,
    '        return alertZeroWorker(',
    '            name,',
    `            ${JSON.stringify(role.worker)},`,
    `            new String[] { ${quote(role.ownFeatures)} },`,
    role.ownIndices.map((group) => indexBuilder(group, '            ')).join(',\n'),
    '        );',
    '    }',
  ]),
  `
    private static RoleDescriptor alertZeroWorker(
        String name,
        String workerName,
        String[] featurePrivileges,
        RoleDescriptor.IndicesPrivileges... indices
    ) {
        return new RoleDescriptor(
            name,
            ALERTZERO_WORKER_CLUSTER_PRIVILEGES,
            ArrayUtils.concat(ALERTZERO_WORKER_COMMON_INDICES, indices),
            new RoleDescriptor.ApplicationResourcePrivileges[] {
                RoleDescriptor.ApplicationResourcePrivileges.builder()
                    .application("kibana-.kibana")
                    .resources("*")
                    .privileges(ArrayUtils.concat(ALERTZERO_WORKER_COMMON_FEATURE_PRIVILEGES, featurePrivileges))
                    .build() },
            null,
            null,
            MetadataUtils.DEFAULT_RESERVED_METADATA,
            null,
            null,
            null,
            null,
            "Grants the privileges required by the service account of the AlertZero "
                + workerName
                + " worker, in all Kibana spaces. Assign this role only to that service account."
        );
    }`,
];

const entries = [
  '            // AlertZero worker service accounts',
  ...roles.map(
    ({ name }) =>
      `            entry(${JSON.stringify(name)}, KibanaOwnedReservedRoleDescriptors.${toMethodName(
        name
      )}(${JSON.stringify(name)})),`
  ),
];

// One sample index per granted pattern, plus indices no worker may touch. A role's expected
// privileges on a sample are the union over its patterns that match it, so every sample is also
// a negative check for the roles that don't grant it.
const samples = [
  ...[
    ...new Set(
      roles.flatMap(({ indices }) =>
        indices.flatMap(({ names }) => names.map((pattern) => pattern.replaceAll('*', 'sample')))
      )
    ),
  ].sort(),
  'unrelated-index',
  '.kibana',
  '.alerts-observability.logs.alerts-default',
];
const allFeatures = [
  ...new Set([
    ...roles.flatMap(({ features }) => features),
    'feature_siemV5.all',
    'feature_securitySolutionRulesV4.all',
    'feature_alertzero.read',
  ]),
].sort();

const expectedPrivileges = ({ indices }, sample) =>
  [
    ...new Set(
      indices
        .filter(({ names }) => names.some((pattern) => matchesPattern(sample, pattern)))
        .flatMap(({ privileges }) => privileges)
    ),
  ].sort();

const tests = [
  '    private static final Map<String, Map<String, Set<String>>> ALERTZERO_WORKER_INDEX_PRIVILEGES = Map.ofEntries(',
  roles
    .map(
      (role) =>
        `        Map.entry(\n            ${JSON.stringify(
          role.name
        )},\n            Map.ofEntries(\n${samples
          .map(
            (sample) =>
              `            Map.entry(${JSON.stringify(sample)}, Set.of(${quote(
                expectedPrivileges(role, sample)
              )}))`
          )
          .join(',\n')}\n            )\n        )`
    )
    .join(',\n'),
  '    );',
  '',
  '    private static final Map<String, Set<String>> ALERTZERO_WORKER_FEATURE_PRIVILEGES = Map.ofEntries(',
  roles
    .map(
      ({ name, features }) =>
        `        Map.entry(${JSON.stringify(name)}, Set.of(${quote([...features].sort())}))`
    )
    .join(',\n'),
  '    );',
  '',
  `    private static final Set<String> ALERTZERO_ALL_FEATURE_PRIVILEGES = Set.of(${quote(
    allFeatures
  )});`,
];

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'descriptors.java'), `${descriptors.join('\n')}\n`);
fs.writeFileSync(path.join(outDir, 'entries.java'), `${entries.join('\n')}\n`);
fs.writeFileSync(path.join(outDir, 'tests.java'), `${tests.join('\n')}\n`);
process.stdout.write(`Wrote ${roles.length} roles to ${outDir}\n`);
