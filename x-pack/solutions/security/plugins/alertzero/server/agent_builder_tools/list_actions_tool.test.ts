/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { httpServerMock } from '@kbn/core/server/mocks';
import { listActionsTool } from './list_actions_tool';
import type { ActionsService } from '../services/actions/actions_service';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

const request = httpServerMock.createKibanaRequest();
const logger = () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() });

const serviceWith = (list: Mock) => ({ list } as Pick<ActionsService, 'list'>);

const run = async (
  service: Pick<ActionsService, 'list'>,
  input: { categories?: string[] } = {}
) => {
  const tool = listActionsTool(() => service);
  const result = await tool.handler(input, {
    logger: logger(),
    request,
    spaceId: 'space-a',
  } as never);
  if (!('results' in result)) {
    throw new Error('expected a standard tool result');
  }
  return result;
};

const ACTION = (over: Partial<Record<string, unknown>> = {}) => ({
  workflowId: 'system-alertzero-action-create-rule',
  name: 'Create detection rule',
  category: 'tune',
  ...over,
});

describe('listActionsTool', () => {
  it('lists all actions when called without categories', async () => {
    const list = vi.fn().mockResolvedValue({
      actions: [
        ACTION({
          inputSchema: {
            properties: {
              actionInput: { type: 'object', properties: { name: { type: 'string' } } },
            },
            required: ['actionInput'],
          },
        }),
        ACTION({ workflowId: 'a2', name: 'Isolate host', category: 'contain' }),
      ],
      total: 2,
    });
    const result = await run(serviceWith(list));
    expect(list).toHaveBeenCalledWith('space-a', request, undefined);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toMatchObject({
      total: 2,
      actions: [
        expect.objectContaining({
          inputSchema: expect.objectContaining({ required: ['actionInput'] }),
        }),
        expect.objectContaining({ workflowId: 'a2' }),
      ],
    });
  });

  it('forwards categories to the service and reports empty results explicitly', async () => {
    const list = vi.fn().mockResolvedValue({ actions: [], total: 0 });
    const result = await run(serviceWith(list), { categories: ['escalate'] });
    expect(list).toHaveBeenCalledWith('space-a', request, ['escalate']);
    expect(result.results[0].data).toMatchObject({
      total: 0,
      message: 'No actions found in categories: escalate.',
    });
  });

  it('returns an error result instead of throwing when the service fails', async () => {
    const list = vi.fn().mockRejectedValue(new Error('workflows management down'));
    const result = await run(serviceWith(list));
    expect(result.results[0].type).not.toBe(ToolResultType.other);
    expect(JSON.stringify(result.results[0])).toContain('workflows management down');
  });

  it('declares the documented tool id and read-only annotations', () => {
    const tool = listActionsTool(() => serviceWith(vi.fn()));
    expect(tool.id).toBe('security.alertzero.actions.list');
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(tool.type).toBe('builtin');
  });
});
