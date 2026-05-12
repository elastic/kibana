/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EntityStoreGlobalState,
  KI_AGGREGATION_GROUP_CAP_DEFAULT,
  KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
  KI_PROMOTED_ENTITY_TYPES_DEFAULT,
  KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
  KnowledgeIndicatorsConfig,
} from './constants';

const KI_DEFAULTS = {
  entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
  aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
  promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
  promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
};

describe('KnowledgeIndicatorsConfig', () => {
  it('applies platform defaults when both fields are missing', () => {
    expect(KnowledgeIndicatorsConfig.parse({})).toEqual(KI_DEFAULTS);
  });

  it('preserves explicit overrides for both fields', () => {
    expect(
      KnowledgeIndicatorsConfig.parse({ entityMinConfidence: 70, aggregationGroupCap: 50 })
    ).toEqual({
      ...KI_DEFAULTS,
      entityMinConfidence: 70,
      aggregationGroupCap: 50,
    });
  });

  it('keeps default for the missing field when only one is provided', () => {
    expect(KnowledgeIndicatorsConfig.parse({ entityMinConfidence: 80 })).toEqual({
      ...KI_DEFAULTS,
      entityMinConfidence: 80,
    });
    expect(KnowledgeIndicatorsConfig.parse({ aggregationGroupCap: 10 })).toEqual({
      ...KI_DEFAULTS,
      aggregationGroupCap: 10,
    });
  });

  it('rejects entityMinConfidence outside [0, 100]', () => {
    expect(() => KnowledgeIndicatorsConfig.parse({ entityMinConfidence: -1 })).toThrow();
    expect(() => KnowledgeIndicatorsConfig.parse({ entityMinConfidence: 101 })).toThrow();
  });

  it('rejects entityMinConfidence that is not an integer', () => {
    expect(() => KnowledgeIndicatorsConfig.parse({ entityMinConfidence: 70.5 })).toThrow();
  });

  it('rejects aggregationGroupCap below 1', () => {
    expect(() => KnowledgeIndicatorsConfig.parse({ aggregationGroupCap: 0 })).toThrow();
    expect(() => KnowledgeIndicatorsConfig.parse({ aggregationGroupCap: -5 })).toThrow();
  });

  it('rejects aggregationGroupCap that is not an integer', () => {
    expect(() => KnowledgeIndicatorsConfig.parse({ aggregationGroupCap: 1.5 })).toThrow();
  });
});

describe('EntityStoreGlobalState', () => {
  it('parses successfully with all blocks present and applies defaults inside knowledgeIndicators', () => {
    const result = EntityStoreGlobalState.parse({
      historySnapshot: {},
      logsExtraction: {},
      knowledgeIndicators: {},
    });

    expect(result.knowledgeIndicators).toEqual(KI_DEFAULTS);
  });

  it('rejects state that is missing the knowledgeIndicators block entirely (the block is required, but its inner fields default)', () => {
    // Once V2 ships, all in-memory state objects must carry the block. The
    // V2 SO migration backfills it for at-rest documents; this guard makes
    // sure code paths that construct state in memory do not silently drop
    // the block.
    expect(() =>
      EntityStoreGlobalState.parse({ historySnapshot: {}, logsExtraction: {} })
    ).toThrow();
  });
});

describe('KnowledgeIndicatorsConfig promotion knobs', () => {
  it('preserves an explicit non-null promoteToTypedThreshold', () => {
    const result = KnowledgeIndicatorsConfig.parse({ promoteToTypedThreshold: 95 });
    expect(result.promoteToTypedThreshold).toBe(95);
  });

  it('accepts null as a valid value for promoteToTypedThreshold', () => {
    expect(
      KnowledgeIndicatorsConfig.parse({ promoteToTypedThreshold: null }).promoteToTypedThreshold
    ).toBeNull();
  });

  it('rejects out-of-range promoteToTypedThreshold values', () => {
    expect(() => KnowledgeIndicatorsConfig.parse({ promoteToTypedThreshold: -1 })).toThrow();
    expect(() => KnowledgeIndicatorsConfig.parse({ promoteToTypedThreshold: 101 })).toThrow();
  });

  it('rejects non-integer promoteToTypedThreshold values', () => {
    expect(() => KnowledgeIndicatorsConfig.parse({ promoteToTypedThreshold: 90.5 })).toThrow();
  });

  it('accepts host and service in promotedEntityTypes', () => {
    expect(
      KnowledgeIndicatorsConfig.parse({ promotedEntityTypes: ['host', 'service'] })
        .promotedEntityTypes
    ).toEqual(['host', 'service']);
  });

  it('rejects entries outside the host/service enum (the user tier is intentionally deferred)', () => {
    expect(() =>
      KnowledgeIndicatorsConfig.parse({ promotedEntityTypes: ['user'] })
    ).toThrow();
    expect(() =>
      KnowledgeIndicatorsConfig.parse({ promotedEntityTypes: ['service', 'something-else'] })
    ).toThrow();
  });

  it('accepts an empty promotedEntityTypes array (treated as off)', () => {
    expect(
      KnowledgeIndicatorsConfig.parse({ promotedEntityTypes: [] }).promotedEntityTypes
    ).toEqual([]);
  });
});
