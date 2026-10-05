/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { getAgentPoliciesAsInternalUser } from '../../routes/settings/private_locations/get_agent_policies';
import { SyntheticsPrivateLocation } from './synthetics_private_location';

jest.mock('../../routes/settings/private_locations/get_agent_policies', () => ({
  getAgentPoliciesAsInternalUser: jest.fn(),
}));

const mockGetAgentPolicies = getAgentPoliciesAsInternalUser as jest.Mock;

describe('SyntheticsPrivateLocation.getAgentPolicies', () => {
  const server = { logger: { debug: jest.fn(), error: jest.fn() } } as any;

  beforeEach(() => {
    mockGetAgentPolicies.mockReset();
    mockGetAgentPolicies.mockResolvedValue([]);
  });

  it('passes the caller space to the Fleet lookup', async () => {
    await new SyntheticsPrivateLocation(server).getAgentPolicies('default');

    expect(mockGetAgentPolicies).toHaveBeenCalledWith({ server, spaceId: 'default' });
  });

  it('defaults to all spaces when no space is given', async () => {
    await new SyntheticsPrivateLocation(server).getAgentPolicies();

    expect(mockGetAgentPolicies).toHaveBeenCalledWith({ server, spaceId: ALL_SPACES_ID });
  });
});
