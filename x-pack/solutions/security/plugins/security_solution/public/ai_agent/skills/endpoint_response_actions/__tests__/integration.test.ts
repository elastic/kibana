/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIntent } from '../intent_parser';
import { resolveHost } from '../host_resolver';
import { executeAction, pollActionStatus } from '../action_client';
import type { ActionResult } from '../types';

jest.mock('../host_resolver');
jest.mock('../action_client');

describe('Endpoint Response Actions Skill — full flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('parses isolate intent → resolves host → executes → polls → returns result', async () => {
    (resolveHost as jest.Mock).mockResolvedValue({
      hostName: 'WIN-PROD-042',
      agentId: 'agent-abc-123',
      isIsolated: false,
    });
    (executeAction as jest.Mock).mockResolvedValue({ actionId: 'action-001' });
    (pollActionStatus as jest.Mock).mockResolvedValue({
      actionId: 'action-001',
      status: 'completed',
      timestamp: '2024-01-15T14:32:00.000Z',
    } as ActionResult);

    const intent = parseIntent('Isolate WIN-PROD-042');
    expect(intent.actionType).toBe('isolate');
    expect(intent.hostRef?.hostName).toBe('WIN-PROD-042');

    const host = await resolveHost(intent.hostRef!.hostName);
    expect(host.agentId).toBe('agent-abc-123');

    const action = await executeAction(intent.actionType, host.agentId);
    expect(action.actionId).toBe('action-001');

    const result = await pollActionStatus(action.actionId, 30000);
    expect(result.status).toBe('completed');
  });

  it('handles unisolate flow', async () => {
    (resolveHost as jest.Mock).mockResolvedValue({
      hostName: 'WIN-PROD-042',
      agentId: 'agent-abc-123',
      isIsolated: true,
    });
    (executeAction as jest.Mock).mockResolvedValue({ actionId: 'action-002' });
    (pollActionStatus as jest.Mock).mockResolvedValue({
      actionId: 'action-002',
      status: 'completed',
      timestamp: '2024-01-15T14:33:00.000Z',
    } as ActionResult);

    const intent = parseIntent('Un-isolate WIN-PROD-042');
    expect(intent.actionType).toBe('unisolate');

    const host = await resolveHost(intent.hostRef!.hostName);
    const action = await executeAction(intent.actionType, host.agentId);
    const result = await pollActionStatus(action.actionId, 30000);
    expect(result.status).toBe('completed');
  });

  it('returns error when host is not found', async () => {
    (resolveHost as jest.Mock).mockResolvedValue(null);

    const intent = parseIntent('Isolate UNKNOWN-HOST');
    const host = await resolveHost(intent.hostRef!.hostName);
    expect(host).toBeNull();
  });
});
