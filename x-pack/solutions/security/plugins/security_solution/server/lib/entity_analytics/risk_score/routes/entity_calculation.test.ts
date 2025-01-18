/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { RISK_SCORE_ENTITY_CALCULATION_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import type { RiskEngineConfigurationWithDefaults } from '../risk_score_service';
import { riskScoreServiceFactory } from '../risk_score_service';
import { riskScoreServiceMock } from '../risk_score_service.mock';
import { getRiskInputsIndex } from '../get_risk_inputs_index';
import { calculateAndPersistRiskScoresMock } from '../calculate_and_persist_risk_scores.mock';
import { riskScoreEntityCalculationRoute } from './entity_calculation';
import { riskEnginePrivilegesMock } from '../../risk_engine/routes/risk_engine_privileges.mock';

jest.mock('../get_risk_inputs_index');
jest.mock('../risk_score_service');

describe('entity risk score calculation route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let logger: ReturnType<typeof loggerMock.create>;
  let mockRiskScoreService: ReturnType<typeof riskScoreServiceMock.create>;
  const entityAnalyticsConfig = {
    alertSampleSizePerShard: 10_000,
    enabled: true,
    range: { start: 'now-30d', end: 'now' },
  } as unknown as RiskEngineConfigurationWithDefaults;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
      },
    ]);

    server = serverMock.create();
    logger = loggerMock.create();
    ({ clients, context } = requestContextMock.createTools());
    mockRiskScoreService = riskScoreServiceMock.create();
    mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValue(entityAnalyticsConfig);
    mockRiskScoreService.calculateAndPersistScores.mockResolvedValue(
      calculateAndPersistRiskScoresMock.buildResponse()
    );

    (getRiskInputsIndex as jest.Mock).mockResolvedValue({
      index: 'default-dataview-index',
      runtimeMappings: {},
    });
    clients.appClient.getAlertsIndex.mockReturnValue('default-alerts-index');
    (riskScoreServiceFactory as jest.Mock).mockReturnValue(mockRiskScoreService);

    riskScoreEntityCalculationRoute(server.router, getStartServicesMock, logger);
  });

  const buildRequest = (overrides: object = {}) => {
    const defaults = {
      identifier: 'test-host-name',
      identifier_type: 'host',
    };

    return requestMock.create({
      method: 'post',
      path: RISK_SCORE_ENTITY_CALCULATION_URL,
      body: { ...defaults, ...overrides },
    });
  };

  it('should return 200 when risk score calculation is successful', async () => {
    const request = buildRequest();

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
  });

  it('should schedule transform when risk scores are persisted ', async () => {
    const request = buildRequest();

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(mockRiskScoreService.scheduleLatestTransformNow).toHaveBeenCalled();

    expect(response.status).toEqual(200);
  });

  it('should call "calculateAndPersistScores" with entity filter', async () => {
    const request = buildRequest();

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { bool: { filter: [{ term: { 'host.name': 'test-host-name' } }] } },
      })
    );
  });

  describe('validation', () => {
    it('requires a parameter for the identifier type', async () => {
      const request = buildRequest({ identifier_type: undefined });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith('identifier_type: Required');
    });

    it('requires a parameter for the entity identifier', async () => {
      const request = buildRequest({ identifier: undefined });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith('identifier: Required');
    });

    it('returns an error if no entity analytics configuration is found', async () => {
      mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValue(null);
      const request = buildRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.body).toEqual({
        message: 'No Risk engine configuration found',
        status_code: 400,
      });
      expect(response.status).toEqual(400);
    });

    it('returns an error if the risk engine is disabled', async () => {
      mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValue({
        ...entityAnalyticsConfig,
        enabled: false,
      });
      const request = buildRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.body).toEqual({
        message: 'Risk engine is disabled',
        status_code: 400,
      });
      expect(response.status).toEqual(400);
    });

    it('filter by user provided filter when it is defined', async () => {
      const userFilter = { term: { 'test.filter': 'test-value' } };
      mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValue({
        ...entityAnalyticsConfig,
        filter: userFilter,
      });
      const request = buildRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { bool: { filter: expect.arrayContaining([userFilter]) } },
        })
      );
    });
  });
});
