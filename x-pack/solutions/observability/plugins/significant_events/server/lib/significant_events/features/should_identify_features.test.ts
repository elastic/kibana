/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPUTED_FEATURE_TYPES, INFERRED_FEATURE_TYPES } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { shouldIdentifyFeatures } from './should_identify_features';

type Timestamp = { '@timestamp': string } | null;

const isInferredCall = (options?: { types?: string[] }) =>
  Boolean(
    options?.types?.some((type) => (INFERRED_FEATURE_TYPES as readonly string[]).includes(type))
  );

/**
 * Mocks `getLatestRevisionTimestamp` so it answers differently for the inferred
 * (existence) probe and the computed (recency) probe.
 */
const createMockKiClient = ({
  inferred = null,
  computed = null,
}: {
  inferred?: Timestamp;
  computed?: Timestamp;
} = {}) =>
  ({
    getLatestRevisionTimestamp: jest
      .fn()
      .mockImplementation((_stream: string, options?: { types?: string[] }) =>
        Promise.resolve(isInferredCall(options) ? inferred : computed)
      ),
  } as unknown as KnowledgeIndicatorClient);

describe('shouldIdentifyFeatures', () => {
  const streamName = 'test-stream';
  const thresholdHours = 12;
  const recent = () => new Date(Date.now() - 1 * 3_600_000).toISOString();

  it('returns shouldIdentify: true when there are no active inferred features', async () => {
    const kiClient = createMockKiClient({ inferred: null, computed: { '@timestamp': recent() } });

    const result = await shouldIdentifyFeatures({ kiClient, streamName, thresholdHours });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('probes inferred features for existence before checking recency', async () => {
    const kiClient = createMockKiClient({ inferred: null });

    await shouldIdentifyFeatures({ kiClient, streamName, thresholdHours });

    expect(kiClient.getLatestRevisionTimestamp).toHaveBeenCalledWith(
      streamName,
      expect.objectContaining({ types: [...INFERRED_FEATURE_TYPES] })
    );
    // Short-circuits on empty inferred set: the computed probe is never issued.
    expect(kiClient.getLatestRevisionTimestamp).toHaveBeenCalledTimes(1);
  });

  it('gates recency on COMPUTED_FEATURE_TYPES once inferred features exist', async () => {
    const kiClient = createMockKiClient({
      inferred: { '@timestamp': recent() },
      computed: { '@timestamp': recent() },
    });

    await shouldIdentifyFeatures({ kiClient, streamName, thresholdHours });

    expect(kiClient.getLatestRevisionTimestamp).toHaveBeenCalledWith(
      streamName,
      expect.objectContaining({ types: [...COMPUTED_FEATURE_TYPES] })
    );
  });

  it('returns shouldIdentify: true when inferred features exist but no computed features do', async () => {
    const kiClient = createMockKiClient({ inferred: { '@timestamp': recent() }, computed: null });

    const result = await shouldIdentifyFeatures({ kiClient, streamName, thresholdHours });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('returns shouldIdentify: false when newest computed feature is within threshold', async () => {
    const kiClient = createMockKiClient({
      inferred: { '@timestamp': recent() },
      computed: { '@timestamp': new Date(Date.now() - 1 * 3_600_000).toISOString() },
    });

    const result = await shouldIdentifyFeatures({ kiClient, streamName, thresholdHours });

    expect(result).toEqual({ shouldIdentify: false });
  });

  it('returns shouldIdentify: true when newest computed feature exceeds threshold', async () => {
    const kiClient = createMockKiClient({
      inferred: { '@timestamp': recent() },
      computed: { '@timestamp': new Date(Date.now() - 24 * 3_600_000).toISOString() },
    });

    const result = await shouldIdentifyFeatures({ kiClient, streamName, thresholdHours });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('returns shouldIdentify: true for invalid computed timestamps', async () => {
    const kiClient = createMockKiClient({
      inferred: { '@timestamp': recent() },
      computed: { '@timestamp': 'not-a-date' },
    });

    const result = await shouldIdentifyFeatures({ kiClient, streamName, thresholdHours });

    expect(result).toEqual({ shouldIdentify: true });
  });

  it('returns shouldIdentify: false at the threshold boundary', async () => {
    const kiClient = createMockKiClient({
      inferred: { '@timestamp': recent() },
      computed: {
        '@timestamp': new Date(Date.now() - thresholdHours * 3_600_000 + 1000).toISOString(),
      },
    });

    const result = await shouldIdentifyFeatures({ kiClient, streamName, thresholdHours });

    expect(result).toEqual({ shouldIdentify: false });
  });
});
