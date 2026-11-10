/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { createSlackReadTool, SLACK_READ_TOOL_ID } from './tool';

const appConnector = { id: 'elastic-apps-slack', actionTypeId: '.slack2', config: {} };
const otherConnectors = [
  { id: 'team-slack', actionTypeId: '.slack2', config: {} },
  { id: 'unassigned-slack', actionTypeId: '.slack2', config: {} },
  { id: 'telemetry', actionTypeId: '.elasticsearch', config: {} },
];

interface ToolResult {
  type: string;
  data: { message?: string };
}

const setup = (
  assigned: string[],
  { appConnected = true, agentId = 'nightshift.investigation' } = {}
) => {
  const connectors = appConnected ? [appConnector, ...otherConnectors] : otherConnectors;
  const execute = jest.fn().mockResolvedValue({ status: 'ok', data: { ok: true, channels: [] } });
  const get = jest.fn(async ({ id }: { id: string }) => {
    const connector = connectors.find((candidate) => candidate.id === id);
    if (!connector) throw SavedObjectsErrorHelpers.createGenericNotFoundError('action', id);
    return connector;
  });
  const actions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue({ get, execute }),
  } as unknown as ActionsPluginStart;
  const tool = createSlackReadTool({ getActions: () => actions });
  const run = async (args: Record<string, unknown>) => {
    const { results } = await (
      tool.handler as unknown as (
        args: Record<string, unknown>,
        context: unknown
      ) => Promise<{ results: ToolResult[] }>
    )(
      { params: {}, ...args },
      {
        request: {},
        agentConfiguration: { connector_ids: assigned },
        callContext: { toolId: SLACK_READ_TOOL_ID },
        runContext: { stack: [{ type: 'agent', agentId }] },
      }
    );
    return results[0];
  };
  return { tool, run, execute, get };
};

describe('platform.nightshift.slack_read', () => {
  it('rejects every sub-action that is not a read', () => {
    const { tool } = setup([]);
    for (const subAction of ['sendMessage', 'updateMessage', 'addReaction', 'uploadFile']) {
      expect(tool.schema.safeParse({ subAction }).success).toBe(false);
    }
  });

  it('reads through the Elastic Slack app without it being assigned, and names the others', async () => {
    const { run, execute } = setup(['telemetry', 'team-slack']);

    const result = await run({ subAction: 'listChannels' });

    expect(result.data).toEqual({
      ok: true,
      channels: [],
      connectorId: 'elastic-apps-slack',
      otherSlackConnectorIds: ['team-slack'],
    });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'elastic-apps-slack',
        params: { subAction: 'listChannels', subActionParams: {} },
      })
    );
  });

  it('adds the UTC time of each message next to its ts', async () => {
    const { run, execute } = setup([]);
    execute.mockResolvedValue({
      status: 'ok',
      data: {
        ok: true,
        messages: [{ ts: '1793653152.406569', text: 'Hello world' }, { text: 'no ts' }],
      },
    });

    const result = await run({ subAction: 'getConversationHistory', params: { channel: 'C1' } });

    expect(result.data).toMatchObject({
      messages: [
        { ts: '1793653152.406569', time: '2026-11-02T20:59:12.406Z', text: 'Hello world' },
        { text: 'no ts' },
      ],
    });
  });

  it('keeps other agents to their assigned connectors, without the Elastic Slack app', async () => {
    const { run, execute } = setup(['team-slack'], { agentId: 'custom-agent' });

    await run({ subAction: 'listChannels', connectorId: 'elastic-apps-slack' });

    expect(execute).not.toHaveBeenCalled();
  });

  it('reports a connector lookup that fails for a reason other than not found', async () => {
    const { run, execute, get } = setup(['team-slack']);
    get.mockRejectedValueOnce(new Error('cluster unavailable'));

    const result = await run({ subAction: 'listChannels' });

    expect(result.type).toBe('error');
    expect(result.data.message).toContain('cluster unavailable');
    expect(execute).not.toHaveBeenCalled();
  });

  it('names the other Slack connectors when a read fails', async () => {
    const { run, execute } = setup(['team-slack']);
    execute.mockResolvedValue({ status: 'error', message: 'relay unavailable' });

    const result = await run({ subAction: 'listChannels' });

    expect(result.type).toBe('error');
    expect(result.data.message).toContain("Other Slack connectors you can read: 'team-slack'");
  });

  it.each([
    [
      'the only Slack connector when the app is not connected',
      ['telemetry', 'team-slack'],
      false,
      undefined,
      'team-slack',
    ],
    ['an assigned Slack connector by id', ['team-slack'], true, 'team-slack', 'team-slack'],
  ])('reads through %s', async (_, assigned, appConnected, connectorId, expectedId) => {
    const { run, execute } = setup(assigned, { appConnected });

    await run({ subAction: 'listChannels', connectorId });

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ actionId: expectedId }));
  });

  it.each([
    [
      'a connector that is not Slack',
      ['telemetry', 'team-slack'],
      true,
      'telemetry',
      "Use one of: 'elastic-apps-slack', 'team-slack'",
    ],
    [
      'a Slack connector the agent is not assigned',
      ['team-slack'],
      true,
      'unassigned-slack',
      "Use one of: 'elastic-apps-slack', 'team-slack'",
    ],
    [
      'no connector when several Slack connectors are assigned and the app is not connected',
      ['team-slack', 'unassigned-slack'],
      false,
      undefined,
      "Pass connectorId, one of: 'team-slack', 'unassigned-slack'",
    ],
    [
      'no connector when no Slack connector exists',
      ['telemetry', 'deleted-connector'],
      false,
      undefined,
      'Carry on without Slack',
    ],
  ])('refuses %s', async (_, assigned, appConnected, connectorId, message) => {
    const { run, execute } = setup(assigned, { appConnected });

    const result = await run({ subAction: 'listChannels', connectorId });

    expect(result.type).toBe('error');
    expect(result.data.message).toContain(message);
    expect(execute).not.toHaveBeenCalled();
  });
});
