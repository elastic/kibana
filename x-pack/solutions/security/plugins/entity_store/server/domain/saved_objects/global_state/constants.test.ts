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
  KnowledgeIndicatorsConfig,
} from './constants';

describe('KnowledgeIndicatorsConfig', () => {
  it('applies platform defaults when both fields are missing', () => {
    expect(KnowledgeIndicatorsConfig.parse({})).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
    });
  });

  it('preserves explicit overrides for both fields', () => {
    expect(
      KnowledgeIndicatorsConfig.parse({ entityMinConfidence: 70, aggregationGroupCap: 50 })
    ).toEqual({ entityMinConfidence: 70, aggregationGroupCap: 50 });
  });

  it('keeps default for the missing field when only one is provided', () => {
    expect(KnowledgeIndicatorsConfig.parse({ entityMinConfidence: 80 })).toEqual({
      entityMinConfidence: 80,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
    });
    expect(KnowledgeIndicatorsConfig.parse({ aggregationGroupCap: 10 })).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
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

    expect(result.knowledgeIndicators).toEqual({
      entityMinConfidence: KI_ENTITY_MIN_CONFIDENCE_DEFAULT,
      aggregationGroupCap: KI_AGGREGATION_GROUP_CAP_DEFAULT,
    });
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
