/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { ExecutionError } from '@kbn/workflows/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { setAttackTagsStepDefinition } from './set_attack_tags_step';
import { DETECTION_ENGINE_ATTACKS_TAGS_URL } from '../../../../common/constants';

const createMockContext = (input: Record<string, unknown>) => {
  return {
    input,
    config: {},
    rawInput: input,
    contextManager: {
      getContext: vi.fn(),
      getScopedEsClient: vi.fn(),
      renderInputTemplate: vi.fn(),
      getFakeRequest: vi.fn(),
      callKibanaApi: vi.fn(),
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'security.setAttackTags',
  } as unknown as StepHandlerContext<unknown, unknown>;
};

describe('setAttackTagsStepDefinition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the Kibana API with correct payload for a single attack ID', async () => {
    const mockContext = createMockContext({
      ids: 'attack-1',
      tags_to_add: ['tag1'],
    });
    (mockContext.contextManager.callKibanaApi as Mock).mockResolvedValue({
      status: 200,
      body: {},
    });

    const result = await setAttackTagsStepDefinition.handler(
      mockContext as unknown as Parameters<typeof setAttackTagsStepDefinition.handler>[0]
    );

    expect(mockContext.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_ATTACKS_TAGS_URL,
      body: {
        ids: ['attack-1'],
        tags: {
          tags_to_add: ['tag1'],
          tags_to_remove: [],
        },
        update_related_alerts: false,
      },
    });

    expect(result).toEqual({
      output: {
        success: true,
        message: 'Successfully added 1 tag(s) on 1 attack(s)',
      },
    });
  });

  it('calls the Kibana API with correct payload for multiple attack IDs and tags', async () => {
    const mockContext = createMockContext({
      ids: ['attack-1', 'attack-2'],
      tags_to_add: ['tag1', 'tag2'],
      tags_to_remove: ['tag3'],
      update_related_alerts: true,
    });
    (mockContext.contextManager.callKibanaApi as Mock).mockResolvedValue({
      status: 200,
      body: {},
    });

    const result = await setAttackTagsStepDefinition.handler(
      mockContext as unknown as Parameters<typeof setAttackTagsStepDefinition.handler>[0]
    );

    expect(mockContext.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_ATTACKS_TAGS_URL,
      body: {
        ids: ['attack-1', 'attack-2'],
        tags: {
          tags_to_add: ['tag1', 'tag2'],
          tags_to_remove: ['tag3'],
        },
        update_related_alerts: true,
      },
    });

    expect(result).toEqual({
      output: {
        success: true,
        message: 'Successfully added 2 tag(s) and removed 1 tag(s) on 2 attack(s)',
      },
    });
  });

  it('throws ExecutionError on API failure', async () => {
    const mockContext = createMockContext({
      ids: 'attack-1',
      tags_to_add: ['tag1'],
    });
    (mockContext.contextManager.callKibanaApi as Mock).mockResolvedValue({
      status: 400,
      body: { error: 'Bad Request' },
    });

    await expect(
      setAttackTagsStepDefinition.handler(
        mockContext as unknown as Parameters<typeof setAttackTagsStepDefinition.handler>[0]
      )
    ).rejects.toThrow(ExecutionError);
  });

  it('throws ExecutionError on network failure', async () => {
    const mockContext = createMockContext({
      ids: 'attack-1',
      tags_to_add: ['tag1'],
    });
    (mockContext.contextManager.callKibanaApi as Mock).mockRejectedValue(
      new Error('Network error')
    );

    await expect(
      setAttackTagsStepDefinition.handler(
        mockContext as unknown as Parameters<typeof setAttackTagsStepDefinition.handler>[0]
      )
    ).rejects.toThrow(ExecutionError);
  });
});
