/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';

import {
  typicalSetStatusSignalByIdsPayload,
  getSuccessfulSignalUpdateResponse,
} from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, responseMock, requestMock } from '../__mocks__';
import { setWorkflowStatusHandler } from './set_workflow_status_handler';
import { responseAdapter } from '../__mocks__/test_adapters';

describe('set workflow status handler', () => {
  let context: SecuritySolutionRequestHandlerContextMock;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
      getSuccessfulSignalUpdateResponse()
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('update workflow status by IDs', () => {
    test('returns 200 when updating status by IDs', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: typicalSetStatusSignalByIdsPayload(),
      });

      await setWorkflowStatusHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });
      const response = responseAdapter(mockedResponse);

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-default',
          query: {
            bool: {
              filter: { terms: { _id: ['somefakeid1', 'somefakeid2'] } },
            },
          },
        })
      );
    });

    test('updates on multiple indices pattern', async () => {
      const indexPattern = [
        '.alerts-security.alerts-default',
        '.alerts-security.attack.discovery.alerts-default',
      ];
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: typicalSetStatusSignalByIdsPayload(),
      });

      await setWorkflowStatusHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve(indexPattern),
      });
      const response = responseAdapter(mockedResponse);

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: indexPattern,
        })
      );
    });

    test('handles closed status with reason', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: {
          signal_ids: ['somefakeid1'],
          status: 'closed',
          reason: 'false_positive',
        },
      });

      await setWorkflowStatusHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });
      const response = responseAdapter(mockedResponse);

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalled();
      const call = context.core.elasticsearch.client.asCurrentUser.updateByQuery.mock.calls[0][0];
      expect(
        call.script && typeof call.script === 'object' && 'source' in call.script
          ? call.script.source
          : ''
      ).toContain("'false_positive'");
    });

    test('handles closed status without reason', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: {
          signal_ids: ['somefakeid1'],
          status: 'closed',
        },
      });

      await setWorkflowStatusHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });
      const response = responseAdapter(mockedResponse);

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalled();
      const call = context.core.elasticsearch.client.asCurrentUser.updateByQuery.mock.calls[0][0];
      expect(
        call.script && typeof call.script === 'object' && 'source' in call.script
          ? call.script.source
          : ''
      ).toContain("ctx._source.remove('kibana.alert.workflow_reason')");
    });

    test('handles different status values', async () => {
      const statuses = ['open', 'acknowledged', 'in-progress'] as const;

      for (const status of statuses) {
        const mockedResponse = responseMock.create();
        const request = requestMock.create({
          method: 'post',
          body: {
            signal_ids: ['somefakeid1'],
            status,
          },
        });

        await setWorkflowStatusHandler({
          context: requestContextMock.convertContext(context),
          request,
          response: mockedResponse,
          getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
        });
        const response = responseAdapter(mockedResponse);

        expect(response.status).toEqual(200);
      }
    });

    test('includes user information in script when user is present', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: typicalSetStatusSignalByIdsPayload(),
      });

      // Mock user with profile_uid
      context.core.security.authc.getCurrentUser.mockReturnValue({
        username: 'test-user',
        profile_uid: 'test-uid-123',
      } as AuthenticatedUser);

      await setWorkflowStatusHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });

      const call = context.core.elasticsearch.client.asCurrentUser.updateByQuery.mock.calls[0][0];
      expect(
        call.script && typeof call.script === 'object' && 'source' in call.script
          ? call.script.source
          : ''
      ).toContain("'test-uid-123'");
    });

    test('handles null user in script', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: typicalSetStatusSignalByIdsPayload(),
      });

      // Mock null user
      context.core.security.authc.getCurrentUser.mockReturnValue(null);

      await setWorkflowStatusHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });

      const call = context.core.elasticsearch.client.asCurrentUser.updateByQuery.mock.calls[0][0];
      expect(
        call.script && typeof call.script === 'object' && 'source' in call.script
          ? call.script.source
          : ''
      ).toContain('null');
    });

    test('catches error if updateByQuery throws error', async () => {
      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: typicalSetStatusSignalByIdsPayload(),
      });

      await setWorkflowStatusHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });
      const response = responseAdapter(mockedResponse);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test('includes refresh and ignore_unavailable in updateByQuery call', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: typicalSetStatusSignalByIdsPayload(),
      });

      await setWorkflowStatusHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: true,
          ignore_unavailable: true,
        })
      );
    });
  });
});
