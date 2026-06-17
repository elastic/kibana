/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import {
  deriveEntityFieldPresenceFromDatasetAnalysis,
  loadPerTypeSourceIndices,
} from './load_per_type_source_indices';

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as unknown as Logger;

/**
 * Builds the `properties.analysis.fields` shape a `dataset_analysis` feature
 * carries. Keys mirror `formatDocumentAnalysis`'s `"<name> (<types>)"` format
 * (e.g. `"user.email (keyword)"`); the sampled value lists are irrelevant to
 * source discovery, so a single placeholder entry is used.
 */
const datasetAnalysisProps = (fieldKeys: string[]): Record<string, unknown> => ({
  analysis: {
    total: 100,
    sampled: 100,
    fields: Object.fromEntries(fieldKeys.map((key) => [key, ['sample (1%)']])),
  },
});

const makeFeature = (overrides: Partial<Feature> & { stream_name: string }): Feature =>
  ({
    id: `feature-${overrides.stream_name}`,
    uuid: `uuid-${overrides.stream_name}`,
    type: 'dataset_analysis',
    description: 'dataset analysis feature',
    confidence: 100,
    status: 'active',
    last_seen: '2026-06-01T00:00:00.000Z',
    properties: {},
    ...overrides,
  } as Feature);

const makeReader = (
  features: Feature[],
  resolve: (streamName: string) => string[] = (streamName) => [streamName]
): StreamsKnowledgeIndicatorsReader => ({
  listDatasetAnalysisFeatures: jest.fn(async () => features),
  listSchemaFeatures: jest.fn(async () => []),
  resolveIndexPatterns: jest.fn(async (streamName: string) => resolve(streamName)),
});

describe('deriveEntityFieldPresenceFromDatasetAnalysis', () => {
  it('treats keyword-typed identity fields as present', () => {
    const present = deriveEntityFieldPresenceFromDatasetAnalysis(
      makeFeature({
        stream_name: 'logs.app',
        properties: datasetAnalysisProps([
          'user.name (keyword)',
          'user.email (keyword)',
          'host.name (keyword)',
        ]),
      })
    );
    expect(present).toEqual(new Set(['user.name', 'user.email', 'host.name']));
  });

  it('ignores fields that are not in the identity vocabulary', () => {
    const present = deriveEntityFieldPresenceFromDatasetAnalysis(
      makeFeature({
        stream_name: 'logs.app',
        properties: datasetAnalysisProps(['message (keyword)', 'not.an.identity.field (keyword)']),
      })
    );
    expect(present.size).toBe(0);
  });

  it('excludes identity fields mapped only as text or unmapped (unsafe types)', () => {
    const present = deriveEntityFieldPresenceFromDatasetAnalysis(
      makeFeature({
        stream_name: 'logs.app',
        properties: datasetAnalysisProps(['user.name (text)', 'user.email (unmapped - no type)']),
      })
    );
    expect(present.size).toBe(0);
  });

  it('includes a multi-typed identity field when one of its types is keyword', () => {
    const present = deriveEntityFieldPresenceFromDatasetAnalysis(
      makeFeature({
        stream_name: 'logs.app',
        properties: datasetAnalysisProps(['user.name (text, keyword)']),
      })
    );
    expect(present).toEqual(new Set(['user.name']));
  });

  it('returns an empty set when the feature has no analysis fields', () => {
    const present = deriveEntityFieldPresenceFromDatasetAnalysis(
      makeFeature({ stream_name: 'logs.noise', properties: {} })
    );
    expect(present.size).toBe(0);
  });
});

describe('loadPerTypeSourceIndices', () => {
  it('lists dataset_analysis features without a confidence-floor argument', async () => {
    const reader = makeReader([]);
    await loadPerTypeSourceIndices(reader, logger);
    expect(reader.listDatasetAnalysisFeatures).toHaveBeenCalledWith();
  });

  it('qualifies a stream for every entity type whose keyword identity fields it carries', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.okta',
        properties: datasetAnalysisProps(['user.name (keyword)', 'host.id (keyword)']),
      }),
      makeFeature({
        stream_name: 'logs.apm',
        properties: datasetAnalysisProps(['service.name (keyword)']),
      }),
    ]);

    const { sources } = await loadPerTypeSourceIndices(reader, logger);

    expect(sources.user).toEqual(['logs.okta']);
    expect(sources.host).toEqual(['logs.okta']);
    expect(sources.service).toEqual(['logs.apm']);
    expect(sources.generic).toEqual([]);
  });

  it('does not qualify a stream whose identity fields are all unsafe types', async () => {
    const reader = makeReader([
      makeFeature({
        stream_name: 'logs.text',
        properties: datasetAnalysisProps(['user.name (text)', 'host.name (unmapped - no type)']),
      }),
    ]);

    const { sources, provenance } = await loadPerTypeSourceIndices(reader, logger);

    expect(sources).toEqual({ user: [], host: [], service: [], generic: [] });
    expect(provenance).toEqual([]);
  });

  it('returns empty sources when there are zero dataset_analysis features', async () => {
    const reader = makeReader([]);
    const { sources, provenance } = await loadPerTypeSourceIndices(reader, logger);
    expect(sources).toEqual({ user: [], host: [], service: [], generic: [] });
    expect(provenance).toEqual([]);
  });

  it('skips streams that resolve to no index patterns (deleted / inaccessible)', async () => {
    const reader = makeReader(
      [
        makeFeature({
          stream_name: 'logs.gone',
          properties: datasetAnalysisProps(['user.name (keyword)']),
        }),
      ],
      () => [] // resolveIndexPatterns returns nothing
    );
    const { sources, provenance } = await loadPerTypeSourceIndices(reader, logger);
    expect(sources.user).toEqual([]);
    expect(provenance).toEqual([]);
  });

  it('dedupes patterns across streams and records provenance with matched fields', async () => {
    const reader = makeReader(
      [
        makeFeature({
          stream_name: 'logs.dup-a',
          properties: datasetAnalysisProps(['user.name (keyword)', 'user.email (keyword)']),
        }),
        makeFeature({
          stream_name: 'logs.dup-b',
          properties: datasetAnalysisProps(['user.id (keyword)']),
        }),
      ],
      () => ['shared-user-index-*'] // both streams resolve to the same pattern
    );

    const { sources, provenance } = await loadPerTypeSourceIndices(reader, logger);

    expect(sources.user).toEqual(['shared-user-index-*']);
    expect(provenance).toHaveLength(2);
    expect(provenance[0]).toMatchObject({
      entityType: 'user',
      streamName: 'logs.dup-a',
      matchedFields: ['user.email', 'user.name'],
    });
  });
});
