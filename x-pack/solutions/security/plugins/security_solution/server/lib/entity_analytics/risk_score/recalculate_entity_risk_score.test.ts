/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  analyticsServiceMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../common/entity_analytics/types';
import { recalculateEntityRiskScore } from './recalculate_entity_risk_score';
import type {
  PageProfilingOptions,
  PageStepTimings,
} from './maintainer/instrumentation/page_timing_types';
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
  persistZeroBaseScore: (...args: unknown[]) => mockPersistZeroBaseScore(...args),
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
  getBuiltInEntityDefinition: jest.requireActual('@kbn/entity-store/common/euid_helpers')
    .getBuiltInEntityDefinition,
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
  let esClient: ReturnType<
    typeof elasticsearchServiceMock.createScopedClusterClient
  >['asCurrentUser'];

  const telemetry = analyticsServiceMock.createAnalyticsServiceSetup();
  const logger = loggingSystemMock.createLogger();
  const run = (profiling: PageProfilingOptions = { profile: true, profileInterval: 20 }) =>
    recalculateEntityRiskScore({
      esClient,
      soClient: savedObjectsClientMock.create(),
      crudClient,
      namespace: 'default',
      entityId: ENTITY_ID,
      identifierType: EntityType.user,
      getWriter: async () => writer,
      idBasedRiskScoringEnabled: true,
      logger,
      telemetry,
      profiling,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.indices.exists.mockResolvedValue(true);
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

  it.each([true, false])(
    'uses explicit profiling settings and emits stage observations (enabled: %s)',
    async (profile) => {
      (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity()] });
      const observed: PageStepTimings[] = [];
      const sampled: boolean[] = [];
      const observePages = ({ pageTimings }: { pageTimings: PageStepTimings }) => {
        observed.push(pageTimings);
        [1, 2, 3, 4].forEach(() => {
          pageTimings.startPage();
          sampled.push(pageTimings.shouldProfile());
          pageTimings.timeSync(['store', 'write'], () => undefined);
        });
      };
      mockScoreBaseEntities.mockImplementation(async (params) => {
        observePages(params);
        return { scores: {}, scoresCalculated: 1 };
      });
      mockRunResolutionScoringStep.mockImplementation(async (params) => {
        observePages(params);
        return { scores: {} };
      });
      await run({ profile, profileInterval: 3 });
      expect(sampled).toEqual([profile, false, false, profile, profile, false, false, profile]);
      expect(observed[0]).not.toBe(observed[1]);
      expect(
        logger.info.mock.calls.filter(([message]) => message === 'Risk score page timings')
      ).toHaveLength(8);
      expect(telemetry.reportEvent).toHaveBeenCalledTimes(2);
      expect(telemetry.reportEvent.mock.calls.map(([, event]) => event)).toEqual([
        expect.objectContaining({ stage: 'base', status: 'success' }),
        expect.objectContaining({ stage: 'resolution', status: 'success' }),
      ]);
    }
  );

  it('finalizes failed pages and preserves the scoring error', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity()] });
    const failure = new Error('query failed');
    mockScoreBaseEntities.mockImplementation(
      async ({ pageTimings }: { pageTimings: PageStepTimings }) => {
        pageTimings.startPage();
        return pageTimings.time(['esql'], async () => {
          throw failure;
        });
      }
    );
    await expect(run()).rejects.toBe(failure);
    expect(logger.info).toHaveBeenCalledWith(
      'Risk score page timings',
      expect.objectContaining({
        risk_score: expect.objectContaining({
          steps: [expect.objectContaining({ tags: ['esql'], failures: 1 })],
        }),
      })
    );
    expect(telemetry.reportEvent).toHaveBeenCalledWith(
      'risk_score_maintainer_performance',
      expect.objectContaining({ stage: 'base', status: 'error' })
    );
    expect(mockRunResolutionScoringStep).not.toHaveBeenCalled();
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

  it('scores the resolution group with the engine alert filters but not the entity filter', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity(70)] });

    await run();

    expect(mockScoreBaseEntities).toHaveBeenCalledWith(
      expect.objectContaining({ alertFilters: [ENGINE_ALERT_FILTER, ENTITY_IDENTITY_FILTER] })
    );
    expect(mockRunResolutionScoringStep).toHaveBeenCalledWith(
      expect.objectContaining({ alertFilters: [ENGINE_ALERT_FILTER] })
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

  describe('when the alerts index does not exist', () => {
    beforeEach(() => {
      esClient.indices.exists.mockResolvedValue(false);
    });

    it('skips the recalculation and returns no scores', async () => {
      (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [storeEntity(70)] });

      const result = await run();

      expect(esClient.indices.exists).toHaveBeenCalledWith({
        index: '.alerts-security.alerts-default',
      });
      expect(mockScoreBaseEntities).not.toHaveBeenCalled();
      expect(mockPersistZeroBaseScore).not.toHaveBeenCalled();
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
