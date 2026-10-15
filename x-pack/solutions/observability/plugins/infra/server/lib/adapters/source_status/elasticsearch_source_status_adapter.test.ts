/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraElasticsearchSourceStatusAdapter } from './elasticsearch_source_status_adapter';
import type { KibanaFramework } from '../framework/kibana_framework_adapter';
import type { InfraPluginRequestHandlerContext } from '../../../types';

describe('InfraElasticsearchSourceStatusAdapter', () => {
  const createRequestContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: {
            // No data tiers excluded by default.
            get: jest.fn().mockResolvedValue([]),
          },
        },
      }),
    } as unknown as InfraPluginRequestHandlerContext);

  const createFramework = (callWithRequest: jest.Mock) =>
    ({
      callWithRequest,
    } as unknown as KibanaFramework);

  describe('getIndexStatus', () => {
    it('bounds the underlying search with a requestTimeout so it cannot hang indefinitely', async () => {
      const callWithRequest = jest.fn().mockResolvedValue({
        _shards: { total: 1 },
        hits: { total: { value: 1 } },
      });
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const status = await adapter.getIndexStatus(createRequestContext(), 'metrics-*');

      expect(status).toBe('available');
      expect(callWithRequest).toHaveBeenCalledTimes(1);
      const [, endpoint, params] = callWithRequest.mock.calls[0];
      expect(endpoint).toBe('search');
      // A `requestTimeout` must be forwarded to the ES client call so a
      // slow/unhealthy cluster (or an unreachable remote-cluster pattern in
      // a customized index alias) can't hang the request indefinitely.
      // See https://github.com/elastic/kibana/issues/279610
      expect(params).toEqual(
        expect.objectContaining({
          requestTimeout: expect.anything(),
        })
      );
    });

    it('propagates a timeout/error from the search instead of hanging or resolving with stale data', async () => {
      const timeoutError = Object.assign(new Error('Request timed out'), {
        name: 'TimeoutError',
      });
      const callWithRequest = jest.fn().mockRejectedValue(timeoutError);
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      await expect(adapter.getIndexStatus(createRequestContext(), 'metrics-*')).rejects.toBe(
        timeoutError
      );
    });

    it('still maps a 404 response to "missing" rather than throwing', async () => {
      const notFoundError = Object.assign(new Error('index_not_found_exception'), {
        status: 404,
      });
      const callWithRequest = jest.fn().mockRejectedValue(notFoundError);
      const adapter = new InfraElasticsearchSourceStatusAdapter(createFramework(callWithRequest));

      const status = await adapter.getIndexStatus(createRequestContext(), 'metrics-*');

      expect(status).toBe('missing');
    });
  });
});
