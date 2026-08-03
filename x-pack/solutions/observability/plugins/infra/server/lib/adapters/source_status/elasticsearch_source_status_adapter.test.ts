/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './elasticsearch_source_status_adapter';

describe('InfraElasticsearchSourceStatusAdapter', () => {
  it('applies project routing when checking index status', async () => {
    const search = jest.fn().mockResolvedValue({
      _shards: { total: 1 },
      hits: { total: { value: 1 } },
    });
    const getUiSetting = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(false);
    const context = {
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: { search },
          },
        },
        uiSettings: {
          client: { get: getUiSetting },
        },
      }),
    } as unknown as InfraPluginRequestHandlerContext;
    const request = httpServerMock.createKibanaRequest({
      headers: { 'x-project-routing': '_alias:*' },
    });
    const framework = Object.create(KibanaFramework.prototype) as KibanaFramework;
    const adapter = new InfraElasticsearchSourceStatusAdapter(framework);

    await expect(adapter.getIndexStatus(context, 'metrics-*', request)).resolves.toBe('available');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'metrics-*',
        project_routing: '_alias:*',
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});
