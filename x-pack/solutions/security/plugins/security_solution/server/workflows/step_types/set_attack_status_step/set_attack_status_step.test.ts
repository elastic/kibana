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

import { getSetAttackStatusStepDefinition } from './set_attack_status_step';
import { setWorkflowStatusHandler } from '../../../lib/detection_engine/routes/common/set_workflow_status_handler';

jest.mock('../../../lib/detection_engine/routes/common/set_workflow_status_handler', () => ({
  setWorkflowStatusHandler: jest.fn(),
}));

const mockSetWorkflowStatusHandler = setWorkflowStatusHandler as jest.MockedFunction<
  typeof setWorkflowStatusHandler
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

describe('setAttackStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls setWorkflowStatusHandler successfully without updating related alerts', async () => {
    mockSetWorkflowStatusHandler.mockResolvedValue({ status: 200 } as never);

    const step = getSetAttackStatusStepDefinition(mockCore, mockRuleDataClient);
    const context = createMockContext({
      attack_ids: ['attack-1'],
      status: 'in-progress',
      update_related_alerts: false,
    });

    const mockSearch = context.contextManager.getScopedEsClient().search as jest.Mock;
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'attack-1',
            _source: {},
          },
        ],
      },
    });

    const result = await step.handler(context as unknown as StepHandlerContext<unknown, unknown>);

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual({ success: true });
    expect(mockSetWorkflowStatusHandler).toHaveBeenCalledTimes(1);

    const params = mockSetWorkflowStatusHandler.mock.calls[0][0];
    expect(params.request.body).toEqual({
      signal_ids: ['attack-1'],
      status: 'in-progress',
      reason: undefined,
    });
    expect(params.response).toBe(kibanaResponseFactory);

    const indexPattern = await params.getIndexPattern();
    expect(indexPattern).toEqual(['.alerts-security.attack.discovery.alerts-default']);
  });

  it('calls setWorkflowStatusHandler successfully with related alerts', async () => {
    mockSetWorkflowStatusHandler.mockResolvedValue({ status: 200 } as never);

    const step = getSetAttackStatusStepDefinition(mockCore, mockRuleDataClient);
    const context = createMockContext({
      attack_ids: ['attack-1'],
      status: 'in-progress',
      update_related_alerts: true,
    });

    const mockSearch = context.contextManager.getScopedEsClient().search as jest.Mock;
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'attack-1',
            _source: {
              'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
            },
          },
        ],
      },
    });

    const result = await step.handler(context as unknown as StepHandlerContext<unknown, unknown>);

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual({ success: true });
    expect(mockSetWorkflowStatusHandler).toHaveBeenCalledTimes(1);

    const params = mockSetWorkflowStatusHandler.mock.calls[0][0];
    expect(params.request.body).toEqual({
      signal_ids: ['attack-1', 'alert-1', 'alert-2'],
      status: 'in-progress',
      reason: undefined,
    });
    expect(params.response).toBe(kibanaResponseFactory);

    const indexPattern = await params.getIndexPattern();
    expect(indexPattern).toEqual([
      '.alerts-security.alerts-default',
      '.alerts-security.attack.discovery.alerts-default',
    ]);
  });
});
