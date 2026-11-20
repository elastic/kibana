/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { createMockedAgentRegistry } from '@kbn/agent-builder-plugin/server/test_utils/agents';
import { createAgentNotFoundError, createAgentUnavailableError } from '@kbn/agent-builder-common';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../../common';
import { getInvestigatorConnectorIds } from './inherited_connectors';

const setup = () => {
  const agentBuilder = agentBuilderMocks.createStart();
  const registry = createMockedAgentRegistry();
  agentBuilder.agents.getRegistry.mockResolvedValue(registry);
  const request = httpServerMock.createKibanaRequest();
  return { agentBuilder, registry, request };
};

describe('getInvestigatorConnectorIds', () => {
  it('returns the connectors saved on the investigator of the request space', async () => {
    const { agentBuilder, registry, request } = setup();
    registry.get.mockResolvedValue({
      id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      configuration: { connector_ids: ['github', 'pagerduty'] },
    } as never);

    await expect(getInvestigatorConnectorIds({ agentBuilder, request })).resolves.toEqual([
      'github',
      'pagerduty',
    ]);
    expect(agentBuilder.agents.getRegistry).toHaveBeenCalledWith({ request });
    expect(registry.get).toHaveBeenCalledWith(NIGHTSHIFT_INVESTIGATION_AGENT_ID);
  });

  it('returns nothing when the investigator has no saved connectors', async () => {
    const { agentBuilder, registry, request } = setup();
    registry.get.mockResolvedValue({
      id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
      configuration: {},
    } as never);

    await expect(getInvestigatorConnectorIds({ agentBuilder, request })).resolves.toEqual([]);
  });

  it('returns nothing before Agent Builder has started', async () => {
    await expect(
      getInvestigatorConnectorIds({
        agentBuilder: undefined,
        request: httpServerMock.createKibanaRequest(),
      })
    ).resolves.toEqual([]);
  });

  it('returns nothing in a space without the investigator', async () => {
    const { agentBuilder, registry, request } = setup();
    registry.get.mockRejectedValueOnce(
      createAgentNotFoundError({ agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID })
    );
    await expect(getInvestigatorConnectorIds({ agentBuilder, request })).resolves.toEqual([]);

    registry.get.mockRejectedValueOnce(
      createAgentUnavailableError({ agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID })
    );
    await expect(getInvestigatorConnectorIds({ agentBuilder, request })).resolves.toEqual([]);
  });

  it('reports any other failure', async () => {
    const { agentBuilder, registry, request } = setup();
    registry.get.mockRejectedValue(new Error('boom'));

    await expect(getInvestigatorConnectorIds({ agentBuilder, request })).rejects.toThrow('boom');
  });
});
