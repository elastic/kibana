/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, responseMock, requestMock } from '../__mocks__';
import { setAlertAssigneesHandler } from './set_alert_assignees_handler';
import { responseAdapter } from '../__mocks__/test_adapters';

describe('set alert assignees handler', () => {
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

  describe('update alert assignees by IDs', () => {
    test('returns 200 when updating assignees by IDs', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: {
          ids: ['somefakeid1', 'somefakeid2'],
          assignees: {
            add: ['user1', 'user2'],
            remove: [],
          },
        },
      });

      await setAlertAssigneesHandler({
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
        body: {
          ids: ['somefakeid1'],
          assignees: {
            add: ['user1'],
            remove: [],
          },
        },
      });

      await setAlertAssigneesHandler({
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

    test('handles adding and removing assignees', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: {
          ids: ['somefakeid1'],
          assignees: {
            add: ['new-user'],
            remove: ['old-user'],
          },
        },
      });

      await setAlertAssigneesHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });
      const response = responseAdapter(mockedResponse);

      expect(response.status).toEqual(200);
      const call = context.core.elasticsearch.client.asCurrentUser.updateByQuery.mock.calls[0][0];
      const script =
        call.script && typeof call.script === 'object' && 'params' in call.script
          ? call.script
          : null;
      expect(script?.params?.assigneesToAdd).toEqual(['new-user']);
      expect(script?.params?.assigneesToRemove).toEqual(['old-user']);
    });

    test('returns 400 when validation fails', async () => {
      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: {
          ids: ['somefakeid1'],
          assignees: {
            add: ['user1'],
            remove: ['user1'], // Duplicate - should fail validation
          },
        },
      });

      await setAlertAssigneesHandler({
        context: requestContextMock.convertContext(context),
        request,
        response: mockedResponse,
        getIndexPattern: () => Promise.resolve('.alerts-security.alerts-default'),
      });
      const response = responseAdapter(mockedResponse);

      expect(response.status).toEqual(400);
    });

    test('catches error if updateByQuery throws error', async () => {
      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      const mockedResponse = responseMock.create();
      const request = requestMock.create({
        method: 'post',
        body: {
          ids: ['somefakeid1'],
          assignees: {
            add: ['user1'],
            remove: [],
          },
        },
      });

      await setAlertAssigneesHandler({
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
  });
});
