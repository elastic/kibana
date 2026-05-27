/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { RISK_SCORE_ENTITY_CALCULATION_V2_URL } from '../../../../../common/constants';
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
import { getConfiguration } from '../../risk_engine/utils/saved_object_configuration';
import { scoreBaseEntities } from '../maintainer/steps/score_base_entities';
import { runResolutionScoringStep } from '../maintainer/steps/run_resolution_scoring_step';
import { fetchWatchlistConfigs } from '../maintainer/utils/fetch_watchlist_configs';
import { getIsIdBasedRiskScoringEnabled } from '../is_id_based_risk_scoring_enabled';
import { buildAlertFilters } from '../maintainer/steps/build_alert_filters';

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    dsl: {
      getEuidFilterBasedOnDocument: jest
        .fn()
        .mockReturnValue({ term: { 'entity.id': 'mock-euid-filter' } }),
    },
  },
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

const mockEntityDoc = (overrides: object = {}) => ({
  entity: {
    id: 'host:test-host-name',
    relationships: { resolution: { resolved_to: 'host:canonical-entity-id' } },
    ...overrides,
  },
});

describe('entity risk score V2 calculation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;
  let logger: ReturnType<typeof loggerMock.create>;
  let getStartServicesMock: jest.Mock;

  const defaultBody = {
    identifier: 'test-host-name',
    identifier_type: 'host',
  };

  beforeEach(() => {
    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
      },
    ]);

    server = serverMock.create();
    logger = loggerMock.create();
    ({ clients, context } = requestContextMock.createTools());

    context.securitySolution.getConfig.mockReturnValue(
      configMock.withExperimentalFeature(clients.config, 'entityAnalyticsEntityStoreV2')
    );

    // Default: no entities found for identifier → no resolution scoring
    (clients.entityStoreCrudClient as unknown as jest.Mocked<EntityStoreCRUDClient>).listEntities =
      jest.fn().mockResolvedValue({ entities: [] });

    (getConfiguration as jest.Mock).mockResolvedValue(defaultEngineConfig);
    (getRiskInputsIndex as jest.Mock).mockResolvedValue({ index: 'default-alerts-index' });
    (buildAlertFilters as jest.Mock).mockReturnValue([]);
    (fetchWatchlistConfigs as jest.Mock).mockResolvedValue(new Map());
    (getIsIdBasedRiskScoringEnabled as jest.Mock).mockResolvedValue(false);
    (scoreBaseEntities as jest.Mock).mockResolvedValue(undefined);
    (runResolutionScoringStep as jest.Mock).mockResolvedValue(undefined);

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

  it('should return 200 when risk score calculation is successful', async () => {
    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
  });

  it('returns 400 when Entity Store V2 feature flag is disabled', async () => {
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

  it('returns 400 when no risk engine configuration is found', async () => {
    (getConfiguration as jest.Mock).mockResolvedValue(null);

    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(400);
    expect(response.body.message).toEqual('No Risk engine configuration found');
  });

  it('maps host identifier_type to host.name field filter', async () => {
    const body = {
      identifier: 'test-host-name',
      identifier_type: 'host',
    };
    await server.inject(buildRequest(body), requestContextMock.convertContext(context));

    expect(scoreBaseEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: body.identifier_type,
        alertFilters: expect.arrayContaining([{ term: { 'host.name': body.identifier } }]),
      })
    );
  });

  it('maps user identifier_type to user.name field filter', async () => {
    const body = {
      identifier: 'test-user',
      identifier_type: 'user',
    };
    await server.inject(buildRequest(body), requestContextMock.convertContext(context));

    expect(scoreBaseEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: body.identifier_type,
        alertFilters: expect.arrayContaining([{ term: { 'user.name': body.identifier } }]),
      })
    );
  });

  it('merges buildAlertFilters output with the identifier filter', async () => {
    const engineFilter = { term: { 'kibana.alert.workflow_status': 'open' } };
    (buildAlertFilters as jest.Mock).mockReturnValue([engineFilter]);

    await server.inject(buildRequest(), requestContextMock.convertContext(context));

    expect(scoreBaseEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        alertFilters: expect.arrayContaining([
          engineFilter,
          { term: { 'host.name': defaultBody.identifier } },
        ]),
      })
    );
  });

  describe('resolution scoring', () => {
    it('does not run resolution scoring when no entities match the identifier', async () => {
      // Default beforeEach mock: listEntities returns { entities: [] }
      await server.inject(buildRequest(), requestContextMock.convertContext(context));

      expect(runResolutionScoringStep).not.toHaveBeenCalled();
    });

    it('runs resolution scoring when entities are found for the identifier', async () => {
      const mockedEntityDoc = mockEntityDoc();
      (
        clients.entityStoreCrudClient as unknown as jest.Mocked<EntityStoreCRUDClient>
      ).listEntities = jest.fn().mockResolvedValue({ entities: [mockedEntityDoc] });

      await server.inject(buildRequest(), requestContextMock.convertContext(context));

      expect(runResolutionScoringStep).toHaveBeenCalledWith(
        expect.objectContaining({
          targetEntityIds: [mockedEntityDoc.entity.relationships.resolution.resolved_to],
        })
      );
    });

    it('falls back to entity.id as resolution target when entity has no resolved_to', async () => {
      const entityId = 'host:test-host-name';
      (
        clients.entityStoreCrudClient as unknown as jest.Mocked<EntityStoreCRUDClient>
      ).listEntities = jest.fn().mockResolvedValue({
        entities: [{ entity: { id: entityId } }],
      });

      await server.inject(buildRequest(), requestContextMock.convertContext(context));

      expect(runResolutionScoringStep).toHaveBeenCalledWith(
        expect.objectContaining({ targetEntityIds: [entityId] })
      );
    });
  });

  describe('when entity_id is provided', () => {
    it('always runs resolution scoring', async () => {
      const mockedEntityDoc = mockEntityDoc();
      (
        clients.entityStoreCrudClient as unknown as jest.Mocked<EntityStoreCRUDClient>
      ).listEntities = jest.fn().mockResolvedValue({ entities: [mockedEntityDoc] });

      await server.inject(
        buildRequest({ entity_id: mockedEntityDoc.entity.id }),
        requestContextMock.convertContext(context)
      );

      expect(runResolutionScoringStep).toHaveBeenCalled();
    });

    it('uses entity resolved_to as the resolution target', async () => {
      const mockedEntityDoc = mockEntityDoc();
      (
        clients.entityStoreCrudClient as unknown as jest.Mocked<EntityStoreCRUDClient>
      ).listEntities = jest.fn().mockResolvedValue({ entities: [mockedEntityDoc] });

      await server.inject(
        buildRequest({ entity_id: mockedEntityDoc.entity.id }),
        requestContextMock.convertContext(context)
      );

      expect(runResolutionScoringStep).toHaveBeenCalledWith(
        expect.objectContaining({
          targetEntityIds: [mockedEntityDoc.entity.relationships.resolution.resolved_to],
        })
      );
    });

    it('falls back to entity_id when entity has no resolved_to', async () => {
      const entityId = 'host:test-host-name';
      (
        clients.entityStoreCrudClient as unknown as jest.Mocked<EntityStoreCRUDClient>
      ).listEntities = jest.fn().mockResolvedValue({
        entities: [{ entity: { id: entityId } }],
      });

      await server.inject(
        buildRequest({ entity_id: entityId }),
        requestContextMock.convertContext(context)
      );

      expect(runResolutionScoringStep).toHaveBeenCalledWith(
        expect.objectContaining({ targetEntityIds: [entityId] })
      );
    });

    it('uses the euid identity filter as the alert filter', async () => {
      const mockedEntityDoc = mockEntityDoc();
      (
        clients.entityStoreCrudClient as unknown as jest.Mocked<EntityStoreCRUDClient>
      ).listEntities = jest.fn().mockResolvedValue({ entities: [mockedEntityDoc] });

      await server.inject(
        buildRequest({ entity_id: mockedEntityDoc.entity.id }),
        requestContextMock.convertContext(context)
      );

      expect(euid.dsl.getEuidFilterBasedOnDocument).toHaveBeenCalled();
      expect(scoreBaseEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          alertFilters: expect.arrayContaining([{ term: { 'entity.id': 'mock-euid-filter' } }]),
        })
      );
    });

    it('uses the same calculationRunId for both scoring steps', async () => {
      (
        clients.entityStoreCrudClient as unknown as jest.Mocked<EntityStoreCRUDClient>
      ).listEntities = jest.fn().mockResolvedValue({ entities: [mockEntityDoc()] });

      await server.inject(
        buildRequest({ entity_id: 'host:test-host-name' }),
        requestContextMock.convertContext(context)
      );

      const { calculationRunId: baseRunId } = (scoreBaseEntities as jest.Mock).mock.calls[0][0];
      const { calculationRunId: resolutionRunId } = (runResolutionScoringStep as jest.Mock).mock
        .calls[0][0];

      expect(baseRunId).toBeDefined();
      expect(baseRunId).toEqual(resolutionRunId);
    });
  });

  describe('validation', () => {
    it('requires identifier_type', () => {
      const result = server.validate(buildRequest({ identifier_type: undefined }));

      expect(result.badRequest).toHaveBeenCalledWith(expect.stringContaining('identifier_type'));
    });

    it('requires identifier', () => {
      const result = server.validate(buildRequest({ identifier: undefined }));

      expect(result.badRequest).toHaveBeenCalledWith(expect.stringContaining('identifier'));
    });

    it('rejects unknown identifier_type values', () => {
      const result = server.validate(buildRequest({ identifier_type: 'unknown' }));

      expect(result.badRequest).toHaveBeenCalledWith(expect.stringContaining('identifier_type'));
    });
  });

  it('returns 500 on unexpected errors', async () => {
    (scoreBaseEntities as jest.Mock).mockRejectedValue(new Error('unexpected'));

    const response = await server.inject(
      buildRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
  });
});
