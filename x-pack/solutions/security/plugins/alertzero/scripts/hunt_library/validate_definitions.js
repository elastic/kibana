#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validates the checked-in Hunt Library definitions: runtime schema, ES|QL syntax of the candidate
 * query and of each surrounding-event query (with sample literals bound to its placeholders), and
 * agreement with the Steph-approved frozen id list.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/hunt_library/validate_definitions.js
 */

require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
const { validateQuery } = require('@kbn/esql-language');
const {
  parseHuntDefinition,
  extractSurroundingPlaceholders,
} = require('../../server/hunt_library/hunt_definition');
const frozen = require('./frozen_hunts.json');

const definitionsDir = path.join(__dirname, '..', '..', 'server', 'hunt_library', 'definitions');

const bindSamples = (query, keyFields) => {
  const samples = {
    bucket_start: '"2026-10-30T00:00:00.000Z"',
    bucket_end: '"2026-10-31T00:00:00.000Z"',
    group_id: '"v1:0123456789abcdef0123456789abcdef"',
  };
  for (const key of keyFields) {
    samples[key] = '"sample"';
  }
  return query.replace(/\{\{param\.([^{}\s]+)\}\}/g, (_, name) => samples[name]);
};

const main = async () => {
  const failures = [];
  const files = fs
    .readdirSync(definitionsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const ids = [];
  const tradeIds = [];

  for (const file of files) {
    let definition;
    try {
      definition = parseHuntDefinition(
        JSON.parse(fs.readFileSync(path.join(definitionsDir, file), 'utf8'))
      );
    } catch (e) {
      failures.push(`${file}: schema: ${e.message}`);
      continue;
    }
    ids.push(definition.id);
    tradeIds.push(definition.source.tradeId);
    if (definition.source.revision !== frozen.tradeRevision) {
      failures.push(`${file}: source revision differs from the frozen revision`);
    }
    if (`${definition.id}.json` !== file) {
      failures.push(`${file}: file name must match id ${definition.id}`);
    }

    const { query } = definition;
    const toCheck = [['query', query.query]];
    if (query.surroundingEventQuery) {
      toCheck.push([
        'surroundingEventQuery',
        bindSamples(query.surroundingEventQuery, query.occurrence.keyFields),
      ]);
      const unusedKeys = query.occurrence.keyFields.filter(
        (k) => !extractSurroundingPlaceholders(query.surroundingEventQuery).includes(k)
      );
      if (unusedKeys.length) {
        failures.push(
          `${file}: surrounding query never binds key field(s) ${unusedKeys.join(', ')}`
        );
      }
    }
    for (const [label, text] of toCheck) {
      const { errors } = await validateQuery(text);
      if (errors && errors.length) {
        failures.push(`${file}: ${label}: ${errors.map((e) => e.text || String(e)).join('; ')}`);
      }
    }
    console.log(`ok    ${definition.id} (${query.resultKind}, v${definition.version})`);
  }

  const frozenTradeIds = new Set(frozen.hunts.map((h) => h.tradeId));
  for (const tradeId of tradeIds) {
    if (!frozenTradeIds.has(tradeId)) {
      failures.push(`trade id ${tradeId} is not in the frozen list`);
    }
  }
  for (const tradeId of frozenTradeIds) {
    if (!tradeIds.includes(tradeId)) {
      failures.push(`frozen trade id ${tradeId} has no definition`);
    }
  }
  if (ids.length !== frozen.hunts.length) {
    failures.push(`expected ${frozen.hunts.length} definitions, found ${ids.length}`);
  }
  if (new Set(ids).size !== ids.length) {
    failures.push('definition ids are not unique');
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s):\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`\nAll ${ids.length} definitions valid.`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
