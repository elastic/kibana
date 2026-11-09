/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { createRiskScoreMaintainer, type RiskScoreMaintainerDeps } from './risk_score_maintainer';
import { RiskScoreDataClient } from '../risk_score_data_client';
import { getConfiguration } from '../../risk_engine/utils/saved_object_configuration';
import { getIsIdBasedRiskScoringEnabled } from '../is_id_based_risk_scoring_enabled';
import { scoreBaseEntities } from './steps/score_base_entities';
import { runResolutionScoringStep } from './steps/run_resolution_scoring_step';
import { resetToZero } from './steps/reset_to_zero';
import { buildLookupIndex } from './steps/build_lookup_index';
import { fetchWatchlistConfigs } from './utils/fetch_watchlist_configs';
import { ensureLookupIndex } from './lookup/lookup_index';
import { pruneLookupIndex } from './lookup/prune_lookup_index';

jest.mock('../risk_score_data_client');
jest.mock('../../risk_engine/utils/saved_object_configuration');
jest.mock('../tasks/helpers');
jest.mock('../is_id_based_risk_scoring_enabled');
jest.mock('./steps/score_base_entities');
jest.mock('./steps/run_resolution_scoring_step');
jest.mock('./steps/reset_to_zero');
jest.mock('./steps/build_lookup_index');
jest.mock('./steps/build_alert_filters', () => ({ buildAlertFilters: jest.fn(() => []) }));
jest.mock('./utils/fetch_watchlist_configs');
jest.mock('./lookup/lookup_index');
jest.mock('./lookup/prune_lookup_index');
jest.mock('./risk_score_distribution', () => ({
  getRiskScoreBaseDistribution: jest.fn().mockResolvedValue(undefined),
  getRiskScoreResolutionDistribution: jest.fn().mockResolvedValue(undefined),
}));

const entityStoreIndex = '.entities.v2.latest.security_default';

