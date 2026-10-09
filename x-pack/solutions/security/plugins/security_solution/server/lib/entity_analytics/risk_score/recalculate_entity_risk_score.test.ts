/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../common/entity_analytics/types';
import { recalculateEntityRiskScore } from './recalculate_entity_risk_score';
import type { RiskEngineDataWriter } from './risk_engine_data_writer';

const mockGetConfiguration = jest.fn();
const mockScoreBaseEntities = jest.fn();
const mockPersistZeroBaseScore = jest.fn();
const mockRunResolutionScoringStep = jest.fn();

jest.mock('../risk_engine/utils/saved_object_configuration', () => ({
  getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
}));

jest.mock('./get_risk_inputs_index', () => ({
  getRiskInputsIndex: async () => ({ index: '.alerts-security.alerts-default' }),
}));

jest.mock('./maintainer/steps/build_alert_filters', () => ({
  buildAlertFilters: () => [],
}));

jest.mock('./maintainer/lookup/lookup_index', () => ({
  getLookupIndexName: () => '.risk-score-lookup-default',
}));

jest.mock('./maintainer/utils/fetch_watchlist_configs', () => ({
  fetchWatchlistConfigs: async () => new Map(),
}));

jest.mock('./maintainer/steps/score_base_entities', () => ({
  scoreBaseEntities: (...args: unknown[]) => mockScoreBaseEntities(...args),
  persistZeroBaseScore: (...args: unknown[]) => mockPersistZeroBaseScore(...args),
}));

jest.mock('./maintainer/steps/run_resolution_scoring_step', () => ({
  runResolutionScoringStep: (...args: unknown[]) => mockRunResolutionScoringStep(...args),
}));

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    dsl: {
      getEuidFilterBasedOnDocument: () => ({ term: { 'user.name': 'alice' } }),
    },
  },
}));

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
    jest.clearAllMocks();
    crudClient = { listEntities: jest.fn() } as unknown as EntityStoreCRUDClient;
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
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity(70)] });

    await run();

    expect(mockPersistZeroBaseScore).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: ENTITY_ID, entityType: EntityType.user })
    );
  });

  it('writes no zero base score for an entity that has never been scored', async () => {
    // Writing one would put a score of 0 on screen for an entity that had none.
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity()] });

    await run();

    expect(mockPersistZeroBaseScore).not.toHaveBeenCalled();
  });

  it('writes no zero base score when base scoring produced one', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity(70)] });
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
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity(70)] });
    mockScoreBaseEntities.mockResolvedValue({
      scores: {},
      scoresCalculated: 1,
      scoresWrittenRiskIndex: 0,
    });

    await run();

    expect(mockPersistZeroBaseScore).not.toHaveBeenCalled();
  });

  it('throws when the entity is not in the store', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [] });

    await expect(run()).rejects.toThrow(`Entity not found in store: ${ENTITY_ID}`);
    expect(mockScoreBaseEntities).not.toHaveBeenCalled();
  });
});
