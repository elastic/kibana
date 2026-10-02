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
import { createHasSpaceModel, getSpaceBlockingReasons } from './space_model_availability';

const request = {} as KibanaRequest;

const searchInferenceEndpointsReturning = (getForFeature: jest.Mock) =>
  ({ endpoints: { getForFeature } } as unknown as SearchInferenceEndpointsPluginStart);

describe('createHasSpaceModel', () => {
  it('reports a model when the parent feature resolves at least one endpoint', async () => {
    const getForFeature = jest.fn().mockResolvedValue({
      endpoints: [{ connectorId: 'my-openai' }],
      warnings: [],
      soEntryFound: false,
    });
    const hasSpaceModel = createHasSpaceModel(
      searchInferenceEndpointsReturning(getForFeature),
      loggingSystemMock.createLogger()
    );

    await expect(hasSpaceModel(request)).resolves.toBe(true);
    // Default mode on the parent: a tier, or `onlyReturnConfigured`, would read EIS-only
    // recommendations and a deleted per-tier pick as "no model".
    expect(getForFeature).toHaveBeenCalledWith(ALERTZERO_INFERENCE_PARENT_FEATURE_ID, request);
  });

  it('reports no model when the parent feature resolves nothing', async () => {
    const getForFeature = jest
      .fn()
      .mockResolvedValue({ endpoints: [], warnings: [], soEntryFound: false });
    const hasSpaceModel = createHasSpaceModel(
      searchInferenceEndpointsReturning(getForFeature),
      loggingSystemMock.createLogger()
    );

    await expect(hasSpaceModel(request)).resolves.toBe(false);
  });

  it('does not block when the search inference endpoints plugin is unavailable', async () => {
    const hasSpaceModel = createHasSpaceModel(undefined, loggingSystemMock.createLogger());

    await expect(hasSpaceModel(request)).resolves.toBe(true);
  });

  it('does not block, and warns, when resolution fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const getForFeature = jest.fn().mockRejectedValue(new Error('ui settings down'));
    const hasSpaceModel = createHasSpaceModel(
      searchInferenceEndpointsReturning(getForFeature),
      logger
    );

    await expect(hasSpaceModel(request)).resolves.toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ui settings down'));
  });
});

describe('getSpaceBlockingReasons', () => {
  it('blocks every Worker with no_model when the space has no model', () => {
    expect(getSpaceBlockingReasons(false)).toEqual(['no_model']);
  });

  it('has no reasons when the space has a model', () => {
    expect(getSpaceBlockingReasons(true)).toEqual([]);
  });
});
