/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { checkEntityStoreIndexPrivileges } from '@kbn/entity-store/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { RISK_SCORE_ENTITY_CALCULATION_V2_URL } from '../../../../../common/constants';
import { RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES } from '../../../../../common/entity_analytics/risk_engine';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../detection_engine/routes/__mocks__/request_context';
import { configMock } from '../../../../config.mock';
import { getRiskInputsIndex } from '../get_risk_inputs_index';
import { riskScoreEntityCalculationRouteV2 } from './entity_calculation_v2';
import { riskEnginePrivilegesMock } from '../../risk_engine/routes/risk_engine_privileges.mock';
import { getLookupIndexName } from '../maintainer/lookup/lookup_index';
import { getConfiguration } from '../../risk_engine/utils/saved_object_configuration';
import { scoreBaseEntities } from '../maintainer/steps/score_base_entities';
import { runResolutionScoringStep } from '../maintainer/steps/run_resolution_scoring_step';
import { fetchWatchlistConfigs } from '../maintainer/utils/fetch_watchlist_configs';
import { getIsIdBasedRiskScoringEnabled } from '../is_id_based_risk_scoring_enabled';
import { buildAlertFilters } from '../maintainer/steps/build_alert_filters';

const entityId = 'host:test-host-name';

jest.mock('@kbn/entity-store/server', () => ({
  checkEntityStoreIndexPrivileges: jest.fn(),
}));

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    dsl: {
      getEuidFilterBasedOnDocument: jest.fn().mockReturnValue({ term: { 'entity.id': entityId } }),
    },
  },
  getBuiltInEntityDefinition: jest.requireActual('@kbn/entity-store/common/euid_helpers')
    .getBuiltInEntityDefinition,
}));
jest.mock('../get_risk_inputs_index');
jest.mock('../../risk_engine/utils/saved_object_configuration');
jest.mock('../maintainer/steps/score_base_entities');
jest.mock('../maintainer/steps/run_resolution_scoring_step');
jest.mock('../maintainer/utils/fetch_watchlist_configs');
jest.mock('../is_id_based_risk_scoring_enabled');
jest.mock('../maintainer/steps/build_alert_filters');

const defaultEngineConfig = {
  dataViewId: 'default-dataview-id',
  pageSize: 1000,
  alertSampleSizePerShard: 10_000,
};

const entityDocMock = {
  entity: {
    id: entityId,
    relationships: { resolution: { resolved_to: 'host:canonical-entity-id' } },
  },
};

