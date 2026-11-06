/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';

jest.mock('../../../synthetics_service/get_private_locations', () => ({
  getPrivateLocations: jest.fn(),
}));

const mockGetPrivateLocations = getPrivateLocations as jest.Mock;

describe('getPrivateLocationsAndAgentPolicies', () => {
  const savedObjectsClient = {} as any;

  beforeEach(() => {
    mockGetPrivateLocations.mockResolvedValue([]);
  });

  it('scopes the agent policy lookup to the caller space', async () => {
    const getAgentPolicies = jest.fn().mockResolvedValue([]);

    await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      { privateLocationAPI: { getAgentPolicies } } as any,
      false,
      'default'
    );

    expect(getAgentPolicies).toHaveBeenCalledWith('default');
  });

  it('looks up policies across all spaces when no space is given', async () => {
    const getAgentPolicies = jest.fn().mockResolvedValue([]);

    await getPrivateLocationsAndAgentPolicies(savedObjectsClient, {
      privateLocationAPI: { getAgentPolicies },
    } as any);

    expect(getAgentPolicies).toHaveBeenCalledWith(ALL_SPACES_ID);
  });
});