describe('createRiskScoreMaintainer run', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const callOrder: string[] = [];
  let crudClient: { latestIndexName: jest.Mock };
  let abortController: AbortController;

  const summary = {
    pagesProcessed: 2,
    scoresWrittenRiskIndex: 2,
    scoresWrittenEntityStore: 2,
    scoresCalculated: 2,
    scoresDroppedNotInStore: 0,
    scoresMissingFromStore: 0,
    scoresFailed: 0,
    scores: {},
    entitiesCreated: 0,
    entityCreationsSkipped: 0,
    entityCreationsFailed: 0,
  };

  const runMaintainer = async () => {
    const getStartServices = jest.fn().mockResolvedValue([
      {
        elasticsearch: { client: { asInternalUser: esClient } },
        uiSettings: { asScopedToClient: jest.fn() },
      },
      {
        licensing: { getLicense: jest.fn().mockResolvedValue({ hasAtLeast: () => true }) },
      },
    ]);
    const deps = {
      getStartServices,
      entityAnalyticsConfig: {},
      experimentalFeatures: {},
      kibanaVersion: '9.6.0',
      logger,
      auditLogger: undefined,
      productFeaturesService: { isEnabled: jest.fn().mockReturnValue(true) },
      telemetry: { reportEvent: jest.fn() } as unknown as AnalyticsServiceSetup,
    } as unknown as RiskScoreMaintainerDeps;

    const maintainer = createRiskScoreMaintainer(deps);
    await maintainer.run({
      status: { metadata: { namespace: 'default' }, state: {} },
      crudClient,
      signal: abortController.signal,
      telemetry: { report: jest.fn() },
      setCustomTaskRunEventFields: jest.fn(),
    } as unknown as Parameters<typeof maintainer.run>[0]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    abortController = new AbortController();
    crudClient = { latestIndexName: jest.fn().mockResolvedValue(entityStoreIndex) };

    jest.mocked(RiskScoreDataClient).mockImplementation(
      () =>
        ({
          init: jest.fn(),
          getRiskInputsIndex: jest.fn().mockResolvedValue({ index: '.alerts-default' }),
          getWriter: jest.fn().mockResolvedValue({}),
        } as unknown as RiskScoreDataClient)
    );
    jest.mocked(getConfiguration).mockResolvedValue({
      identifierType: 'host',
      dataViewId: 'security-solution-default',
    } as Awaited<ReturnType<typeof getConfiguration>>);
    jest.mocked(getIsIdBasedRiskScoringEnabled).mockResolvedValue(true);
    jest.mocked(fetchWatchlistConfigs).mockResolvedValue(new Map());
    jest.mocked(ensureLookupIndex).mockResolvedValue('lookup-index');
    jest.mocked(pruneLookupIndex).mockResolvedValue(0);
    jest.mocked(buildLookupIndex).mockResolvedValue({
      lookupRowsWritten: 0,
      entitiesIterated: 0,
      pagesProcessed: 0,
      bulkBatches: 0,
      lookupRowsFailed: 0,
    } as Awaited<ReturnType<typeof buildLookupIndex>>);
    jest.mocked(scoreBaseEntities).mockResolvedValue(summary);
    jest.mocked(runResolutionScoringStep).mockResolvedValue({
      ...summary,
      skippedReason: undefined,
    } as Awaited<ReturnType<typeof runResolutionScoringStep>>);
    jest.mocked(resetToZero).mockImplementation(async () => {
      callOrder.push('resetToZero');
      return {
        scoresWrittenRiskIndex: 0,
        scoresWrittenEntityStore: 0,
        scoresFailed: 0,
        pagesProcessed: 0,
        resetBatchLimitHit: false,
      } as Awaited<ReturnType<typeof resetToZero>>;
    });
    esClient.indices.exists.mockResolvedValue(true);
    esClient.indices.refresh.mockImplementation((async ({ index }: { index: string }) => {
      callOrder.push(`refresh:${index}`);
      return {};
    }) as unknown as typeof esClient.indices.refresh);
  });

  it('does not wait for entity store refreshes on base and resolution writes', async () => {
    await runMaintainer();

    expect(scoreBaseEntities).toHaveBeenCalledWith(
      expect.objectContaining({ entityStoreRefresh: false })
    );
    expect(runResolutionScoringStep).toHaveBeenCalledWith(
      expect.objectContaining({ entityStoreRefresh: false })
    );
  });

  it('refreshes the entity store once, before reset-to-zero', async () => {
    await runMaintainer();

    const entityStoreRefreshes = callOrder.filter((call) => call === `refresh:${entityStoreIndex}`);
    expect(entityStoreRefreshes).toHaveLength(1);
    expect(callOrder.indexOf(`refresh:${entityStoreIndex}`)).toBeLessThan(
      callOrder.indexOf('resetToZero')
    );
  });

  it('does not wait for a refresh on reset-to-zero writes', async () => {
    await runMaintainer();

    expect(jest.mocked(resetToZero).mock.calls[0][0]).not.toHaveProperty('entityStoreRefresh');
  });

  it('still reaches reset-to-zero when the entity store refresh fails', async () => {
    esClient.indices.refresh.mockImplementation((async ({ index }: { index: string }) => {
      if (index === entityStoreIndex) throw new Error('refresh failed');
      return {};
    }) as unknown as typeof esClient.indices.refresh);

    await runMaintainer();

    expect(resetToZero).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to refresh the entity store after scoring'),
      expect.anything()
    );
  });

  it('skips the entity store refresh when the run is aborted after the base stage', async () => {
    jest.mocked(scoreBaseEntities).mockImplementation(async () => {
      abortController.abort();
      return summary;
    });

    await runMaintainer();

    expect(esClient.indices.refresh).not.toHaveBeenCalledWith({ index: entityStoreIndex });
    expect(resetToZero).not.toHaveBeenCalled();
  });
});
