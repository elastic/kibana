/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import { loadSourceIdentityClassification } from './load_source_identity_classification';

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as unknown as Logger;

const makeFeature = (overrides: Partial<Feature> & { stream_name: string }): Feature =>
  ({
    id: `feature-${overrides.stream_name}`,
    uuid: `uuid-${overrides.stream_name}`,
    type: 'schema',
    description: 'schema feature',
    confidence: 90,
    status: 'active',
    last_seen: '2026-06-01T00:00:00.000Z',
    properties: {},
    ...overrides,
  } as Feature);

const userPresence = { entity_field_presence: { user: ['user.name'] } };

const makeReader = (
  features: Feature[],
  resolve: (streamName: string) => string[] = (streamName) => [streamName]
): StreamsKnowledgeIndicatorsReader => ({
  listDatasetAnalysisFeatures: jest.fn(async () => []),
  listSchemaFeatures: jest.fn(async () => features),
  resolveIndexPatterns: jest.fn(async (streamName: string) => resolve(streamName)),
});

beforeEach(() => jest.clearAllMocks());

describe('loadSourceIdentityClassification', () => {
  it('short-circuits with no I/O when minConfidence is null', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.okta',
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'high', namespace: 'okta' },
        },
      }),
    ]);
    const result = await loadSourceIdentityClassification(reader, { minConfidence: null }, logger);
    expect(reader.listSchemaFeatures).not.toHaveBeenCalled();
    expect(result.classifications).toEqual([]);
    expect(result.byIndexPattern.size).toBe(0);
  });

  it('passes the configured confidence floor to the reader', async () => {
    const reader = makeReader([]);
    await loadSourceIdentityClassification(reader, { minConfidence: 75 }, logger);
    expect(reader.listSchemaFeatures).toHaveBeenCalledWith({ minConfidence: 75 });
  });

  it('classifies a high (IdP) source with its namespace and index patterns', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.okta',
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'high', namespace: 'okta' },
        },
      }),
    ]);
    const { classifications, byIndexPattern } = await loadSourceIdentityClassification(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(classifications).toHaveLength(1);
    expect(classifications[0]).toMatchObject({
      streamName: 'logs.okta',
      namespace: 'okta',
      tier: 'high',
      indexPatterns: ['logs.okta'],
    });
    expect(byIndexPattern.get('logs.okta')).toEqual({ namespace: 'okta', tier: 'high' });
  });

  it('classifies a medium (host-agent) source as local', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.defend',
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'medium', namespace: 'local' },
        },
      }),
    ]);
    const { classifications } = await loadSourceIdentityClassification(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(classifications[0]).toMatchObject({ tier: 'medium', namespace: 'local' });
  });

  it('ignores features with an invalid tier', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.bad',
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'critical', namespace: 'okta' },
        },
      }),
    ]);
    const { classifications } = await loadSourceIdentityClassification(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(classifications).toEqual([]);
  });

  it('ignores features with an empty namespace', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.bad',
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'high', namespace: '   ' },
        },
      }),
    ]);
    const { classifications } = await loadSourceIdentityClassification(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(classifications).toEqual([]);
  });

  it('ignores a classification on a stream with no user identity field', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.firewall',
        properties: {
          // host/service only, no user identity
          entity_field_presence: { host: ['host.name'] },
          identity_classification: { confidence_tier: 'high', namespace: 'okta' },
        },
      }),
    ]);
    const { classifications } = await loadSourceIdentityClassification(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(classifications).toEqual([]);
  });

  it('prefers the highest-confidence feature when a stream is classified twice', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.mixed',
        confidence: 70,
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'medium', namespace: 'local' },
        },
      }),
      makeFeature({
        stream_name: 'logs.mixed',
        confidence: 95,
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'high', namespace: 'entra_id' },
        },
      }),
    ]);
    const { classifications } = await loadSourceIdentityClassification(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(classifications).toHaveLength(1);
    expect(classifications[0]).toMatchObject({ tier: 'high', namespace: 'entra_id' });
  });

  it('skips streams that resolve to no index patterns', async () => {
    const reader = makeReader(
      [
        makeFeature({
          stream_name: 'logs.gone',
          properties: {
            ...userPresence,
            identity_classification: { confidence_tier: 'high', namespace: 'okta' },
          },
        }),
      ],
      () => []
    );
    const { classifications, byIndexPattern } = await loadSourceIdentityClassification(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(classifications).toEqual([]);
    expect(byIndexPattern.size).toBe(0);
  });

  it('returns a stream-name-sorted classification list', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.zeta',
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'high', namespace: 'okta' },
        },
      }),
      makeFeature({
        stream_name: 'logs.alpha',
        properties: {
          ...userPresence,
          identity_classification: { confidence_tier: 'medium', namespace: 'local' },
        },
      }),
    ]);
    const { classifications } = await loadSourceIdentityClassification(
      reader,
      { minConfidence: 0 },
      logger
    );
    expect(classifications.map((c) => c.streamName)).toEqual(['logs.alpha', 'logs.zeta']);
  });
});
