/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addConnectorToNightshiftAgents,
  removeConnectorFromNightshiftAgents,
} from './nightshift_agent_connectors';

const httpError = (status: number): Error =>
  Object.assign(new Error(`HTTP ${status}`), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
  });

const createAgents = () => ({
  addConnectorToAgent: jest.fn().mockResolvedValue({}),
  removeConnectorFromAgent: jest.fn().mockResolvedValue({}),
});

describe('Nightshift agent connectors', () => {
  it('assigns a connector to the investigator, then the assistant', async () => {
    const agents = createAgents();

    await addConnectorToNightshiftAgents(agents, 'github');

    expect(agents.addConnectorToAgent.mock.calls).toEqual([
      [{ agentId: 'nightshift.investigation', connectorId: 'github' }],
      [{ agentId: 'nightshift.assistant', connectorId: 'github' }],
    ]);
  });

  it('removes a connector from the investigator, then the assistant', async () => {
    const agents = createAgents();

    await removeConnectorFromNightshiftAgents(agents, 'github');

    expect(agents.removeConnectorFromAgent.mock.calls).toEqual([
      [{ agentId: 'nightshift.investigation', connectorId: 'github' }],
      [{ agentId: 'nightshift.assistant', connectorId: 'github' }],
    ]);
  });

  it('skips the assistant in a space where it is not installed', async () => {
    const agents = createAgents();
    agents.addConnectorToAgent.mockResolvedValueOnce({}).mockRejectedValueOnce(httpError(404));

    await expect(addConnectorToNightshiftAgents(agents, 'github')).resolves.toBeUndefined();
  });

  it('reports any other assistant failure', async () => {
    const agents = createAgents();
    agents.removeConnectorFromAgent.mockResolvedValueOnce({}).mockRejectedValueOnce(httpError(403));

    await expect(removeConnectorFromNightshiftAgents(agents, 'github')).rejects.toThrow('HTTP 403');
  });

  it('leaves the assistant untouched when the investigator update fails', async () => {
    const agents = createAgents();
    agents.addConnectorToAgent.mockRejectedValueOnce(httpError(403));

    await expect(addConnectorToNightshiftAgents(agents, 'github')).rejects.toThrow('HTTP 403');
    expect(agents.addConnectorToAgent).toHaveBeenCalledTimes(1);
  });
});
