/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { installSampleEvents, removeSampleEvents } from '../lib/analytics_sample_events';
import { registerAnalyticsSampleEventsRoutes } from './analytics_sample_events';

jest.mock('../lib/analytics_sample_events');

const mockInstall = installSampleEvents as jest.MockedFunction<typeof installSampleEvents>;
const mockRemove = removeSampleEvents as jest.MockedFunction<typeof removeSampleEvents>;

const INDEX = 'kibana_sample_data_clickstream';
const PATH = '/internal/search_homepage/analytics/sample_events';

describe('registerAnalyticsSampleEventsRoutes', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const callHandler = (method: 'post' | 'delete') => {
    const core = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: Promise.resolve(core) });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest();

    return {
      core,
      response,
      result:
        method === 'post'
          ? router.post.mock.calls[0][1](context, request, response)
          : router.delete.mock.calls[0][1](context, request, response),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    registerAnalyticsSampleEventsRoutes(router, logger, { isServerless: true });
  });

  it.each(['post', 'delete'] as const)(
    'registers an internal %s route without input that delegates authorization to Elasticsearch',
    (method) => {
      expect(router[method].mock.calls[0][0]).toMatchObject({
        path: PATH,
        validate: false,
        options: { access: 'internal' },
        security: { authz: { enabled: false, reason: expect.stringContaining('as the caller') } },
      });
    }
  );

  describe('POST', () => {
    it('installs the sample events with the scoped client', async () => {
      const installed = { index: INDEX, eventsCount: 8628, status: 'installed' as const };
      mockInstall.mockResolvedValue(installed);

      const { core, response, result } = callHandler('post');
      await result;

      expect(mockInstall).toHaveBeenCalledWith({
        client: core.elasticsearch.client,
        logger,
        isServerless: true,
      });
      expect(response.ok).toHaveBeenCalledWith({ body: installed });
    });

    it('answers 403 with the privileges needed when Elasticsearch refuses the caller', async () => {
      mockInstall.mockRejectedValue(Object.assign(new Error('unauthorized'), { statusCode: 403 }));

      const { response, result } = callHandler('post');
      await result;

      expect(response.forbidden).toHaveBeenCalledWith({
        body: {
          message: `Failed to install the sample events: your role needs the read, view_index_metadata, create_index, index and delete_index index privileges on ${INDEX}`,
        },
      });
      expect(response.ok).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('unauthorized'));
    });

    it.each([
      ['a conflicting install', { statusCode: 409 }, 409],
      ['an Elasticsearch failure', { statusCode: 503 }, 503],
      ['an unexpected error', {}, 500],
    ])('logs %s and answers with its status', async (_, properties, statusCode) => {
      mockInstall.mockRejectedValue(Object.assign(new Error('boom'), properties));

      const { response, result } = callHandler('post');
      await result;

      expect(response.customError).toHaveBeenCalledWith({
        statusCode,
        body: { message: 'Failed to install the sample events' },
      });
      expect(response.ok).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });

  describe('DELETE', () => {
    it('removes the sample events with the scoped client', async () => {
      const removed = { index: INDEX, status: 'removed' as const };
      mockRemove.mockResolvedValue(removed);

      const { core, response, result } = callHandler('delete');
      await result;

      expect(mockRemove).toHaveBeenCalledWith({ client: core.elasticsearch.client });
      expect(response.ok).toHaveBeenCalledWith({ body: removed });
    });

    it('answers 403 when Elasticsearch refuses the caller', async () => {
      mockRemove.mockRejectedValue(Object.assign(new Error('unauthorized'), { statusCode: 403 }));

      const { response, result } = callHandler('delete');
      await result;

      expect(response.forbidden).toHaveBeenCalledWith({
        body: {
          message: `Failed to remove the sample events: your role needs the delete_index index privileges on ${INDEX}`,
        },
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs any other failure and answers with its status', async () => {
      mockRemove.mockRejectedValue(new Error('boom'));

      const { response, result } = callHandler('delete');
      await result;

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Failed to remove the sample events' },
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });
});
