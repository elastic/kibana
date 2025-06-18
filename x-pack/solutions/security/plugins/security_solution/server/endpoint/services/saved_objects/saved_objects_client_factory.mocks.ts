/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { HttpServiceSetup } from '@kbn/core/server';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { SavedObjectsClientFactory } from './saved_objects_client_factory';

interface CreateSavedObjectsClientFactoryMockOptions {
  savedObjectsServiceStart: jest.Mocked<SavedObjectsServiceStart>;
  httpServiceSetup: HttpServiceSetup;
}

export const createSavedObjectsClientFactoryMock = (
  dependencies: Partial<CreateSavedObjectsClientFactoryMockOptions> = {}
): {
  service: SavedObjectsClientFactory;
  dependencies: CreateSavedObjectsClientFactoryMockOptions;
} => {
  const {
    savedObjectsServiceStart = savedObjectsServiceMock.createStartContract(),
    httpServiceSetup = coreMock.createSetup().http,
  } = dependencies;
  const service = new SavedObjectsClientFactory(savedObjectsServiceStart, httpServiceSetup);
  const soClient = service.createInternalUnscopedSoClient(false);
  const createInternalScopedSoClientSpy = jest.spyOn(service, 'createInternalScopedSoClient');
  const createInternalUnscopedSoClientSpy = jest.spyOn(service, 'createInternalUnscopedSoClient');

  createInternalScopedSoClientSpy.mockReturnValue(soClient);
  createInternalUnscopedSoClientSpy.mockReturnValue(soClient);

  // The SO client mock does not return promises for async methods, so we mock those here in order
  // to avoid basic errors in tests (those where the methods are called, but the return value is
  // never used/checked
  [
    'create',
    'bulkCreate',
    'checkConflicts',
    'bulkUpdate',
    'delete',
    'bulkDelete',
    'bulkGet',
    'find',
    'get',
    'closePointInTime',
    'createPointInTimeFinder',
    'bulkResolve',
    'resolve',
    'update',
  ].forEach((methodName) => {
    let response: any;

    switch (methodName) {
      case 'find':
      case 'bulkGet':
        response = { saved_objects: [] };
        break;
    }

    (soClient[methodName as keyof typeof soClient] as jest.Mock).mockReturnValue(
      Promise.resolve(response)
    );
  });

  return {
    service,
    dependencies: { savedObjectsServiceStart, httpServiceSetup },
  };
};
