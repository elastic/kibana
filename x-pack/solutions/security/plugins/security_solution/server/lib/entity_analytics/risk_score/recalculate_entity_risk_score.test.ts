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
const mockRunResolutionScoringStep = jest.fn();

jest.mock('../risk_engine/utils/saved_object_configuration', () => ({
  getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
}));

jest.mock('./get_risk_inputs_index', () => ({
  getRiskInputsIndex: async () => ({ index: '.alerts-security.alerts-default' }),
}));

const ENGINE_ALERT_FILTER = { term: { 'kibana.alert.workflow_status': 'open' } };
const ENTITY_IDENTITY_FILTER = { term: { 'user.name': 'alice' } };

jest.mock('./maintainer/steps/build_alert_filters', () => ({
  buildAlertFilters: () => [ENGINE_ALERT_FILTER],
}));

jest.mock('./maintainer/lookup/lookup_index', () => ({
  getLookupIndexName: () => '.risk-score-lookup-default',
}));

jest.mock('./maintainer/utils/fetch_watchlist_configs', () => ({
  fetchWatchlistConfigs: async () => new Map(),
}));

jest.mock('./maintainer/steps/score_base_entities', () => ({
  scoreBaseEntities: (...args: unknown[]) => mockScoreBaseEntities(...args),
}));

jest.mock('./maintainer/steps/run_resolution_scoring_step', () => ({
  runResolutionScoringStep: (...args: unknown[]) => mockRunResolutionScoringStep(...args),
}));

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    dsl: {
      getEuidFilterBasedOnDocument: () => ENTITY_IDENTITY_FILTER,
    },
  },
}));

const ENTITY_ID = 'user:alice@okta';

const storeEntity = () => ({
  entity: { id: ENTITY_ID },
  asset: { criticality: 'extreme_impact' },
});

describe('recalculateEntityRiskScore', () => {
  let crudClient: EntityStoreCRUDClient;
  let writer: RiskEngineDataWriter;
  let esClient: ReturnType<
    typeof elasticsearchServiceMock.createScopedClusterClient
  >['asCurrentUser'];

  const run = () =>
    recalculateEntityRiskScore({
      esClient,
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
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.indices.exists.mockResolvedValue(true);
    crudClient = { listEntities: jest.fn() } as unknown as EntityStoreCRUDClient;
    writer = {} as RiskEngineDataWriter;
    mockGetConfiguration.mockResolvedValue({ dataViewId: 'security-dv', pageSize: 100 });
    mockScoreBaseEntities.mockResolvedValue({ scores: {} });
    mockRunResolutionScoringStep.mockResolvedValue({ scores: {} });
  });

  it('scores the resolution group with the engine alert filters but not the entity filter', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity()] });

    await run();

    expect(mockScoreBaseEntities).toHaveBeenCalledWith(
      expect.objectContaining({ alertFilters: [ENGINE_ALERT_FILTER, ENTITY_IDENTITY_FILTER] })
    );
    expect(mockRunResolutionScoringStep).toHaveBeenCalledWith(
      expect.objectContaining({ alertFilters: [ENGINE_ALERT_FILTER] })
    );
  });

  describe('when the alerts index does not exist', () => {
    beforeEach(() => {
      esClient.indices.exists.mockResolvedValue(false);
    });

    it('skips the recalculation and returns no scores', async () => {
      (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity()] });

      const result = await run();

      expect(esClient.indices.exists).toHaveBeenCalledWith({
        index: '.alerts-security.alerts-default',
      });
      expect(mockScoreBaseEntities).not.toHaveBeenCalled();
      expect(mockRunResolutionScoringStep).not.toHaveBeenCalled();
      expect(result).toEqual({ baseScore: undefined, resolutionScore: undefined });
    });
  });

  it('throws when the entity is not in the store', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [] });

    await expect(run()).rejects.toThrow(`Entity not found in store: ${ENTITY_ID}`);
    expect(mockScoreBaseEntities).not.toHaveBeenCalled();
  });
});
