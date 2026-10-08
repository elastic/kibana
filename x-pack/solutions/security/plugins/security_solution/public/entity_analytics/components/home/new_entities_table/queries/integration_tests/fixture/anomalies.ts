/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATE,
  EUID_SOURCE_FIELDS,
  FLOAT,
  HOUR_MS,
  KEYWORD,
  keywordsOf,
  toIsoAgo,
} from './fixture_index';
import type { FixtureIndex } from './fixture_index';

export const ANOMALY_JOB_ID = 'test_security_job';

/** Identity fields of the records: alice's EUID comes from `user.name` and `event.module`. */
const ANOMALY_IDENTITIES: ReadonlyArray<Record<string, string>> = [
  { 'user.name': 'alice', 'event.module': 'okta' },
  { 'user.name': 'alice', 'event.module': 'okta' },
  { 'host.name': 'h2' },
];

/** Final records of an installed security job; matches the queries' `.ml-anomalies-shared*`. */
export const anomaliesIndex: FixtureIndex = {
  index: '.ml-anomalies-shared',
  fields: {
    ...keywordsOf(EUID_SOURCE_FIELDS),
    '@timestamp': DATE,
    job_id: KEYWORD,
    result_type: KEYWORD,
    is_interim: { type: 'boolean' },
    record_score: FLOAT,
  },
  buildDocs: (now) =>
    ANOMALY_IDENTITIES.map((identity) => ({
      '@timestamp': toIsoAgo(now, 2 * HOUR_MS),
      job_id: ANOMALY_JOB_ID,
      result_type: 'record',
      is_interim: false,
      record_score: 50,
      ...identity,
    })),
};
