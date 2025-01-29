/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../mocks';
import { ensureIndicesExistsForPolicies } from './ensure_indices_exists_for_policies';
import { createPolicyDataStreamsIfNeeded as _createPolicyDataStreamsIfNeeded } from '../../fleet_integration/handlers/create_policy_datastreams';

jest.mock('../../fleet_integration/handlers/create_policy_datastreams');
const createPolicyDataStreamsIfNeededMock =
  _createPolicyDataStreamsIfNeeded as unknown as jest.Mock;

describe('Ensure indices exists for policies migration', () => {
  let endpointAppContextServicesMock: ReturnType<typeof createMockEndpointAppContextService>;

  beforeEach(() => {
    endpointAppContextServicesMock = createMockEndpointAppContextService();

    (
      endpointAppContextServicesMock.getInternalFleetServices().packagePolicy.listIds as jest.Mock
    ).mockResolvedValue({
      items: ['foo-1', 'foo-2', 'foo-3'],
    });
  });

  it('should query fleet looking for all endpoint integration policies', async () => {
    const fleetServicesMock = endpointAppContextServicesMock.getInternalFleetServices();
    await ensureIndicesExistsForPolicies(endpointAppContextServicesMock);

    expect(fleetServicesMock.packagePolicy.listIds).toHaveBeenCalledWith(expect.anything(), {
      kuery: fleetServicesMock.endpointPolicyKuery,
      perPage: 10000,
    });
  });

  it('should call createPolicyDataStreamsIfNeeded() with list of existing policies', async () => {
    await ensureIndicesExistsForPolicies(endpointAppContextServicesMock);

    expect(createPolicyDataStreamsIfNeededMock).toHaveBeenCalledWith({
      endpointServices: endpointAppContextServicesMock,
      endpointPolicyIds: ['foo-1', 'foo-2', 'foo-3'],
    });
  });
});
