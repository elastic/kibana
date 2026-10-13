/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefResponse } from '../../../../../common/entity_analytics/executive_brief/api';
import type { BriefDocument } from '../../../../../common/entity_analytics/executive_brief/document';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { buildValidBrief, FIXTURE_EVIDENCE } from '../verification/__fixtures__/evidence';
import { toBriefResponse } from './brief_response';

const STARTED = '2026-10-12T10:00:00.000Z';
const BEAT = '2026-10-12T10:00:20.000Z';
const GENERATED = '2026-10-12T10:00:30.000Z';
const EXPIRES = '2026-11-11T10:00:30.000Z';
const PARAMS = {
  range: '7d',
  from: '2026-10-05T10:00:00.000Z',
  to: STARTED,
  connector_id: 'c1',
} as const;
const EMPTY_EVIDENCE: Evidence = {
  entities: {},
  facts: [],
  links: [],
  signals: FIXTURE_EVIDENCE.signals,
};

const doc = (overrides: Partial<BriefDocument>): BriefDocument => ({
  schema_version: 1,
  owner: { id: 'profile-1' },
  space_id: 'default',
  job: { id: 'job-1', status: 'succeeded', started_at: STARTED, heartbeat_at: BEAT },
  expires_at: EXPIRES,
  ...overrides,
});

describe('toBriefResponse', () => {
  it.each<[string, BriefDocument, BriefResponse]>([
    [
      'a running job with no report',
      doc({ job: { id: 'job-1', status: 'running', stage: 'compose', started_at: STARTED } }),
      {
        generation: {
          jobId: 'job-1',
          status: 'running',
          stage: 'compose',
          startedAt: STARTED,
          updatedAt: STARTED,
        },
      },
    ],
    [
      'a failed first run',
      doc({
        job: {
          id: 'job-1',
          status: 'failed',
          stage: 'compose',
          started_at: STARTED,
          heartbeat_at: BEAT,
          error: { code: 'llm_error', message: 'The AI connector call failed' },
        },
      }),
      {
        generation: {
          jobId: 'job-1',
          status: 'failed',
          startedAt: STARTED,
          updatedAt: BEAT,
          error: { code: 'llm_error', message: 'The AI connector call failed' },
        },
      },
    ],
    [
      'a succeeded run with no findings',
      doc({ generated_at: GENERATED, params: PARAMS, evidence: EMPTY_EVIDENCE }),
      {
        generation: { jobId: 'job-1', status: 'succeeded', startedAt: STARTED, updatedAt: BEAT },
        report: {
          generatedAt: GENERATED,
          expiresAt: EXPIRES,
          period: { range: '7d', from: PARAMS.from, to: PARAMS.to },
        },
        provenance: {
          connectorId: 'c1',
          signals: EMPTY_EVIDENCE.signals,
          entities: {},
          facts: [],
          links: [],
        },
      },
    ],
    [
      'a succeeded run with a brief',
      doc({
        generated_at: GENERATED,
        params: PARAMS,
        model: 'model-x',
        tokens: { prompt: 10, completion: 5, total: 15 },
        evidence: FIXTURE_EVIDENCE,
        brief: buildValidBrief(),
        verification: { dropped: {}, lowered: 0, repaired: false },
      }),
      {
        generation: { jobId: 'job-1', status: 'succeeded', startedAt: STARTED, updatedAt: BEAT },
        report: {
          generatedAt: GENERATED,
          expiresAt: EXPIRES,
          period: { range: '7d', from: PARAMS.from, to: PARAMS.to },
          verdict: buildValidBrief().verdict,
          areas: buildValidBrief().areas,
        },
        provenance: {
          connectorId: 'c1',
          model: 'model-x',
          tokens: { prompt: 10, completion: 5, total: 15 },
          verification: { dropped: {}, lowered: 0, repaired: false },
          signals: FIXTURE_EVIDENCE.signals,
          entities: FIXTURE_EVIDENCE.entities,
          facts: FIXTURE_EVIDENCE.facts,
          links: FIXTURE_EVIDENCE.links,
        },
      },
    ],
  ])('%s', (_name, document, expected) => {
    expect(toBriefResponse(document)).toStrictEqual(expected);
  });
});
