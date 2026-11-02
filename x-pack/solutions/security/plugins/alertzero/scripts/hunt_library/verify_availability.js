#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs the production availability checks (scope, index, mapping, probe) for every curated hunt
 * against a real Elasticsearch, plus three negative cases built from a real definition.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/hunt_library/verify_availability.js \
 *     [--es http://localhost:9200] [--user elastic] [--password changeme]
 *
 * Run `plant_hunts.js plant` first so the endpoint, Linux, Okta and AWS streams exist.
 */

require('@kbn/setup-node-env');

const { Client } = require('@elastic/elasticsearch');
const {
  checkHuntAvailability,
  uncoveredByScope,
} = require('../../server/hunt_library/availability');
const { HUNT_DEFINITIONS } = require('../../server/hunt_library/seed');

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const client = new Client({
  node: argValue('--es', 'http://localhost:9200'),
  auth: { username: argValue('--user', 'elastic'), password: argValue('--password', 'changeme') },
});
const noop = () => {};
const logger = { debug: noop, info: noop, warn: noop, error: noop };

const check = (definition, overrides = {}) =>
  checkHuntAvailability({
    esClient: client,
    definition,
    identity: 'caller',
    checkScope: (required) => ({ details: uncoveredByScope(['logs-*'], required) }),
    probe: true,
    logger,
    ...overrides,
  });

const main = async () => {
  let failed = 0;
  const expect = (label, ok, detail) => {
    if (!ok) failed++;
    console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}${detail ? `  ${detail}` : ''}`);
  };

  for (const definition of HUNT_DEFINITIONS) {
    const started = Date.now();
    const result = await check(definition);
    expect(
      definition.id,
      result.available && result.probe === 'passed',
      `${Date.now() - started}ms ${JSON.stringify(result.failures)}`
    );
  }

  const [base] = HUNT_DEFINITIONS;
  const withQuery = (patch) => ({ ...base, query: { ...base.query, ...patch } });

  const missingIndex = await check(
    withQuery({ requiredIndexPatterns: ['logs-hunt-library-no-such-stream*'] })
  );
  expect('missing index -> unavailable_index', missingIndex.firstFailure === 'unavailable_index');

  const missingField = await check(
    withQuery({ requiredFields: [...base.query.requiredFields, 'no.such.field'] })
  );
  expect(
    'missing field -> unavailable_mapping',
    missingField.firstFailure === 'unavailable_mapping' &&
      missingField.failures[0].details.includes('missing:no.such.field')
  );

  const badQuery = await check(withQuery({ query: `${base.query.query}\n| KEEP no_such_column` }));
  expect('invalid query -> probe_failed', badQuery.firstFailure === 'probe_failed');

  const outOfScope = await check(base, {
    checkScope: (required) => ({ details: uncoveredByScope(['filebeat-*'], required) }),
  });
  expect('outside scope -> unavailable_scope', outOfScope.firstFailure === 'unavailable_scope');

  await client.close();
  if (failed > 0) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('Availability verified against real Elasticsearch.');
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
