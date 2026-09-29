/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../common/entity_analytics/types';
import { recalculateEntityRiskScore } from './recalculate_entity_risk_score';
import type { RiskEngineDataWriter } from './risk_engine_data_writer';

const mockGetConfiguration = vi.fn();
const mockScoreBaseEntities = vi.fn();
const mockPersistZeroBaseScore = vi.fn();
const mockRunResolutionScoringStep = vi.fn();

vi.mock('../risk_engine/utils/saved_object_configuration', () => {
      const mocked = {
      getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./get_risk_inputs_index', () => {
      const mocked = {
      getRiskInputsIndex: async () => ({ index: '.alerts-security.alerts-default' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./maintainer/steps/build_alert_filters', () => {
      const mocked = {
      buildAlertFilters: () => [],
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./maintainer/lookup/lookup_index', () => {
      const mocked = {
      getLookupIndexName: () => '.risk-score-lookup-default',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./maintainer/utils/fetch_watchlist_configs', () => {
      const mocked = {
      fetchWatchlistConfigs: async () => new Map(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./maintainer/steps/score_base_entities', () => {
      const mocked = {
      scoreBaseEntities: (...args: unknown[]) => mockScoreBaseEntities(...args),
      persistZeroBaseScore: (...args: unknown[]) => mockPersistZeroBaseScore(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./maintainer/steps/run_resolution_scoring_step', () => {
      const mocked = {
      runResolutionScoringStep: (...args: unknown[]) => mockRunResolutionScoringStep(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/entity-store/common/euid_helpers', () => {
      const mocked = {
      euid: {
        dsl: {
          getEuidFilterBasedOnDocument: () => ({ term: { 'user.name': 'alice' } }),
        },
      },
    };
      return { ...mocked, default: mocked };
    });

const ENTITY_ID = 'user:alice@okta';

/** Entity store record, optionally already carrying a base risk score. */
const storeEntity = (scoreNorm?: number) => ({
  entity: {
    id: ENTITY_ID,
    ...(scoreNorm !== undefined ? { risk: { calculated_score_norm: scoreNorm } } : {}),
  },
  asset: { criticality: 'extreme_impact' },
});

describe('recalculateEntityRiskScore', () => {
  let crudClient: EntityStoreCRUDClient;
  let writer: RiskEngineDataWriter;

  const run = () =>
    recalculateEntityRiskScore({
      esClient: elasticsearchServiceMock.createScopedClusterClient().asCurrentUser,
      soClient: savedObjectsClientMock.create(),
      crudClient,
      namespace: 'default',
      entityId: ENTITY_ID,
      identifierType: EntityType.user,
      getWriter: async () => writer,
      idBasedRiskScoringEnabled: true,
      logger: loggingSystemMock.createLogger(),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    crudClient = { listEntities: vi.fn() } as unknown as EntityStoreCRUDClient;
    writer = {} as RiskEngineDataWriter;
    mockGetConfiguration.mockResolvedValue({ dataViewId: 'security-dv', pageSize: 100 });
    mockScoreBaseEntities.mockResolvedValue({
      scores: {},
      scoresCalculated: 0,
      scoresWrittenRiskIndex: 0,
    });
    mockPersistZeroBaseScore.mockResolvedValue(1);
    mockRunResolutionScoringStep.mockResolvedValue({ scores: {} });
  });

  // Fix for https://github.com/elastic/kibana/issues/280414. Base scoring calculates nothing for
  // an entity with no alert in the engine's range, which left the previous score in place with the
  // criticality it was written with.
  it('writes a zero base score when base scoring calculated nothing for an already scored entity', async () => {
    (crudClient.listEntities as Mock).mockResolvedValue({ entities: [storeEntity(70)] });

    await run();

    expect(mockPersistZeroBaseScore).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: ENTITY_ID, entityType: EntityType.user })
    );
  });

  it('writes no zero base score for an entity that has never been scored', async () => {
    // Writing one would put a score of 0 on screen for an entity that had none.
    (crudClient.listEntities as Mock).mockResolvedValue({ entities: [storeEntity()] });

    await run();

    expect(mockPersistZeroBaseScore).not.toHaveBeenCalled();
  });

  it('writes no zero base score when base scoring produced one', async () => {
    (crudClient.listEntities as Mock).mockResolvedValue({ entities: [storeEntity(70)] });
    mockScoreBaseEntities.mockResolvedValue({
      scores: { [ENTITY_ID]: 42 },
      scoresCalculated: 1,
      scoresWrittenRiskIndex: 1,
    });

    await run();

    expect(mockPersistZeroBaseScore).not.toHaveBeenCalled();
  });

  it('writes no zero base score when a score was calculated but the write failed', async () => {
    // Zeroing here would drop the score of an entity that does have alerts.
    (crudClient.listEntities as Mock).mockResolvedValue({ entities: [storeEntity(70)] });
    mockScoreBaseEntities.mockResolvedValue({
      scores: {},
      scoresCalculated: 1,
      scoresWrittenRiskIndex: 0,
    });

    await run();

    expect(mockPersistZeroBaseScore).not.toHaveBeenCalled();
  });

  it('throws when the entity is not in the store', async () => {
    (crudClient.listEntities as Mock).mockResolvedValue({ entities: [] });

    await expect(run()).rejects.toThrow(`Entity not found in store: ${ENTITY_ID}`);
    expect(mockScoreBaseEntities).not.toHaveBeenCalled();
  });
});
