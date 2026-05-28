/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { CoreSetup } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import { getSetAlertTagsStepDefinition } from './set_alert_tags_step';
import { setAlertTagsHandler } from '../../../lib/detection_engine/routes/common/set_alert_tags_handler';

jest.mock('../../../lib/detection_engine/routes/common/set_alert_tags_handler', () => ({
  setAlertTagsHandler: jest.fn(),
}));

const mockSetAlertTagsHandler = setAlertTagsHandler as jest.MockedFunction<
  typeof setAlertTagsHandler
>;

const createMockContext = (input: Record<string, unknown>) => ({
  input,
  config: {},
  rawInput: input,
  contextManager: {
    getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
    getScopedEsClient: jest.fn().mockReturnValue({ search: jest.fn() }),
    renderInputTemplate: jest.fn(),
    getFakeRequest: jest.fn().mockReturnValue({}),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'security.detections.test',
});

const mockCore = {
  getStartServices: jest.fn().mockResolvedValue([
    {
      security: {
        authc: {
          getCurrentUser: jest.fn().mockReturnValue({ username: 'test-user' }),
        },
      },
      savedObjects: {
        getScopedClient: jest.fn().mockReturnValue({
          getCurrentSpaceId: jest.fn().mockReturnValue('default'),
        }),
      },
      uiSettings: {
        asScopedToClient: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue([]),
        }),
      },
    },
  ]),
} as unknown as CoreSetup;

const mockRuleDataClient = {
  indexNameWithNamespace: jest.fn().mockReturnValue('.alerts-security.alerts-default'),
} as unknown as IRuleDataClient;

describe('setAlertTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls setAlertTagsHandler successfully', async () => {
    mockSetAlertTagsHandler.mockResolvedValue({ status: 200 } as never);

    const step = getSetAlertTagsStepDefinition(mockCore, mockRuleDataClient);
    const context = createMockContext({
      alert_ids: ['alert-1'],
      tags: {
        tags_to_add: ['tag-1'],
        tags_to_remove: [],
      },
    });

    const result = await step.handler(context as unknown as StepHandlerContext<unknown, unknown>);

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual({ success: true });
    expect(mockSetAlertTagsHandler).toHaveBeenCalledTimes(1);

    const params = mockSetAlertTagsHandler.mock.calls[0][0];
    expect(params.request.body).toEqual({
      ids: ['alert-1'],
      tags: {
        tags_to_add: ['tag-1'],
        tags_to_remove: [],
      },
    });
    expect(params.response).toBe(kibanaResponseFactory);

    const indexPattern = await params.getIndexPattern();
    expect(indexPattern).toEqual(['.alerts-security.alerts-default']);
  });
});
