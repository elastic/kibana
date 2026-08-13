/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { editPrivateLocationRoute } from './edit_private_location';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';

const existingLocation = {
  id: 'loc-1',
  namespaces: ['default'],
  attributes: {
    label: 'Loc',
    id: 'loc-1',
    agentPolicyId: 'ap-1',
    isServiceManaged: false,
    tags: ['t'],
  },
};

const makeRouteContext = (body: Record<string, unknown>) => {
  const response = httpServerMock.createResponseFactory();
  const routeContext = {
    request: { params: { locationId: 'loc-1' }, body },
    response,
    savedObjectsClient: {},
    monitorConfigRepository: {
      findDecryptedMonitors: jest.fn().mockResolvedValue([]),
    },
    server: {
      coreStart: {
        savedObjects: { createInternalRepository: jest.fn().mockReturnValue({}) },
      },
    },
  } as any;
  return { routeContext, response };
};

describe('editPrivateLocationRoute isAgentSharding', () => {
  afterEach(() => jest.restoreAllMocks());

  const stubRepo = (updatedAttributes = {}, existingAttributes = {}) => {
    const location = {
      ...existingLocation,
      attributes: { ...existingLocation.attributes, ...existingAttributes },
    };
    jest
      .spyOn(PrivateLocationRepository.prototype, 'getPrivateLocation')
      .mockResolvedValue(location as any);
    return jest
      .spyOn(PrivateLocationRepository.prototype, 'editPrivateLocation')
      .mockResolvedValue({
        ...location,
        attributes: { ...location.attributes, ...updatedAttributes },
      } as any);
  };

  it('persists isAgentSharding when it is the only change', async () => {
    const edit = stubRepo({ isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: true });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', expect.objectContaining({ isAgentSharding: true }));
    expect(result).toEqual(expect.objectContaining({ isAgentSharding: true }));
  });

  it('overwrites an enabled isAgentSharding flag with false', async () => {
    const edit = stubRepo({ isAgentSharding: false }, { isAgentSharding: true });
    const { routeContext } = makeRouteContext({ isAgentSharding: false });

    const result = await editPrivateLocationRoute().handler(routeContext);

    expect(edit).toHaveBeenCalledWith('loc-1', expect.objectContaining({ isAgentSharding: false }));
    expect(result).not.toHaveProperty('isAgentSharding');
  });

  it('does not write when the body omits isAgentSharding and other fields', async () => {
    const edit = stubRepo();
    const { routeContext } = makeRouteContext({});

    await editPrivateLocationRoute().handler(routeContext);

    expect(edit).not.toHaveBeenCalled();
  });
});