describe('entity risk score V2 calculation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;
  let logger: ReturnType<typeof loggerMock.create>;
  let getStartServicesMock: jest.Mock;
  let mockCrudClient: jest.Mocked<EntityStoreCRUDClient>;

  const defaultBody = {
    identifier: 'test-host-name',
    identifier_type: 'host',
    entity_id: entityId,
  };

  beforeEach(() => {
    (checkEntityStoreIndexPrivileges as jest.Mock).mockResolvedValue({
      has_read_permissions: true,
      has_write_permissions: true,
    });

    server = serverMock.create();
    logger = loggerMock.create();
    ({ clients, context } = requestContextMock.createTools());

    context.securitySolution.getConfig.mockReturnValue(
      configMock.withExperimentalFeature(clients.config, 'entityAnalyticsEntityStoreV2')
    );

    mockCrudClient = {
      listEntities: jest.fn().mockResolvedValue({ entities: [entityDocMock] }),
    } as unknown as jest.Mocked<EntityStoreCRUDClient>;
    context.securitySolution.getEntityStoreUpdateClient.mockReturnValue(mockCrudClient);
    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
      },
    ]);

    (getConfiguration as jest.Mock).mockResolvedValue(defaultEngineConfig);
    (getRiskInputsIndex as jest.Mock).mockResolvedValue({ index: 'default-alerts-index' });
    (buildAlertFilters as jest.Mock).mockReturnValue([]);
    (fetchWatchlistConfigs as jest.Mock).mockResolvedValue(new Map());
    (getIsIdBasedRiskScoringEnabled as jest.Mock).mockResolvedValue(false);
    (scoreBaseEntities as jest.Mock).mockResolvedValue({ scores: {}, scoresWritten: 0 });
    (runResolutionScoringStep as jest.Mock).mockResolvedValue({ scores: {}, scoresWritten: 0 });

    riskScoreEntityCalculationRouteV2(server.router, getStartServicesMock, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const buildRequest = (overrides: object = {}) =>
    requestMock.create({
      method: 'post',
      path: RISK_SCORE_ENTITY_CALCULATION_V2_URL,
      body: {
        ...defaultBody,
        ...overrides,
      },
    });

  it('successfully recalculates risk score', async () => {
    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
  });

  it.each([true, false])(
    'passes configured profiling to each scoring stage (enabled: %s)',
    async (profile) => {
      const config = configMock.withExperimentalFeature(
        clients.config,
        'entityAnalyticsEntityStoreV2'
      );
      context.securitySolution.getConfig.mockReturnValue({
        ...config,
        entityAnalytics: {
          ...config.entityAnalytics,
          riskEngine: {
            ...config.entityAnalytics.riskEngine,
            esqlProfiling: profile,
            esqlProfilingInterval: 3,
          },
        },
      });
      const sampled: boolean[] = [];
      jest.mocked(scoreBaseEntities).mockImplementationOnce(async ({ pageTimings }) => {
        [1, 2, 3, 4].forEach(() => {
          pageTimings.startPage();
          sampled.push(pageTimings.shouldProfile());
        });
        return {
          scores: {},
          scoresCalculated: 0,
          scoresWrittenRiskIndex: 0,
          scoresWrittenEntityStore: 0,
          scoresFailed: 0,
          pagesProcessed: 0,
          scoresDroppedNotInStore: 0,
          scoresMissingFromStore: 0,
          entitiesCreated: 0,
          entityCreationsSkipped: 0,
          entityCreationsFailed: 0,
        };
      });
      jest.mocked(runResolutionScoringStep).mockImplementationOnce(async ({ pageTimings }) => {
        pageTimings.startPage();
        sampled.push(pageTimings.shouldProfile());
        return {
          scores: {},
          scoresWrittenRiskIndex: 0,
          scoresWrittenEntityStore: 0,
          scoresFailed: 0,
          pagesProcessed: 0,
        };
      });
      const response = await server.inject(
        buildRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(sampled).toEqual([profile, false, false, profile, profile]);
    }
  );

  it('only checks the index privileges the calculation needs, not cluster privileges', async () => {
    const security = riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess();
    getStartServicesMock.mockResolvedValue([{}, { security }]);

    await server.inject(buildRequest(), requestContextMock.convertContext(context));

    const checkPrivileges = (security.authz.checkPrivilegesDynamicallyWithRequest as jest.Mock).mock
      .results[0].value;
    expect(checkPrivileges).toHaveBeenCalledWith({
      elasticsearch: {
        cluster: [],
        index: {
          ...RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
          [getLookupIndexName(context.securitySolution.getSpaceId())]: ['read'],
        },
      },
    });
  });

  it('returns 403 and skips scoring when the user lacks the risk score or lookup index privileges', async () => {
    getStartServicesMock.mockResolvedValue([
      {},
      { security: riskEnginePrivilegesMock.createMockSecurityStartWithNoRiskEngineAccess() },
    ]);

    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(403);
    expect(scoreBaseEntities).not.toHaveBeenCalled();
  });

  it.each([
    ['write', { has_read_permissions: true, has_write_permissions: false }],
    ['read', { has_read_permissions: false, has_write_permissions: true }],
  ])(
    'returns 403 and skips scoring when the user lacks entity store %s access',
    async (_, perms) => {
      (checkEntityStoreIndexPrivileges as jest.Mock).mockResolvedValue(perms);

      const response = await server.inject(
        buildRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(403);
      expect(scoreBaseEntities).not.toHaveBeenCalled();
    }
  );

  it('throws an error when entity_id is missing', async () => {
    const response = await server.inject(
      buildRequest({ entity_id: undefined }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(400);
    expect(response.body.message).toEqual('Entity ID is required');
  });

  it('throws an error when Entity Store V2 feature flag is disabled', async () => {
    const defaultConfig = configMock.createDefault();
    context.securitySolution.getConfig.mockReturnValue({
      ...defaultConfig,
      experimentalFeatures: {
        ...defaultConfig.experimentalFeatures,
        entityAnalyticsEntityStoreV2: false,
      },
    });

    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(400);
    expect(response.body.message).toEqual('Entity Store V2 is not enabled');
  });

  it('throws an error when no risk engine configuration is found', async () => {
    (getConfiguration as jest.Mock).mockResolvedValue(null);

    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(400);
    expect(response.body.message).toEqual('No Risk engine configuration found');
  });

  it('filters alerts for the given entity', async () => {
    const engineFilter = { term: { 'kibana.alert.workflow_status': 'open' } };
    (buildAlertFilters as jest.Mock).mockReturnValue([engineFilter]);

    await server.inject(buildRequest(), requestContextMock.convertContext(context));

    expect(euid.dsl.getEuidFilterBasedOnDocument).toHaveBeenCalled();
    expect(scoreBaseEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        alertFilters: expect.arrayContaining([engineFilter, { term: { 'entity.id': entityId } }]),
      })
    );
  });

  it('runs resolution scoring against the resolved entity', async () => {
    await server.inject(buildRequest(), requestContextMock.convertContext(context));

    expect(runResolutionScoringStep).toHaveBeenCalledWith(
      expect.objectContaining({
        targetEntityIds: [entityDocMock.entity.relationships.resolution.resolved_to],
      })
    );
  });

  it('runs resolution scoring against the entity itself when no resolved entity exists', async () => {
    // override default mock that returns an entity with a resolved_to
    mockCrudClient.listEntities = jest
      .fn()
      .mockResolvedValue({ entities: [{ entity: { id: entityId } }] });

    await server.inject(buildRequest(), requestContextMock.convertContext(context));

    expect(runResolutionScoringStep).toHaveBeenCalledWith(
      expect.objectContaining({ targetEntityIds: [entityId] })
    );
  });

  it('uses the same run ID across base and resolution scoring', async () => {
    await server.inject(buildRequest(), requestContextMock.convertContext(context));

    const { calculationRunId: baseRunId } = (scoreBaseEntities as jest.Mock).mock.calls[0][0];
    const { calculationRunId: resolutionRunId } = (runResolutionScoringStep as jest.Mock).mock
      .calls[0][0];

    expect(baseRunId).toBeDefined();
    expect(baseRunId).toEqual(resolutionRunId);
  });

  describe('validation', () => {
    it('requires identifier_type', () => {
      const result = server.validate(buildRequest({ identifier_type: undefined }));

      expect(result.badRequest).toHaveBeenCalledWith(expect.stringContaining('identifier_type'));
    });

    it('rejects unknown identifier_type values', () => {
      const result = server.validate(buildRequest({ identifier_type: 'unknown' }));

      expect(result.badRequest).toHaveBeenCalledWith(expect.stringContaining('identifier_type'));
    });
  });

  it('returns 400 and skips scoring when entity is not found', async () => {
    mockCrudClient.listEntities = jest.fn().mockResolvedValue({ entities: [] });

    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(400);
    expect(response.body.message).toContain('Entity not found');
    expect(scoreBaseEntities).not.toHaveBeenCalled();
  });

  it('throws an error on unhandled exceptions', async () => {
    (scoreBaseEntities as jest.Mock).mockRejectedValue(new Error('unexpected'));

    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
  });
});
