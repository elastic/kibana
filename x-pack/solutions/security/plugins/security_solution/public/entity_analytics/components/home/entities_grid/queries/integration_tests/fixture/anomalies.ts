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

type Identity = Record<string, string>;

/** Alice's EUID comes from `user.name` with `event.module`, web-2's from `host.id`, as on their entity docs. */
const SHARED_INDEX_IDENTITIES: readonly Identity[] = [
  { 'user.name': 'alice', 'event.module': 'okta' },
  { 'user.name': 'alice', 'event.module': 'okta' },
  { 'host.id': 'h2', 'host.name': 'web-2' },
];

/** Records of an alias of host:h1 and of an alias of user:bob@okta. */
const CUSTOM_INDEX_IDENTITIES: readonly Identity[] = [
  { 'host.id': 'h4', 'host.name': 'web-4' },
  { 'user.name': 'carol', 'event.module': 'okta' },
];

const buildAnomalyIndex = (index: string, identities: readonly Identity[]): FixtureIndex => ({
  index,
  fields: {
    ...keywordsOf(EUID_SOURCE_FIELDS),
    '@timestamp': DATE,
    job_id: KEYWORD,
    result_type: KEYWORD,
    is_interim: { type: 'boolean' },
    record_score: FLOAT,
  },
  buildDocs: (now) =>
    identities.map((identity) => ({
      '@timestamp': toIsoAgo(now, 2 * HOUR_MS),
      job_id: ANOMALY_JOB_ID,
      result_type: 'record',
      is_interim: false,
      record_score: 50,
      ...identity,
    })),
});

/** Final records of an installed security job, in the shared results index. */
export const anomaliesIndex = buildAnomalyIndex('.ml-anomalies-shared', SHARED_INDEX_IDENTITIES);

/** Records of the same job in its own results index: only `.ml-anomalies-*` reaches them, not `.ml-anomalies-shared*`. */
export const customAnomaliesIndex = buildAnomalyIndex(
  `.ml-anomalies-custom-${ANOMALY_JOB_ID}`,
  CUSTOM_INDEX_IDENTITIES
);
