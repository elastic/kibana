/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { ALERTZERO_INFERENCE_PARENT_FEATURE_ID } from '@kbn/alertzero-common';
import { createGetWorkerBlockingReasons } from './worker_blocking_reasons';

const request = {} as KibanaRequest;

const searchInferenceEndpointsReturning = (getForFeature: jest.Mock) =>
  ({ endpoints: { getForFeature } } as unknown as SearchInferenceEndpointsPluginStart);

describe('createGetWorkerBlockingReasons', () => {
  it('has no reasons when the parent feature resolves at least one endpoint, in default mode', async () => {
    const getForFeature = jest.fn().mockResolvedValue({
      endpoints: [{ connectorId: 'my-openai' }],
      warnings: [],
      soEntryFound: false,
    });
    const getBlockingReasons = createGetWorkerBlockingReasons(
      searchInferenceEndpointsReturning(getForFeature),
      loggingSystemMock.createLogger()
    );

    await expect(getBlockingReasons(request)).resolves.toEqual([]);
    expect(getForFeature).toHaveBeenCalledWith(ALERTZERO_INFERENCE_PARENT_FEATURE_ID, request);
  });

  it('reports no_model when the parent feature resolves nothing', async () => {
    const getForFeature = jest
      .fn()
      .mockResolvedValue({ endpoints: [], warnings: [], soEntryFound: false });
    const getBlockingReasons = createGetWorkerBlockingReasons(
      searchInferenceEndpointsReturning(getForFeature),
      loggingSystemMock.createLogger()
    );

    await expect(getBlockingReasons(request)).resolves.toEqual(['no_model']);
  });

  it('has no reasons when the search inference endpoints plugin is unavailable', async () => {
    const getBlockingReasons = createGetWorkerBlockingReasons(
      undefined,
      loggingSystemMock.createLogger()
    );

    await expect(getBlockingReasons(request)).resolves.toEqual([]);
  });

  it('has no reasons, and warns, when reading the uiSettings fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const getForFeature = jest.fn().mockRejectedValue(new Error('ui settings down'));
    const getBlockingReasons = createGetWorkerBlockingReasons(
      searchInferenceEndpointsReturning(getForFeature),
      logger
    );

    await expect(getBlockingReasons(request)).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ui settings down'));
  });
});
