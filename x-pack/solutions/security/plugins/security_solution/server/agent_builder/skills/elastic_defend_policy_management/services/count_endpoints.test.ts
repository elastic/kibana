/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { AgentStatusKueryHelper } from '@kbn/fleet-plugin/common/services';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';
import { ENDPOINT_METADATA_LIST_REQUIRED_AUTHZ } from '../../../../../common/endpoint/service/authz';
import type { PolicyAccessContext } from './access_context';
import { createPolicyAccessContext } from './access_context';
import { countEndpoints } from './count_endpoints';

const SPACE_ID = 'space-marketing';
const EXCLUDE_UNENROLLED_AGENTS_KUERY = `not (${AgentStatusKueryHelper.buildKueryForUnenrolledAgents()})`;

type FleetAgentStatus = Awaited<
  ReturnType<PolicyAccessContext['fleet']['agent']['getAgentStatusForAgentPolicy']>
>;

const asFleetAgentStatus = (status: Record<string, unknown>): FleetAgentStatus =>
  status as unknown as FleetAgentStatus;

const createCountAccess = async () => {
  const endpointAppContextService = createMockEndpointAppContextService();
  const getHostMetadataList = jest.fn();
  endpointAppContextService.getEndpointAuthz.mockResolvedValue(
    getEndpointAuthzInitialStateMock({
      canReadSecuritySolution: true,
      canReadPolicyManagement: true,
      canReadEndpointList: true,
      canWritePolicyManagement: false,
    })
  );
  jest.mocked(endpointAppContextService.getEndpointMetadataService).mockReturnValue({
    getHostMetadataList,
  } as unknown as ReturnType<typeof endpointAppContextService.getEndpointMetadataService>);
  const access = await createPolicyAccessContext(
    endpointAppContextService,
    { request: httpServerMock.createKibanaRequest(), spaceId: SPACE_ID },
    ENDPOINT_METADATA_LIST_REQUIRED_AUTHZ,
    jest.fn(async () => [
      { savedObjects: { getScopedClient: jest.fn().mockReturnValue({}) } },
    ]) as unknown as StartServicesAccessor
  );
  return {
    access,
    getAgentStatusForAgentPolicy: jest.spyOn(access.fleet.agent, 'getAgentStatusForAgentPolicy'),
  };
};

describe('countEndpoints', () => {
  it('returns the complete Fleet status map with one plural assignment aggregation', async () => {
    const { access, getAgentStatusForAgentPolicy } = await createCountAccess();
    const status = { all: 26, active: 20, orphaned: 1, uninstalled: 2 };
    getAgentStatusForAgentPolicy.mockResolvedValue(asFleetAgentStatus(status));

    const result = await countEndpoints(access, {
      agentPolicyIds: ['agent-a', 'agent-a', 'agent-b', 'agent-c'],
    });

    expect(getAgentStatusForAgentPolicy).toHaveBeenCalledTimes(1);
    expect(getAgentStatusForAgentPolicy).toHaveBeenCalledWith(
      undefined,
      EXCLUDE_UNENROLLED_AGENTS_KUERY,
      ['agent-a', 'agent-b', 'agent-c']
    );
    expect(result).toEqual({
      population: 'enrolled_agents',
      source: 'fleet_status_aggregation',
      status,
    });
  });

  it('returns a labelled empty enrolled-agent summary for no assignments', async () => {
    const { access, getAgentStatusForAgentPolicy } = await createCountAccess();

    await expect(countEndpoints(access, { agentPolicyIds: [] })).resolves.toEqual({
      population: 'enrolled_agents',
      source: 'no_agent_policy_assignments',
      status: {},
    });
    expect(getAgentStatusForAgentPolicy).not.toHaveBeenCalled();
  });
});
