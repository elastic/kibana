/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import { loggerMock } from '@kbn/logging-mocks';
import {
  buildKnownFeatureIds,
  buildTelemetry,
  identifyInferredFeatures,
  selectPreviouslyIdentifiedFeatures,
} from './identify_inferred_features';

const createFeature = ({ id, ...overrides }: Partial<Feature> & Pick<Feature, 'id'>): Feature => ({
  id,
  uuid: `uuid-${overrides.type ?? 'technology'}-${id}`,
  source_id: 'logs.test',
  type: 'technology',
  subtype: 'library',
  title: id,
  description: `${id} description`,
  properties: { name: id },
  confidence: 80,
  ...overrides,
});

describe('selectPreviouslyIdentifiedFeatures', () => {
  it('fills the detailed prompt window round-robin across feature types', () => {
    const entities = Array.from({ length: 142 }, (_, index) =>
      createFeature({
        id: `entity-${String(index).padStart(3, '0')}`,
        type: 'entity',
        confidence: 100 - index / 1000,
      })
    );
    const technologies = Array.from({ length: 300 }, (_, index) =>
      createFeature({
        id: `technology-${String(index).padStart(3, '0')}`,
        type: 'technology',
        confidence: 100 - index / 1000,
      })
    );

    const selected = selectPreviouslyIdentifiedFeatures(
      [...technologies].reverse().concat([...entities].reverse()),
      100
    );

    expect(selected).toHaveLength(100);
    expect(selected.filter((feature) => feature.type === 'entity')).toHaveLength(50);
    expect(selected.filter((feature) => feature.type === 'technology')).toHaveLength(50);
    expect(selected.slice(0, 4).map(({ type, id }) => ({ type, id }))).toEqual([
      { type: 'entity', id: 'entity-000' },
      { type: 'technology', id: 'technology-000' },
      { type: 'entity', id: 'entity-001' },
      { type: 'technology', id: 'technology-001' },
    ]);
    expect(
      selectPreviouslyIdentifiedFeatures(
        [...technologies].reverse().concat([...entities].reverse()),
        100
      ).map((feature) => feature.id)
    ).toEqual(selected.map((feature) => feature.id));
  });

  it('keeps filling the window after one feature type is exhausted', () => {
    const features = [
      createFeature({ id: 'entity', type: 'entity' }),
      createFeature({ id: 'technology-1', type: 'technology', confidence: 90 }),
      createFeature({ id: 'technology-2', type: 'technology', confidence: 80 }),
    ];

    expect(selectPreviouslyIdentifiedFeatures(features, 3).map(({ id }) => id)).toEqual([
      'entity',
      'technology-1',
      'technology-2',
    ]);
  });
});

describe('buildKnownFeatureIds', () => {
  it('formats a stable, grouped inventory of every known id', () => {
    const features = [
      createFeature({ id: ' Kafka ', type: 'technology' }),
      createFeature({ id: 'checkout-api', type: 'entity' }),
      createFeature({ id: 'log4j', type: 'technology' }),
      createFeature({ id: 'kafka', type: 'technology' }),
    ];

    const result = buildKnownFeatureIds(features);
    expect(result.text).toBe(['entity: checkout-api', 'technology: kafka, log4j'].join('\n'));
    expect(result.droppedCount).toBe(0);
  });

  it('drops the stalest ids once the character budget is exhausted', () => {
    const features = [
      { ...createFeature({ id: 'stale-tech' }), updated_at: '2026-01-01T00:00:00.000Z' },
      { ...createFeature({ id: 'fresh-tech' }), updated_at: '2026-03-01T00:00:00.000Z' },
      { ...createFeature({ id: 'newer-tech' }), updated_at: '2026-02-01T00:00:00.000Z' },
    ];

    // Enough budget for "technology: fresh-tech, newer-tech" but not the third id.
    const result = buildKnownFeatureIds(features, 36);
    expect(result.text).toBe('technology: fresh-tech, newer-tech');
    expect(result.droppedCount).toBe(1);
  });
});

