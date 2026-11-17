#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Audits that the `alertzero_threat_hunt` worker service account can read every index pattern the
 * Hunt Library definitions require (plan 18, Phase 0). Serverless is checked against the
 * predefined role in the repo's serverless `roles.yml`; stateful against the reserved role read
 * from a live Elasticsearch.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/hunt_library/audit_worker_sources.js \
 *     [--es http://localhost:9200] [--user elastic] [--password changeme] [--out <file.json>]
 */

require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { REPO_ROOT } = require('@kbn/repo-info');
const { Client } = require('@elastic/elasticsearch');
const {
  uncoveredPatterns,
} = require('../../server/services/watches/hunt/common/role_pattern_coverage');

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const ROLE = 'alertzero_threat_hunt';
const definitionsDir = path.join(__dirname, '..', '..', 'server', 'hunt_library', 'definitions');
const rolesYml = path.join(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles/security/roles.yml'
);
const outFile = argValue('--out', path.join(__dirname, 'worker_source_audit.json'));

const normalize = ({ indices = [], remote_indices: remoteIndices = [] }) => ({
  indices: indices.map(({ names, privileges }) => ({
    names: [].concat(names),
    privileges: privileges || [],
  })),
  remoteIndices: remoteIndices.map(({ names, privileges, clusters }) => ({
    names: [].concat(names),
    privileges: privileges || [],
    clusters: [].concat(clusters),
  })),
});

const main = async () => {
  const definitions = fs
    .readdirSync(definitionsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(definitionsDir, f), 'utf8')));

  const serverlessRole = normalize(yaml.parse(fs.readFileSync(rolesYml, 'utf8'))[`_${ROLE}`]);

  const client = new Client({
    node: argValue('--es', 'http://localhost:9200'),
    auth: {
      username: argValue('--user', 'elastic'),
      password: argValue('--password', 'changeme'),
    },
  });
  const info = await client.info();
  const statefulRole = normalize((await client.security.getRole({ name: ROLE }))[ROLE]);

  const rows = definitions.map((definition) => {
    const patterns = [
      ...definition.query.requiredIndexPatterns,
      ...(definition.query.surroundingEventQuery
        ? [
            ...definition.query.surroundingEventQuery.matchAll(
              /^\s*from\s+([^\s,]+(?:\s*,\s*[^\s,]+)*)/gim
            ),
          ].flatMap((m) => m[1].split(',').map((p) => p.trim()))
        : []),
    ];
    const unique = [...new Set(patterns)];
    return {
      id: definition.id,
      patterns: unique,
      serverlessUncovered: uncoveredPatterns({
        role: serverlessRole,
        patterns: unique,
        isServerless: true,
      }),
      statefulUncovered: uncoveredPatterns({
        role: statefulRole,
        patterns: unique,
        isServerless: false,
      }),
    };
  });

  const result = {
    role: ROLE,
    elasticsearchVersion: info.version.number,
    serverlessRoleSource: path.relative(REPO_ROOT, rolesYml),
    rows,
    ok: rows.every((r) => !r.serverlessUncovered.length && !r.statefulUncovered.length),
  };
  fs.writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);

  for (const r of rows) {
    const status = r.serverlessUncovered.length || r.statefulUncovered.length ? 'FAIL' : 'ok  ';
    console.log(
      `${status}  ${r.id}  [${r.patterns.join(', ')}]` +
        `${
          r.serverlessUncovered.length ? `  serverless uncovered: ${r.serverlessUncovered}` : ''
        }` +
        `${r.statefulUncovered.length ? `  stateful uncovered: ${r.statefulUncovered}` : ''}`
    );
  }
  console.log(
    `\n${result.ok ? 'All sources readable' : 'Uncovered sources found'} (ES ${
      info.version.number
    })`
  );
  process.exit(result.ok ? 0 : 1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
