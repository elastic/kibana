/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import { registerDueDiligence } from './register_due_diligence';
import { runDueDiligence } from './run_check';

jest.mock('./run_check', () => ({ runDueDiligence: jest.fn() }));

const reviewed = [
  {
    candidate: 'Chronic retry storm',
    confidence: 0.8,
    alertStateChange: 'background_only' as const,
    thoughts: 'Flat across the recovery.',
  },
];

describe('registerDueDiligence', () => {
  const request = httpServerMock.createKibanaRequest();
  const runCheck = runDueDiligence as jest.Mock;

  const setup = () => {
    const registerCycleHook = jest.fn();
    registerDueDiligence({
      agentBuilder: { hooks: { registerCycleHook } } as never,
      deps: {} as never,
    });
    return registerCycleHook.mock.calls[0][0];
  };

  const execution = (
    conversation: { id?: string; access: string } = { id: 'c1', access: 'readWrite' }
  ) => ({
    conversation,
    request,
    input: { message: 'Why did the alert fire?' },
    services: {
      modelProvider: { getDefaultModel: async () => ({ connector: { connectorId: 'conn' } }) },
    },
  });

  beforeEach(() => jest.clearAllMocks());

  it('is a cycle hook bound to the investigator', () => {
    expect(setup()).toMatchObject({
      id: 'nightshift.due_diligence',
      when: { everyCycles: 6 },
      boundAgents: [NIGHTSHIFT_INVESTIGATION_AGENT_ID],
    });
  });

  it('appends the review to the agent when a hypothesis reaches the bar', async () => {
    runCheck.mockResolvedValue(reviewed);
    const handler = await setup().getHandler(execution());
    const api = { append: jest.fn() };

    await handler({ steps: [], abortSignal: new AbortController().signal }, api);

    expect(runCheck).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        conversationId: 'c1',
        question: 'Why did the alert fire?',
        connectorId: 'conn',
      })
    );
    expect(api.append).toHaveBeenCalledTimes(1);
    expect(api.append.mock.calls[0][0].text).toContain('Chronic retry storm');
  });

  it('appends nothing when no hypothesis reaches the bar', async () => {
    runCheck.mockResolvedValue([]);
    const handler = await setup().getHandler(execution());
    const api = { append: jest.fn() };

    await handler({ steps: [], abortSignal: new AbortController().signal }, api);

    expect(api.append).not.toHaveBeenCalled();
  });

  it('does not show the agent the same review twice', async () => {
    runCheck.mockResolvedValue(reviewed);
    const handler = await setup().getHandler(execution());
    const api = { append: jest.fn() };
    const cycle = { steps: [], abortSignal: new AbortController().signal };

    await handler(cycle, api);
    await handler(cycle, api);

    expect(api.append).toHaveBeenCalledTimes(1);
  });

  it('appends nothing once the call has been aborted', async () => {
    const abort = new AbortController();
    runCheck.mockImplementation(async () => {
      abort.abort();
      return reviewed;
    });
    const handler = await setup().getHandler(execution());
    const api = { append: jest.fn() };

    await handler({ steps: [], abortSignal: abort.signal }, api);

    expect(api.append).not.toHaveBeenCalled();
  });

  it('sits out a read-only run and one with no conversation', async () => {
    const { getHandler } = setup();

    expect(await getHandler(execution({ id: 'c1', access: 'readOnly' }))).toBeUndefined();
    expect(await getHandler(execution({ access: 'readWrite' }))).toBeUndefined();
  });
});
