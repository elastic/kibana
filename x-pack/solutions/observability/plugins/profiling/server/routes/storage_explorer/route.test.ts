/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { getRoutePaths } from '../../../common';
import type { RouteRegisterParameters } from '..';
import { registerStorageExplorerRoute } from './route';

describe('registerStorageExplorerRoute', () => {
  const register = (buildFlavor: RouteRegisterParameters['dependencies']['buildFlavor']) => {
    const router = httpServiceMock.createRouter();
    registerStorageExplorerRoute({
      router,
      logger: loggerMock.create(),
      services: { createProfilingEsClient: jest.fn() },
      dependencies: { buildFlavor },
    } as unknown as RouteRegisterParameters);
    return router;
  };

  it('does not register the storage explorer routes on serverless builds', () => {
    const router = register('serverless');

    expect(router.get).not.toHaveBeenCalled();
  });

  it('registers the storage explorer routes on traditional builds', () => {
    const router = register('traditional');
    const paths = getRoutePaths();

    expect(router.get.mock.calls.map(([{ path }]) => path)).toEqual([
      paths.StorageExplorerSummary,
      paths.StorageExplorerHostStorageDetails,
      paths.StorageExplorerIndicesStorageDetails,
    ]);
  });
});
