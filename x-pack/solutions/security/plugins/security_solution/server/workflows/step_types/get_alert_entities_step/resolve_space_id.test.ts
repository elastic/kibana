/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSpaceId } from './resolve_space_id';

const createContextManager = ({
  activeSpaceId,
  workflowSpaceId,
}: {
  activeSpaceId: string;
  workflowSpaceId: string | undefined;
}) => ({
  callKibanaApi: jest
    .fn()
    .mockResolvedValue({ body: { id: activeSpaceId }, headers: {}, status: 200 }),
  getContext: jest.fn().mockReturnValue({ workflow: { spaceId: workflowSpaceId } }),
});

describe('resolveSpaceId', () => {
  it('returns the space Kibana resolves for the execution', async () => {
    const contextManager = createContextManager({
      activeSpaceId: 'agent-1',
      workflowSpaceId: 'agent-1',
    });

    expect(await resolveSpaceId(contextManager as never)).toBe('agent-1');
  });

  // `callKibanaApi` prefixes the path with the execution's own space, which no template
  // context can change.
  it('asks Kibana for the active space of the execution', async () => {
    const contextManager = createContextManager({
      activeSpaceId: 'agent-1',
      workflowSpaceId: 'agent-1',
    });

    await resolveSpaceId(contextManager as never);

    expect(contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: '/internal/spaces/_active_space',
    });
  });

  // A step test can override `workflow.spaceId` through `contextOverride`. Failing makes the
  // tampering visible instead of silently reading the execution's own space.
  it.each([['default'], ['*']])(
    'rejects a workflow.spaceId of %p that differs from the execution space',
    async (workflowSpaceId) => {
      const contextManager = createContextManager({ activeSpaceId: 'agent-1', workflowSpaceId });

      await expect(resolveSpaceId(contextManager as never)).rejects.toThrow(
        'workflow.spaceId does not match the execution space'
      );
    }
  );

  it.each([['*'], ['default,agent-1'], ['']])(
    'rejects an active space id of %p that is not a valid space id',
    async (activeSpaceId) => {
      const contextManager = createContextManager({
        activeSpaceId,
        workflowSpaceId: activeSpaceId,
      });

      await expect(resolveSpaceId(contextManager as never)).rejects.toThrow('Invalid space id');
    }
  );

  it('lets a failed lookup reject', async () => {
    const contextManager = {
      callKibanaApi: jest.fn().mockRejectedValue(new Error('HTTP 403: forbidden')),
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'agent-1' } }),
    };

    await expect(resolveSpaceId(contextManager as never)).rejects.toThrow('HTTP 403: forbidden');
  });
});
