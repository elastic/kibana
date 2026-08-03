/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { InfraPluginRequestHandlerContext } from '../types';
import type { InfraSources } from './sources';
import { InfraSourceStatus, type InfraSourceStatusAdapter } from './source_status';

describe('InfraSourceStatus', () => {
  it('passes the request to the index status adapter', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { 'x-project-routing': '_alias:*' },
    });
    const context = {
      core: Promise.resolve({
        savedObjects: { client: {} },
      }),
    } as unknown as InfraPluginRequestHandlerContext;
    const getIndexStatus = jest.fn().mockResolvedValue('available');
    const adapter = {
      getIndexStatus,
    } as unknown as InfraSourceStatusAdapter;
    const sources = {
      getSourceConfiguration: jest.fn().mockResolvedValue({
        configuration: { metricAlias: 'metrics-*' },
      }),
    } as unknown as InfraSources;
    const sourceStatus = new InfraSourceStatus(adapter, { sources });

    await expect(sourceStatus.hasMetricIndices(context, 'default', request)).resolves.toBe(true);
    expect(getIndexStatus).toHaveBeenCalledWith(context, 'metrics-*', request);
  });
});