describe('buildTelemetry', () => {
  const context = {
    workflow_execution_id: 'workflow-1',
    run_id: 'run-1',
    connector_id: 'connector-1',
    iteration: 1,
    source_id: 'logs.test',
    docs_count: 20,
    excluded_features_count: 2,
    total_filters: 5,
    filters_capped: false,
    has_filtered_documents: true,
  };

  it.each(['failure', 'canceled'] as const)(
    'zero-fills deduplication counters when %s',
    (state) => {
      expect(buildTelemetry(context, 100, { state })).toEqual(
        expect.objectContaining({
          workflow_execution_id: context.workflow_execution_id,
          state,
          features_remapped: 0,
        })
      );
    }
  );

  it('includes deduplication counters on success', () => {
    expect(
      buildTelemetry(context, 100, {
        state: 'success',
        tokensUsed: { prompt: 10, completion: 5, total: 15 },
        newCount: 2,
        updatedCount: 3,
        llmIgnoredCount: 1,
        codeIgnoredCount: 1,
        remappedCount: 2,
      })
    ).toEqual(
      expect.objectContaining({
        features_remapped: 2,
      })
    );
  });
});

describe('identifyInferredFeatures', () => {
  it('records a failed iteration, and writes nothing, when the agent step stored no conversation', async () => {
    const kiClient = {
      getFeatures: jest.fn().mockResolvedValue({ hits: [] }),
      getExcludedFeatures: jest.fn().mockResolvedValue({ hits: [] }),
      bulk: jest.fn(),
      getDefaultExpiresAt: jest.fn(),
    };
    const trackFeaturesIdentified = jest.fn();

    const result = await identifyInferredFeatures({
      kiClient,
      agentConversation: undefined,
      connectorId: 'connector-1',
      logger: loggerMock.create(),
      sourceId: 'logs.test',
      runId: 'run-1',
      documents: [{ _id: 'doc-1', fields: { message: 'hello' } }],
      totalFilters: 0,
      filtersCapped: false,
      hasFilteredDocuments: false,
      trackFeaturesIdentified,
    } as unknown as Parameters<typeof identifyInferredFeatures>[0]);

    expect(result.iterationResult).toMatchObject({ runId: 'run-1', state: 'failure' });
    expect(kiClient.bulk).not.toHaveBeenCalled();
    expect(trackFeaturesIdentified).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'failure', run_id: 'run-1' })
    );
  });

  it('keeps the stored agent round time and tokens in a failed iteration when the agent never finalized', async () => {
    const kiClient = {
      getFeatures: jest.fn().mockResolvedValue({ hits: [] }),
      getExcludedFeatures: jest.fn().mockResolvedValue({ hits: [] }),
      bulk: jest.fn(),
      getDefaultExpiresAt: jest.fn(),
    };
    const trackFeaturesIdentified = jest.fn();

    const result = await identifyInferredFeatures({
      kiClient,
      agentConversation: {
        rounds: [
          {
            steps: [],
            time_to_last_token: 240_000,
            model_usage: { input_tokens: 900, output_tokens: 300 },
          },
        ],
      },
      connectorId: 'connector-1',
      logger: loggerMock.create(),
      sourceId: 'logs.test',
      runId: 'run-1',
      documents: [{ _id: 'doc-1', fields: { message: 'hello' } }],
      totalFilters: 0,
      filtersCapped: false,
      hasFilteredDocuments: false,
      trackFeaturesIdentified,
    } as unknown as Parameters<typeof identifyInferredFeatures>[0]);

    expect(trackFeaturesIdentified).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'failure', duration_ms: expect.any(Number) })
    );
    expect(trackFeaturesIdentified.mock.calls[0][0].duration_ms).toBeGreaterThanOrEqual(240_000);
    expect(result.iterationResult).toMatchObject({
      state: 'failure',
      tokensUsed: { prompt: 900, completion: 300, total: 1200, cached: 0 },
    });
  });
});
