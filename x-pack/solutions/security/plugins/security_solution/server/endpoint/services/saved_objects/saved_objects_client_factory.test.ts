/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import {
  StrictReadonlySoClientMethodNotAllowedError,
  SavedObjectsClientFactory,
} from './saved_objects_client_factory';

const BLOCKED_METHODS = ['create', 'createPointInTimeFinder'] as const;

const createDeps = () => {
  const request = httpServerMock.createKibanaRequest();
  const scopedClient = savedObjectsClientMock.create();
  const savedObjectsServiceStart = savedObjectsServiceMock.createStartContract();
  savedObjectsServiceStart.getScopedClient.mockReturnValue(scopedClient);
  const factory = new SavedObjectsClientFactory(savedObjectsServiceStart);

  return { request, scopedClient, savedObjectsServiceStart, factory };
};

describe('SavedObjectsClientFactory.createRequestScopedSoClient', () => {
  it('passes the identical request and Security-only exclusion to Core', () => {
    const { request, savedObjectsServiceStart, factory } = createDeps();

    factory.createRequestScopedSoClient({ request, readonly: true });

    expect(savedObjectsServiceStart.getScopedClient).toHaveBeenCalledTimes(1);
    expect(savedObjectsServiceStart.getScopedClient.mock.calls[0][0]).toBe(request);
    expect(savedObjectsServiceStart.getScopedClient.mock.calls[0][1]).toEqual({
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
    expect(
      savedObjectsServiceStart.getScopedClient.mock.calls[0][1]?.excludedExtensions
    ).not.toContain(SPACES_EXTENSION_ID);
    expect(savedObjectsServiceStart.getScopedClient.mock.calls[0][1]).not.toHaveProperty(
      'includedHiddenTypes'
    );
  });

  it('returns the request-scoped client unwrapped for write access', () => {
    const { request, scopedClient, factory } = createDeps();

    expect(factory.createRequestScopedSoClient({ request, readonly: false })).toBe(scopedClient);
  });

  it.each(BLOCKED_METHODS)('throws the local error when accessing %s', (methodName) => {
    const { request, factory } = createDeps();
    const client = factory.createRequestScopedSoClient({
      request,
      readonly: true,
    });

    expect(() => client[methodName]).toThrow(StrictReadonlySoClientMethodNotAllowedError);
    expect(() => client[methodName]).toThrow(
      `Method [${methodName}] not allowed on readonly SO client`
    );
  });

  it('keeps namespace-scoped clients readonly recursively', () => {
    const { request, scopedClient, factory } = createDeps();
    const namespacedClient = savedObjectsClientMock.create();
    scopedClient.asScopedToNamespace.mockReturnValue(namespacedClient);

    const client = factory.createRequestScopedSoClient({
      request,
      readonly: true,
    });
    const scoped = client.asScopedToNamespace('space-b');

    expect(scopedClient.asScopedToNamespace).toHaveBeenCalledWith('space-b');
    expect(() => scoped.create).toThrow(StrictReadonlySoClientMethodNotAllowedError);
    expect(() => scoped.asScopedToNamespace('space-c').delete).toThrow(
      StrictReadonlySoClientMethodNotAllowedError
    );
  });

  it('delegates get and find to the Core client unchanged', async () => {
    const { request, scopedClient, factory } = createDeps();
    const savedObject = {
      id: 'policy-1',
      type: 'fleet-package-policies',
      attributes: {},
      references: [],
    };
    const findResponse = {
      saved_objects: [{ ...savedObject, score: 1 }],
      total: 1,
      per_page: 20,
      page: 1,
    };
    scopedClient.get.mockResolvedValue(savedObject);
    scopedClient.find.mockResolvedValue(findResponse);

    const client = factory.createRequestScopedSoClient({
      request,
      readonly: true,
    });
    const getOptions = { namespace: 'space-a' };
    const findOptions = { type: 'fleet-package-policies' };

    await expect(client.get('fleet-package-policies', 'policy-1', getOptions)).resolves.toBe(
      savedObject
    );
    await expect(client.find(findOptions)).resolves.toBe(findResponse);
    expect(scopedClient.get).toHaveBeenCalledWith('fleet-package-policies', 'policy-1', getOptions);
    expect(scopedClient.find).toHaveBeenCalledWith(findOptions);
  });
});
