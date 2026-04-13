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
import type { InitializationFlowContext } from './types';
import { FlowInitializationError, runInitializationFlows } from './flow_registry';

jest.mock('./flows/create_list_indices', () => ({
  createListIndicesInitializationFlow: {
    id: 'create-list-indices',
    spaceAware: true,
    resolveProvisionContext: jest.fn().mockResolvedValue({}),
    provision: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/initialize_security_data_views', () => ({
  initializeSecurityDataViewsFlow: {
    id: 'security-data-views' as const,
    spaceAware: true,
    resolveProvisionContext: jest.fn().mockResolvedValue({}),
    provision: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/init_prebuilt_rules', () => ({
  initPrebuiltRulesFlow: {
    id: 'init-prebuilt-rules' as const,
    runFirst: true,
    resolveProvisionContext: jest.fn().mockResolvedValue({}),
    provision: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/init_endpoint_protection', () => ({
  initEndpointProtectionFlow: {
    id: 'init-endpoint-protection' as const,
    resolveProvisionContext: jest.fn().mockResolvedValue({}),
    provision: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/init_ai_prompts', () => ({
  initAiPromptsFlow: {
    id: 'init-ai-prompts' as const,
    resolveProvisionContext: jest.fn().mockResolvedValue({}),
    provision: jest.fn().mockResolvedValue({ status: 'ready' as const, payload: null }),
  },
}));

jest.mock('./flows/init_detection_engine_rule_monitoring', () => ({
  initDetectionEngineRuleMonitoringFlow: {
    id: 'init-detection-engine-rule-monitoring' as const,
    resolveProvisionContext: jest.fn().mockResolvedValue({}),
    provision: jest.fn().mockResolvedValue({ status: 'ready' as const }),
  },
}));

const createMockContext = (): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      securitySolution: Promise.resolve({ getSpaceId: () => 'default' }),
    },
  } as unknown as InitializationFlowContext);

describe('runInitializationFlows', () => {
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    jest.clearAllMocks();
  });

  const flowA = INITIALIZATION_FLOW_CREATE_LIST_INDICES;

  it('runs a registered flow and returns its result', async () => {
    const context = createMockContext();
    const response = await runInitializationFlows([flowA], context, logger);

    expect(response.flows[flowA]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: null,
    });
  });

  it('resolves the provision context before calling provision', async () => {
    const { createListIndicesInitializationFlow } = jest.requireMock('./flows/create_list_indices');
    const mockProvisionContext = { internalListClient: {} };
    createListIndicesInitializationFlow.resolveProvisionContext.mockResolvedValueOnce(
      mockProvisionContext
    );

    const context = createMockContext();
    await runInitializationFlows([flowA], context, logger);

    expect(createListIndicesInitializationFlow.resolveProvisionContext).toHaveBeenCalledWith(
      context,
      logger
    );
    expect(createListIndicesInitializationFlow.provision).toHaveBeenCalledWith(
      mockProvisionContext,
      logger
    );
  });

  it('returns an error for an unregistered flow', async () => {
    const nonExistingFlow = 'non-existing-flow' as InitializationFlowId;
    const context = createMockContext();
    const response = await runInitializationFlows([nonExistingFlow], context, logger);

    expect(response.flows[nonExistingFlow]).toEqual({
      status: INITIALIZATION_FLOW_STATUS_ERROR,
      error: `Initialization flow '${nonExistingFlow}' is not registered`,
    });
  });

  it('returns an empty flows object when given an empty array', async () => {
    const context = createMockContext();
    const response = await runInitializationFlows([], context, logger);
    expect(response).toEqual({ flows: {} });
  });

  describe('error handling', () => {
    it('exposes the message from a FlowInitializationError', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      createListIndicesInitializationFlow.resolveProvisionContext.mockRejectedValueOnce(
        new FlowInitializationError('lists plugin is not available')
      );

      const context = createMockContext();
      const response = await runInitializationFlows([flowA], context, logger);

      expect(response.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'lists plugin is not available',
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Initialization flow 'create-list-indices' failed: lists plugin is not available"
      );
    });

    it('returns an opaque error message for unexpected errors from resolveProvisionContext', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      createListIndicesInitializationFlow.resolveProvisionContext.mockRejectedValueOnce(
        new Error('ES connection failed')
      );

      const context = createMockContext();
      const response = await runInitializationFlows([flowA], context, logger);

      expect(response.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'internal initialization flow error',
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Initialization flow 'create-list-indices' failed: ES connection failed"
      );
    });

    it('returns an opaque error message for unexpected errors from provision', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );
      createListIndicesInitializationFlow.provision.mockRejectedValueOnce(
        new Error('cluster unavailable')
      );

      const context = createMockContext();
      const response = await runInitializationFlows([flowA], context, logger);

      expect(response.flows[flowA]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_ERROR,
        error: 'internal initialization flow error',
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Initialization flow 'create-list-indices' failed: cluster unavailable"
      );
    });
  });

  it('runs multiple flows and returns all results', async () => {
    const { createListIndicesInitializationFlow } = jest.requireMock('./flows/create_list_indices');
    const nonExistingFlow = 'non-existing-flow' as InitializationFlowId;

    createListIndicesInitializationFlow.provision.mockResolvedValueOnce({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: null,
    });

    const context = createMockContext();
    const response = await runInitializationFlows([flowA, nonExistingFlow], context, logger);

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

      initPrebuiltRulesFlow.provision.mockImplementation(async () => {
        executionOrder.push('prebuilt-rules');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });
      initEndpointProtectionFlow.provision.mockImplementation(async () => {
        executionOrder.push('endpoint');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });
      initAiPromptsFlow.provision.mockImplementation(async () => {
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
        context,
        logger
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

      createListIndicesInitializationFlow.provision.mockImplementation(async () => {
        // Simulate slow execution
        await new Promise((resolve) => setTimeout(resolve, 50));
        executionOrder.push('list-indices');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });
      initPrebuiltRulesFlow.provision.mockImplementation(async () => {
        executionOrder.push('prebuilt-rules');
        return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
      });

      const context = createMockContext();
      await runInitializationFlows(
        [INITIALIZATION_FLOW_CREATE_LIST_INDICES, INITIALIZATION_FLOW_INIT_PREBUILT_RULES],
        context,
        logger
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

      initEndpointProtectionFlow.provision.mockImplementation(
        () =>
          new Promise<{ status: string; payload: null }>((resolve) => {
            endpointStarted();
            resolveEndpoint = () => resolve({ status: 'ready', payload: null });
          })
      );
      initAiPromptsFlow.provision.mockImplementation(
        () =>
          new Promise<{ status: string; payload: null }>((resolve) => {
            aiPromptsStarted();
            resolveAiPrompts = () => resolve({ status: 'ready', payload: null });
          })
      );

      const context = createMockContext();
      const promise = runInitializationFlows(
        [INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION, INITIALIZATION_FLOW_INIT_AI_PROMPTS],
        context,
        logger
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
      let resolveProvision: (value: { status: string; payload: null }) => void;
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );

      createListIndicesInitializationFlow.provision.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveProvision = resolve;
          })
      );

      const context = createMockContext();

      // Fire two concurrent requests for the same flow
      const promise1 = runInitializationFlows([flowA], context, logger);
      // Allow the first call to reach the inflight map (resolveProvisionContext is async)
      await new Promise((r) => setImmediate(r));
      const promise2 = runInitializationFlows([flowA], context, logger);

      // Resolve the single underlying execution
      resolveProvision!({ status: 'ready', payload: null });

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

      // provision was called only once
      expect(createListIndicesInitializationFlow.provision).toHaveBeenCalledTimes(1);
    });

    it('executes independently for the same flow in different spaces', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );

      createListIndicesInitializationFlow.provision.mockResolvedValue({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });

      const contextSpaceA = {
        requestHandlerContext: {
          securitySolution: Promise.resolve({ getSpaceId: () => 'space-a' }),
        },
      } as unknown as InitializationFlowContext;

      const contextSpaceB = {
        requestHandlerContext: {
          securitySolution: Promise.resolve({ getSpaceId: () => 'space-b' }),
        },
      } as unknown as InitializationFlowContext;

      await Promise.all([
        runInitializationFlows([flowA], contextSpaceA, logger),
        runInitializationFlows([flowA], contextSpaceB, logger),
      ]);

      // provision was called twice — once per space
      expect(createListIndicesInitializationFlow.provision).toHaveBeenCalledTimes(2);
    });

    it('deduplicates non-space-aware flows across different spaces', async () => {
      let resolveProvision: (value: { status: string; payload: null }) => void;
      const { initEndpointProtectionFlow } = jest.requireMock('./flows/init_endpoint_protection');

      initEndpointProtectionFlow.provision.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveProvision = resolve;
          })
      );

      const contextSpaceA = {
        requestHandlerContext: {
          securitySolution: Promise.resolve({ getSpaceId: () => 'space-a' }),
        },
      } as unknown as InitializationFlowContext;

      const contextSpaceB = {
        requestHandlerContext: {
          securitySolution: Promise.resolve({ getSpaceId: () => 'space-b' }),
        },
      } as unknown as InitializationFlowContext;

      const promise1 = runInitializationFlows(
        [INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION],
        contextSpaceA,
        logger
      );
      await new Promise((r) => setImmediate(r));
      const promise2 = runInitializationFlows(
        [INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION],
        contextSpaceB,
        logger
      );

      resolveProvision!({ status: 'ready', payload: null });

      const [response1, response2] = await Promise.all([promise1, promise2]);

      expect(response1.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });
      expect(response2.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]).toEqual({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });

      // provision was called only once — non-space-aware flows deduplicate across spaces
      expect(initEndpointProtectionFlow.provision).toHaveBeenCalledTimes(1);
    });

    it('executes a new request after a previous one completes', async () => {
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );

      createListIndicesInitializationFlow.provision.mockResolvedValue({
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: null,
      });

      const context = createMockContext();

      // First request completes
      await runInitializationFlows([flowA], context, logger);
      // Second request after the first completed — should execute fresh
      await runInitializationFlows([flowA], context, logger);

      // provision was called twice — no stale caching
      expect(createListIndicesInitializationFlow.provision).toHaveBeenCalledTimes(2);
    });

    it('deduplicates even when the flow errors', async () => {
      let rejectProvision: (error: Error) => void;
      const { createListIndicesInitializationFlow } = jest.requireMock(
        './flows/create_list_indices'
      );

      createListIndicesInitializationFlow.provision.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectProvision = reject;
          })
      );

      const context = createMockContext();

      const promise1 = runInitializationFlows([flowA], context, logger);
      // Allow the first call to reach the inflight map
      await new Promise((r) => setImmediate(r));
      const promise2 = runInitializationFlows([flowA], context, logger);

      rejectProvision!(new Error('something broke'));

      const [response1, response2] = await Promise.all([promise1, promise2]);

      // Both get the same error result
      expect(response1.flows[flowA]?.status).toBe(INITIALIZATION_FLOW_STATUS_ERROR);
      expect(response2.flows[flowA]?.status).toBe(INITIALIZATION_FLOW_STATUS_ERROR);

      // provision was called only once
      expect(createListIndicesInitializationFlow.provision).toHaveBeenCalledTimes(1);
    });
  });
});
