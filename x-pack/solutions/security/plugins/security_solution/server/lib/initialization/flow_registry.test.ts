/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InitializationFlowId } from '../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
  INITIALIZATION_FLOW_INIT_AI_PROMPTS,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../common/api/initialization';
import type { SecuritySolutionRequestHandlerContext } from '../../types';
import type { InitializationFlowContext } from './types';
import { runInitializationFlows } from './flow_registry';

jest.mock('./flows/create_list_indices', () => ({
  createListIndicesInitializationFlow: {
    id: 'create-list-indices',
    spaceAware: true,
    runFlow: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/initialize_security_data_views', () => ({
  initializeSecurityDataViewsFlow: {
    id: 'security-data-views' as const,
    spaceAware: true,
    runFlow: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/init_prebuilt_rules', () => ({
  initPrebuiltRulesFlow: {
    id: 'init-prebuilt-rules' as const,
    runFirst: true,
    runFlow: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/init_endpoint_protection', () => ({
  initEndpointProtectionFlow: {
    id: 'init-endpoint-protection' as const,
    runFlow: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/init_ai_prompts', () => ({
  initAiPromptsFlow: {
    id: 'init-ai-prompts' as const,
    runFlow: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/init_detection_rule_monitoring', () => ({
  initDetectionRuleMonitoringFlow: {
    id: 'init-detection-rule-monitoring' as const,
    runFlow: jest.fn().mockResolvedValue({ status: 'ready' as const }),
  },
}));

const createMockContext = (): InitializationFlowContext => ({
  requestHandlerContext: {
    securitySolution: Promise.resolve({ getSpaceId: () => 'default' }),
  } as unknown as SecuritySolutionRequestHandlerContext,
  logger: loggerMock.create(),
});

describe('runInitializationFlows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const flowA = INITIALIZATION_FLOW_CREATE_LIST_INDICES;

  it('runs a registered flow and returns its result', async () => {
    const context = createMockContext();
    const response = await runInitializationFlows([flowA], context);

    expect(response.flows[flowA]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: null,
    });
  });

  it('calls runFlow with the context containing requestHandlerContext and logger', async () => {
    const { createListIndicesInitializationFlow } = jest.requireMock('./flows/create_list_indices');

    const context = createMockContext();
    await runInitializationFlows([flowA], context);

    expect(createListIndicesInitializationFlow.runFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        requestHandlerContext: expect.anything(),
        logger: expect.anything(),
      })
    );
  });

  it('returns an error for an unregistered flow', async () => {
    const nonExistingFlow = 'non-existing-flow' as InitializationFlowId;
    const context = createMockContext();
    const response = await runInitializationFlows([nonExistingFlow], context);

    expect(response.flows[nonExistingFlow]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_ERROR,
      error: `Initialization flow '${nonExistingFlow}' is not registered`,
    });
  });

  it('returns an empty flows object when given an empty array', async () => {
    const context = createMockContext();
    const response = await runInitializationFlows([], context);
    expect(response).toEqual({ flows: {} });
  });

  describe('error handling', () => {
    it('exposes the underlying error message in the response and logs the failure', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      createListIndicesInitializationFlow.runFlow.mockRejectedValueOnce(
        new Error('ES connection failed')
      );

      const context = createMockContext();
      const response = await runInitializationFlows([flowA], context);

      expect(response.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'ES connection failed',
      });
      expect(context.logger.error).toHaveBeenCalledWith(
        "Initialization flow 'create-list-indices' failed: ES connection failed"
      );
    });

    it('falls back to a string error when a non-Error value is thrown', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      createListIndicesInitializationFlow.runFlow.mockRejectedValueOnce('a bare string');

      const context = createMockContext();
      const response = await runInitializationFlows([flowA], context);

      expect(response.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'a bare string',
      });
    });
  });

  it('runs multiple flows and returns all results', async () => {
    const { createListIndicesInitializationFlow } = jest.requireMock('./flows/create_list_indices');
    const nonExistingFlow = 'non-existing-flow' as InitializationFlowId;

    createListIndicesInitializationFlow.runFlow.mockResolvedValueOnce({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: null,
    });

    const context = createMockContext();
    const response = await runInitializationFlows([flowA, nonExistingFlow], context);

    expect(response.flows[flowA]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: null,
    });
    expect(response.flows[nonExistingFlow]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_ERROR,
      error: `Initialization flow '${nonExistingFlow}' is not registered`,
    });
  });

  describe('runFirst ordering', () => {
    it('executes runFirst flows before non-runFirst flows', async () => {
      const executionOrder: string[] = [];

      const { initPrebuiltRulesFlow } = jest.requireMock('./flows/init_prebuilt_rules');
      const { initEndpointProtectionFlow } = jest.requireMock('./flows/init_endpoint_protection');
      const { initAiPromptsFlow } = jest.requireMock('./flows/init_ai_prompts');

      initPrebuiltRulesFlow.runFlow.mockImplementation(async () => {
        executionOrder.push('prebuilt-rules');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });
      initEndpointProtectionFlow.runFlow.mockImplementation(async () => {
        executionOrder.push('endpoint');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });
      initAiPromptsFlow.runFlow.mockImplementation(async () => {
        executionOrder.push('ai-prompts');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });

      const context = createMockContext();
      await runInitializationFlows(
        [
          INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
          INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
          INITIALIZATION_FLOW_INIT_AI_PROMPTS,
        ],
        context
      );

      // prebuilt-rules has runFirst=true, so it must appear before the others
      expect(executionOrder.indexOf('prebuilt-rules')).toBe(0);
    });

    it('executes multiple runFirst flows sequentially in request order', async () => {
      const executionOrder: string[] = [];

      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      const { initPrebuiltRulesFlow } = jest.requireMock('./flows/init_prebuilt_rules');

      // Temporarily make create-list-indices runFirst for this test
      createListIndicesInitializationFlow.runFirst = true;

      createListIndicesInitializationFlow.runFlow.mockImplementation(async () => {
        // Simulate slow execution
        await new Promise((resolve) => setTimeout(resolve, 50));
        executionOrder.push('list-indices');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });
      initPrebuiltRulesFlow.runFlow.mockImplementation(async () => {
        executionOrder.push('prebuilt-rules');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });

      const context = createMockContext();
      await runInitializationFlows(
        [INITIALIZATION_FLOW_CREATE_LIST_INDICES, INITIALIZATION_FLOW_INIT_PREBUILT_RULES],
        context
      );

      // Both are runFirst: they should execute in request order (list-indices first)
      expect(executionOrder).toEqual(['list-indices', 'prebuilt-rules']);

      // Clean up
      delete createListIndicesInitializationFlow.runFirst;
    });

    it('executes non-runFirst flows in parallel', async () => {
      let resolveEndpoint: () => void;
      let resolveAiPrompts: () => void;
      const endpointStarted = jest.fn();
      const aiPromptsStarted = jest.fn();

      const { initEndpointProtectionFlow } = jest.requireMock('./flows/init_endpoint_protection');
      const { initAiPromptsFlow } = jest.requireMock('./flows/init_ai_prompts');

      initEndpointProtectionFlow.runFlow.mockImplementation(
        () =>
          new Promise<{ status: string; payload: null }>((resolve) => {
            endpointStarted();
            resolveEndpoint = () => resolve({ status: 'ready', payload: null });
          })
      );
      initAiPromptsFlow.runFlow.mockImplementation(
        () =>
          new Promise<{ status: string; payload: null }>((resolve) => {
            aiPromptsStarted();
            resolveAiPrompts = () => resolve({ status: 'ready', payload: null });
          })
      );

      const context = createMockContext();
      const promise = runInitializationFlows(
        [INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION, INITIALIZATION_FLOW_INIT_AI_PROMPTS],
        context
      );

      // Wait a tick for the promises to be created
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Both should have started before either resolves (parallel execution)
      expect(endpointStarted).toHaveBeenCalled();
      expect(aiPromptsStarted).toHaveBeenCalled();

      resolveEndpoint!();
      resolveAiPrompts!();
      await promise;
    });
  });

  describe('deduplication', () => {
    it('deduplicates concurrent executions of the same flow in the same space', async () => {
      let resolveRunFlow: (value: { status: string; payload: null }) => void;
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );

      createListIndicesInitializationFlow.runFlow.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRunFlow = resolve;
          })
      );

      const context = createMockContext();

      // Fire two concurrent requests for the same flow
      const promise1 = runInitializationFlows([flowA], context);
      // Allow the first call to reach the inflight map
      await new Promise((r) => setImmediate(r));
      const promise2 = runInitializationFlows([flowA], context);

      // Resolve the single underlying execution
      resolveRunFlow!({ status: 'ready', payload: null });

      const [response1, response2] = await Promise.all([promise1, promise2]);

      // Both get the same result
      expect(response1.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });
      expect(response2.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });

      // runFlow was called only once
      expect(createListIndicesInitializationFlow.runFlow).toHaveBeenCalledTimes(1);
    });

    it('executes independently for the same flow in different spaces', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );

      createListIndicesInitializationFlow.runFlow.mockResolvedValue({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });

      const contextSpaceA = {
        requestHandlerContext: {
          securitySolution: Promise.resolve({ getSpaceId: () => 'space-a' }),
        },
        logger: loggerMock.create(),
      } as unknown as InitializationFlowContext;

      const contextSpaceB = {
        requestHandlerContext: {
          securitySolution: Promise.resolve({ getSpaceId: () => 'space-b' }),
        },
        logger: loggerMock.create(),
      } as unknown as InitializationFlowContext;

      await Promise.all([
        runInitializationFlows([flowA], contextSpaceA),
        runInitializationFlows([flowA], contextSpaceB),
      ]);

      // runFlow was called twice -- once per space
      expect(createListIndicesInitializationFlow.runFlow).toHaveBeenCalledTimes(2);
    });

    it('deduplicates non-space-aware flows across different spaces', async () => {
      let resolveRunFlow: (value: { status: string; payload: null }) => void;
      const { initEndpointProtectionFlow } = jest.requireMock('./flows/init_endpoint_protection');

      initEndpointProtectionFlow.runFlow.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRunFlow = resolve;
          })
      );

      const contextSpaceA = {
        requestHandlerContext: {
          securitySolution: Promise.resolve({ getSpaceId: () => 'space-a' }),
        },
        logger: loggerMock.create(),
      } as unknown as InitializationFlowContext;

      const contextSpaceB = {
        requestHandlerContext: {
          securitySolution: Promise.resolve({ getSpaceId: () => 'space-b' }),
        },
        logger: loggerMock.create(),
      } as unknown as InitializationFlowContext;

      const promise1 = runInitializationFlows(
        [INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION],
        contextSpaceA
      );
      await new Promise((r) => setImmediate(r));
      const promise2 = runInitializationFlows(
        [INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION],
        contextSpaceB
      );

      resolveRunFlow!({ status: 'ready', payload: null });

      const [response1, response2] = await Promise.all([promise1, promise2]);

      expect(response1.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });
      expect(response2.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });

      // runFlow was called only once -- non-space-aware flows deduplicate across spaces
      expect(initEndpointProtectionFlow.runFlow).toHaveBeenCalledTimes(1);
    });

    it('executes a new request after a previous one completes', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );

      createListIndicesInitializationFlow.runFlow.mockResolvedValue({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });

      const context = createMockContext();

      // First request completes
      await runInitializationFlows([flowA], context);
      // Second request after the first completed — should execute fresh
      await runInitializationFlows([flowA], context);

      // runFlow was called twice — no stale caching
      expect(createListIndicesInitializationFlow.runFlow).toHaveBeenCalledTimes(2);
    });

    it('deduplicates even when the flow errors', async () => {
      let rejectRunFlow: (error: Error) => void;
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );

      createListIndicesInitializationFlow.runFlow.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectRunFlow = reject;
          })
      );

      const context = createMockContext();

      const promise1 = runInitializationFlows([flowA], context);
      // Allow the first call to reach the inflight map
      await new Promise((r) => setImmediate(r));
      const promise2 = runInitializationFlows([flowA], context);

      rejectRunFlow!(new Error('something broke'));

      const [response1, response2] = await Promise.all([promise1, promise2]);

      // Both get the same error result
      expect(response1.flows[flowA]?.status).toBe(INITIALIZATION_FLOW_STATUS_ERROR);
      expect(response2.flows[flowA]?.status).toBe(INITIALIZATION_FLOW_STATUS_ERROR);

      // runFlow was called only once
      expect(createListIndicesInitializationFlow.runFlow).toHaveBeenCalledTimes(1);
    });
  });
});
