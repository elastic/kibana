/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';

import * as helpers from '../../../helpers';
import { hasReadWriteAttackDiscoveryAlertsPrivileges } from '../../helpers/index_privileges';
import type { AttackDiscoveryDataClient } from '../../../../lib/attack_discovery/persistence';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';
import { requestContextMock } from '../../../../__mocks__/request_context';
import { postAttackDiscoveryBulkInternalRoute } from './post_attack_discovery_bulk_internal';

jest.mock('../../helpers/index_privileges', () => {
  const original = jest.requireActual('../../helpers/index_privileges');

  return {
    ...original,
    hasReadWriteAttackDiscoveryAlertsPrivileges: jest.fn(),
  };
});

jest.mock('../../../helpers', () => {
  const original = jest.requireActual('../../../helpers');

  return {
    ...original,
    performChecks: jest.fn(),
  };
});

const { context: mockContext } = requestContextMock.createTools();

describe('postAttackDiscoveryBulkInternalRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let mockRequest: Partial<KibanaRequest<unknown, unknown, unknown>>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockDataClient: jest.Mocked<AttackDiscoveryDataClient>;
  let addVersionMock: jest.Mock;
  let getHandler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();

    mockDataClient = {
      // Return a fully populated API-shaped alert (snake_case). The route
      // will transform this to the public camelCase shape.
      bulkUpdateAttackDiscoveryAlerts: jest.fn().mockResolvedValue([
        {
          id: '1',
          alert_ids: ['a1'],
          alert_rule_uuid: 'rule-1',
          alert_workflow_status: 'open',
          connector_id: 'conn-1',
          connector_name: 'Connector Name',
          alert_start: '2020-01-01T00:00:00Z',
          alert_updated_at: '2020-01-02T00:00:00Z',
          alert_updated_by_user_id: 'updater-1',
          alert_updated_by_user_name: 'Updater',
          alert_workflow_status_updated_at: '2020-01-03T00:00:00Z',
          details_markdown: 'details',
          entity_summary_markdown: 'entity summary',
          generation_uuid: 'gen-1',
          mitre_attack_tactics: ['tactic1'],
          replacements: { foo: 'bar' },
          risk_score: 42,
          summary_markdown: 'summary',
          timestamp: '2020-01-04T00:00:00Z',
          title: 'Test Title',
          user_id: 'user-1',
          user_name: 'User One',
          users: ['user-1'],
        },
      ]),
    } as unknown as jest.Mocked<AttackDiscoveryDataClient>;

    mockContext.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(mockDataClient);
    mockRequest = {
      body: { update: { ids: ['1'], kibana_alert_workflow_status: 'open' } },
    };

    mockResponse = httpServerMock.createResponseFactory();

    jest
      .spyOn(helpers, 'performChecks')
      .mockResolvedValue({ isSuccess: true, currentUser: mockAuthenticatedUser });

    addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });
    postAttackDiscoveryBulkInternalRoute(router);
    getHandler = addVersionMock.mock.calls[0][1];
    (hasReadWriteAttackDiscoveryAlertsPrivileges as jest.Mock).mockResolvedValue({
      isSuccess: true,
    });
  });

  it('returns 200 and calls response.ok on success', async () => {
    await getHandler(mockContext, mockRequest, mockResponse);

    // Build the exact expected transformed (camelCase) alert
    const expectedTransformed = {
      id: '1',
      alertIds: ['a1'],
      alertRuleUuid: 'rule-1',
      alertStart: '2020-01-01T00:00:00Z',
      alertUpdatedAt: '2020-01-02T00:00:00Z',
      alertUpdatedByUserId: 'updater-1',
      alertUpdatedByUserName: 'Updater',
      alertWorkflowStatus: 'open',
      alertWorkflowStatusUpdatedAt: '2020-01-03T00:00:00Z',
      connectorId: 'conn-1',
      connectorName: 'Connector Name',
      detailsMarkdown: 'details',
      entitySummaryMarkdown: 'entity summary',
      generationUuid: 'gen-1',
      mitreAttackTactics: ['tactic1'],
      replacements: { foo: 'bar' },
      riskScore: 42,
      summaryMarkdown: 'summary',
      timestamp: '2020-01-04T00:00:00Z',
      title: 'Test Title',
      userId: 'user-1',
      userName: 'User One',
      users: ['user-1'],
    };

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        data: [expectedTransformed],
      },
    });
  });

  it('always calls bulkUpdateAttackDiscoveryAlerts with withReplacements: false (for this internal api)', async () => {
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockClear();

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockDataClient.bulkUpdateAttackDiscoveryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        withReplacements: false,
      })
    );
  });

  it('always calls bulkUpdateAttackDiscoveryAlerts with enableFieldRendering: true (for this internal api)', async () => {
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockClear();

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockDataClient.bulkUpdateAttackDiscoveryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        enableFieldRendering: true,
      })
    );
  });

  it('returns 500 if the data client is not initialized', async () => {
    (await mockContext.elasticAssistant).getAttackDiscoveryDataClient.mockResolvedValueOnce(null);

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.custom).toHaveBeenCalledWith({
      body: Buffer.from(
        JSON.stringify({
          message: 'Attack discovery data client not initialized',
          status_code: 500,
        })
      ),
      headers: expect.any(Object),
      statusCode: 500,
    });
  });

  it('returns an error when performChecks fails', async () => {
    (helpers.performChecks as jest.Mock).mockResolvedValueOnce({
      isSuccess: false,
      response: { status: 403, payload: { message: 'Forbidden' } },
    });

    const result = await getHandler(mockContext, mockRequest, mockResponse);

    expect(result).toEqual({ status: 403, payload: { message: 'Forbidden' } });
  });

  it('returns an error when hasReadWriteAttackDiscoveryAlertsPrivileges fails', async () => {
    (hasReadWriteAttackDiscoveryAlertsPrivileges as jest.Mock).mockImplementation(
      ({ response }) => {
        return Promise.resolve({
          isSuccess: false,
          response: { status: 403, payload: { message: 'no privileges' } },
        });
      }
    );

    const result = await getHandler(mockContext, mockRequest, mockResponse);

    expect(result).toEqual({ status: 403, payload: { message: 'no privileges' } });
  });

  describe('when data client throws', () => {
    const thrownError = new Error('fail!');

    beforeEach(() => {
      mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockRejectedValueOnce(thrownError);
    });

    it('includes the error message in the response body', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);
      const customCall = mockResponse.custom?.mock.calls[0]?.[0];
      const bodyString = customCall && customCall.body ? customCall.body.toString() : '';

      expect(bodyString).toContain(thrownError.message);
    });

    it('returns status code 500', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);
      const customCall = mockResponse.custom?.mock.calls[0]?.[0];

      expect(customCall.statusCode).toBe(500);
    });
  });

  it('throws if response validation fails', async () => {
    // Return an array so the route reaches `response.ok` and our mocked `ok` can throw
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockResolvedValueOnce([]);

    const throwValidationError = jest.fn(() => {
      throw new Error('Response validation failed');
    });
    mockResponse.ok = throwValidationError as unknown as typeof mockResponse.ok;

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(throwValidationError).toHaveBeenCalled();
  });
});
