/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';

import * as helpers from '../../../helpers';
import * as publicHelpers from '../../helpers/throw_if_public_api_disabled';
import { hasReadWriteAttackDiscoveryAlertsPrivileges } from '../../helpers/index_privileges';
import type { AttackDiscoveryDataClient } from '../../../../lib/attack_discovery/persistence';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';
import { requestContextMock } from '../../../../__mocks__/request_context';
import { postAttackDiscoveryBulkRoute } from './post_attack_discovery_bulk';

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

jest.mock('../../helpers/throw_if_public_api_disabled', () => ({
  throwIfPublicApiDisabled: jest.fn(),
}));

const { context: mockContext } = requestContextMock.createTools();

describe('postAttackDiscoveryBulkRoute (public)', () => {
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
      // For the public route we expect the route to return API-shaped (snake_case) alerts
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

    // make the public API appear enabled for tests
    (publicHelpers.throwIfPublicApiDisabled as jest.Mock).mockResolvedValue(undefined);

    addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });
    postAttackDiscoveryBulkRoute(router);
    getHandler = addVersionMock.mock.calls[0][1];
    (hasReadWriteAttackDiscoveryAlertsPrivileges as jest.Mock).mockResolvedValue({
      isSuccess: true,
    });
  });

  it('returns 200 and calls response.ok with API-shaped alerts on success', async () => {
    await getHandler(mockContext, mockRequest, mockResponse);

    // Expect the public route to return API-shaped (snake_case) alerts directly from the data client
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        data: [
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
        ],
      },
    });
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

  it('passes withReplacements: true when the request provides with_replacements: true', async () => {
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockClear();
    const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
      ...mockRequest,
      body: { update: { ids: ['1'], with_replacements: true } },
    };

    await getHandler(mockContext, req, mockResponse);

    const args = mockDataClient.bulkUpdateAttackDiscoveryAlerts.mock.calls[0][0];
    expect(args.withReplacements).toBe(true);
  });

  it('passes withReplacements: false when the request provides with_replacements: false', async () => {
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockClear();
    const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
      ...mockRequest,
      body: { update: { ids: ['1'], with_replacements: false } },
    };

    await getHandler(mockContext, req, mockResponse);

    const args = mockDataClient.bulkUpdateAttackDiscoveryAlerts.mock.calls[0][0];
    expect(args.withReplacements).toBe(false);
  });

  it('defaults to withReplacements: true when with_replacements is not provided in the request', async () => {
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockClear();
    const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
      ...mockRequest,
      body: { update: { ids: ['1'] } },
    };

    await getHandler(mockContext, req, mockResponse);

    const args = mockDataClient.bulkUpdateAttackDiscoveryAlerts.mock.calls[0][0];
    expect(args.withReplacements).toBe(true);
  });

  it('passes enableFieldRendering: true when the request provides enable_field_rendering: true', async () => {
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockClear();
    const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
      ...mockRequest,
      body: { update: { ids: ['1'], enable_field_rendering: true } },
    };

    await getHandler(mockContext, req, mockResponse);

    const args = mockDataClient.bulkUpdateAttackDiscoveryAlerts.mock.calls[0][0];
    expect(args.enableFieldRendering).toBe(true);
  });

  it('passes enableFieldRendering: false when the request provides enable_field_rendering: false', async () => {
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockClear();
    const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
      ...mockRequest,
      body: { update: { ids: ['1'], enable_field_rendering: false } },
    };

    await getHandler(mockContext, req, mockResponse);

    const args = mockDataClient.bulkUpdateAttackDiscoveryAlerts.mock.calls[0][0];
    expect(args.enableFieldRendering).toBe(false);
  });

  it('defaults to enableFieldRendering: false when enable_field_rendering is not provided in the request', async () => {
    mockDataClient.bulkUpdateAttackDiscoveryAlerts.mockClear();
    const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
      ...mockRequest,
      body: { update: { ids: ['1'] } },
    };

    await getHandler(mockContext, req, mockResponse);

    const args = mockDataClient.bulkUpdateAttackDiscoveryAlerts.mock.calls[0][0];
    expect(args.enableFieldRendering).toBe(false);
  });
});
