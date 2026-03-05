/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InitializationFlowId } from '../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from './types';
import { createInitializationFlowRegistry } from './flow_registry';
import type { InitializationFlowRegistry } from './flow_registry';

const createMockContext = (): InitializationFlowContext =>
  ({
    requestHandlerContext: {},
    logger: loggerMock.create(),
  } as unknown as InitializationFlowContext);

const createFlow = (
  id: InitializationFlowId,
  overrides: Partial<Omit<InitializationFlowDefinition, 'id'>> = {}
): InitializationFlowDefinition => ({
  id,
  provision: jest.fn().mockResolvedValue({ status: 'ready' }),
  ...overrides,
});

describe('InitializationFlowRegistry', () => {
  let registry: InitializationFlowRegistry;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    registry = createInitializationFlowRegistry(logger);
  });

  const flowA = 'create-list-indices'
  const flowB = 'rule-monitoring-setup'
  const flowC = 'bootstrap-prebuilt-rules'

  describe('register', () => {
    it('registers a flow and logs a debug message', () => {
      registry.register(createFlow(flowA));
      expect(logger.debug).toHaveBeenCalledWith(
        `Registered initialization flow: ${flowA}`
      );
    });

    it('throws when registering a duplicate flow id', () => {
      registry.register(createFlow(flowA));
      expect(() => registry.register(createFlow(flowA))).toThrow(
        `Initialization flow '${flowA}' is already registered`
      );
    });

    it('throws when a flow declares itself as a dependency', () => {
      expect(() =>
        registry.register(createFlow(flowA, { dependencies: [flowA] }))
      ).toThrow(
        `Failed to register initialization flow '${flowA}': flow cannot depend on itself`
      );
    });
  });

  describe('run', () => {
    const context = createMockContext();

    it('runs a single flow and returns its result', async () => {
      registry.register(createFlow(flowA));

      const response = await registry.run([flowA], context);

      expect(response.flows[flowA]).toEqual({ status: 'ready' });
    });

    it('returns an error for an unregistered flow', async () => {
      const response = await registry.run([flowA], context);

      expect(response.flows[flowA]).toEqual({
        status: 'error',
        error: `Initialization flow '${flowA}' is not registered`,
      });
    });

    it('catches thrown errors from provision and reports them', async () => {
      registry.register(
        createFlow(flowA, {
          provision: jest.fn().mockRejectedValue(new Error('ES connection failed')),
        })
      );

      const response = await registry.run([flowA], context);

      expect(response.flows[flowA]).toEqual({
        status: 'error',
        error: 'ES connection failed',
      });
      expect(logger.error).toHaveBeenCalledWith(
        `Initialization flow '${flowA}' failed: ES connection failed`
      );
    });

    it('runs multiple independent flows and returns all results', async () => {
      registry.register(createFlow(flowA));
      registry.register(createFlow(flowB));

      const response = await registry.run(
        [flowA, flowB],
        context
      );

      expect(response.flows[flowA]).toEqual({ status: 'ready' });
      expect(response.flows[flowB]).toEqual({ status: 'ready' });
    });

    it('allows partial success when one flow fails and another succeeds', async () => {
      registry.register(
        createFlow(flowA, {
          provision: jest.fn().mockRejectedValue(new Error('failed')),
        })
      );
      registry.register(createFlow(flowB));

      const response = await registry.run(
        [flowA, flowB],
        context
      );

      expect(response.flows[flowA]?.status).toBe('error');
      expect(response.flows[flowB]?.status).toBe('ready');
    });

    it('passes the context to each provision function', async () => {
      const provision = jest.fn().mockResolvedValue({ status: 'ready' });
      registry.register(createFlow(flowA, { provision }));

      await registry.run([flowA], context);

      expect(provision).toHaveBeenCalledWith(context);
    });

    it('runs independent flows in parallel within the same level', async () => {
      const executionOrder: string[] = [];

      registry.register(
        createFlow(flowA, {
          provision: jest.fn(async () => {
            executionOrder.push('create-list-indices:start');
            await new Promise((r) => setTimeout(r, 50));
            executionOrder.push('create-list-indices:end');
            return { status: 'ready' as const };
          }),
        })
      );

      registry.register(
        createFlow(flowB, {
          provision: jest.fn(async () => {
            executionOrder.push('rule-monitoring-setup:start');
            await new Promise((r) => setTimeout(r, 10));
            executionOrder.push('rule-monitoring-setup:end');
            return { status: 'ready' as const };
          }),
        })
      );

      await registry.run([flowA, flowB], context);

      expect(executionOrder[0]).toBe('create-list-indices:start');
      expect(executionOrder[1]).toBe('rule-monitoring-setup:start');
      expect(executionOrder[2]).toBe('rule-monitoring-setup:end');
      expect(executionOrder[3]).toBe('create-list-indices:end');
    });
  });

  describe('dependency resolution', () => {
    const context = createMockContext();

    it('runs a dependency before its dependent', async () => {
      const executionOrder: string[] = [];

      registry.register(
        createFlow(flowA, {
          provision: jest.fn(async () => {
            executionOrder.push(flowA);
            return { status: 'ready' as const };
          }),
        })
      );

      registry.register(
        createFlow(flowB, {
          dependencies: [flowA],
          provision: jest.fn(async () => {
            executionOrder.push(flowB);
            return { status: 'ready' as const };
          }),
        })
      );

      await registry.run([flowB], context);

      expect(executionOrder).toEqual([flowA, flowB]);
    });

    it('auto-includes transitive dependencies not explicitly requested', async () => {
      const listProvision = jest.fn().mockResolvedValue({ status: 'ready' });
      const monitorProvision = jest.fn().mockResolvedValue({ status: 'ready' });
      const rulesProvision = jest.fn().mockResolvedValue({ status: 'ready' });

      registry.register(createFlow(flowA, { provision: listProvision }));

      registry.register(
        createFlow(flowB, {
          dependencies: [flowA],
          provision: monitorProvision,
        })
      );

      registry.register(
        createFlow(flowC, {
          dependencies: [flowB],
          provision: rulesProvision,
        })
      );

      const response = await registry.run([flowC], context);

      expect(listProvision).toHaveBeenCalled();
      expect(monitorProvision).toHaveBeenCalled();
      expect(rulesProvision).toHaveBeenCalled();

      expect(response.flows[flowA]?.status).toBe('ready');
      expect(response.flows[flowB]?.status).toBe('ready');
      expect(response.flows[flowC]?.status).toBe('ready');
    });

    it('runs a full chain in the correct order: A → B → C', async () => {
      const executionOrder: string[] = [];

      registry.register(
        createFlow(flowA, {
          provision: jest.fn(async () => {
            executionOrder.push(flowA);
            return { status: 'ready' as const };
          }),
        })
      );

      registry.register(
        createFlow(flowB, {
          dependencies: [flowA],
          provision: jest.fn(async () => {
            executionOrder.push(flowB);
            return { status: 'ready' as const };
          }),
        })
      );

      registry.register(
        createFlow(flowC, {
          dependencies: [flowB],
          provision: jest.fn(async () => {
            executionOrder.push(flowC);
            return { status: 'ready' as const };
          }),
        })
      );

      await registry.run([flowC], context);

      expect(executionOrder).toEqual([
        flowA,
        flowB,
        flowC,
      ]);
    });

    it('runs a diamond dependency correctly: C depends on A and B, A and B are independent', async () => {
      const executionOrder: string[] = [];

      registry.register(
        createFlow(flowA, {
          provision: jest.fn(async () => {
            executionOrder.push(flowA);
            return { status: 'ready' as const };
          }),
        })
      );

      registry.register(
        createFlow(flowB, {
          provision: jest.fn(async () => {
            executionOrder.push(flowB);
            return { status: 'ready' as const };
          }),
        })
      );

      registry.register(
        createFlow(flowC, {
          dependencies: [flowA, flowB],
          provision: jest.fn(async () => {
            executionOrder.push(flowC);
            return { status: 'ready' as const };
          }),
        })
      );

      await registry.run([flowC], context);

      const rulesIdx = executionOrder.indexOf(flowC);
      const listIdx = executionOrder.indexOf(flowA);
      const monitorIdx = executionOrder.indexOf(flowB);

      expect(listIdx).toBeLessThan(rulesIdx);
      expect(monitorIdx).toBeLessThan(rulesIdx);
      // A and B should both run before C (level 0 before level 1)
      expect(listIdx).toBeLessThan(2);
      expect(monitorIdx).toBeLessThan(2);
    });

    it('skips a dependent when its dependency fails', async () => {
      const rulesProvision = jest.fn().mockResolvedValue({ status: 'ready' });

      registry.register(
        createFlow(flowA, {
          provision: jest.fn().mockRejectedValue(new Error('creation failed')),
        })
      );

      registry.register(
        createFlow(flowB, {
          dependencies: [flowA],
          provision: rulesProvision,
        })
      );

      const response = await registry.run(
        [flowA, flowB],
        context
      );

      expect(response.flows[flowA]?.status).toBe('error');
      expect(response.flows[flowB]).toEqual({
        status: 'error',
        error: 'Skipped due to failed dependency',
      });
      expect(rulesProvision).not.toHaveBeenCalled();
    });

    it('cascades failure through a transitive dependency chain', async () => {
      const monitorProvision = jest.fn().mockResolvedValue({ status: 'ready' });
      const rulesProvision = jest.fn().mockResolvedValue({ status: 'ready' });

      registry.register(
        createFlow(flowA, {
          provision: jest.fn().mockRejectedValue(new Error('failed')),
        })
      );

      registry.register(
        createFlow(flowB, {
          dependencies: [flowA],
          provision: monitorProvision,
        })
      );

      registry.register(
        createFlow(flowC, {
          dependencies: [flowB],
          provision: rulesProvision,
        })
      );

      const response = await registry.run([flowC], context);

      expect(response.flows[flowA]?.status).toBe('error');
      expect(response.flows[flowB]?.status).toBe('error');
      expect(response.flows[flowC]?.status).toBe('error');

      expect(monitorProvision).not.toHaveBeenCalled();
      expect(rulesProvision).not.toHaveBeenCalled();
    });

    it('runs unrelated flows even when a dependency chain fails', async () => {
      const monitorProvision = jest.fn().mockResolvedValue({ status: 'ready' });

      registry.register(
        createFlow(flowA, {
          provision: jest.fn().mockRejectedValue(new Error('failed')),
        })
      );

      registry.register(
        createFlow(flowC, {
          dependencies: [flowA],
          provision: jest.fn().mockResolvedValue({ status: 'ready' }),
        })
      );

      registry.register(
        createFlow(flowB, {
          provision: monitorProvision,
        })
      );

      const response = await registry.run(
        [flowC, flowB],
        context
      );

      expect(response.flows[flowA]?.status).toBe('error');
      expect(response.flows[flowC]?.status).toBe('error');
      expect(response.flows[flowB]?.status).toBe('ready');
      expect(monitorProvision).toHaveBeenCalled();
    });

    it('does not re-run a dependency that is also explicitly requested', async () => {
      const listProvision = jest.fn().mockResolvedValue({ status: 'ready' });

      registry.register(createFlow(flowA, { provision: listProvision }));

      registry.register(
        createFlow(flowB, {
          dependencies: [flowA],
          provision: jest.fn().mockResolvedValue({ status: 'ready' }),
        })
      );

      await registry.run([flowA, flowB], context);

      expect(listProvision).toHaveBeenCalledTimes(1);
    });

    it('handles a flow with no dependencies alongside a flow with dependencies', async () => {
      const executionOrder: string[] = [];

      registry.register(
        createFlow(flowA, {
          provision: jest.fn(async () => {
            executionOrder.push(flowA);
            return { status: 'ready' as const };
          }),
        })
      );

      registry.register(
        createFlow(flowB, {
          provision: jest.fn(async () => {
            executionOrder.push(flowB);
            return { status: 'ready' as const };
          }),
        })
      );

      registry.register(
        createFlow(flowC, {
          dependencies: [flowA],
          provision: jest.fn(async () => {
            executionOrder.push(flowC);
            return { status: 'ready' as const };
          }),
        })
      );

      await registry.run(
        [flowC, flowB],
        context
      );

      const monitorIdx = executionOrder.indexOf(flowB);
      const listIdx = executionOrder.indexOf(flowA);
      const rulesIdx = executionOrder.indexOf(flowC);

      // create-list-indices and rule-monitoring-setup are both level 0 (parallel)
      expect(listIdx).toBeLessThan(rulesIdx);
      expect(monitorIdx).toBeLessThan(rulesIdx);
    });

    it('returns an empty flows object when given an empty array', async () => {
      const response = await registry.run([], context);
      expect(response).toEqual({ flows: {} });
    });

    it('throws at registration time on a direct circular dependency (A → B → A)', () => {
      registry.register(createFlow(flowA, { dependencies: [flowB] }));

      expect(() => registry.register(createFlow(flowB, { dependencies: [flowA] }))).toThrow(
        `Failed to register initialization flow '${flowB}': ` +
          `circular dependency detected: ${flowB} → ${flowA} → ${flowB}`
      );
    });

    it('throws at registration time when a flow lists itself in dependencies', () => {
      registry.register(createFlow(flowA));
      registry.register(createFlow(flowB, { dependencies: [flowA] }));

      expect(() =>
        registry.register(createFlow(flowC, { dependencies: [flowB, flowC] }))
      ).toThrow(/cannot depend on itself/);
    });

    it('throws at registration time on a transitive cycle (A → B → C → A)', () => {
      registry.register(createFlow(flowA, { dependencies: [flowC] }));
      registry.register(createFlow(flowB, { dependencies: [flowA] }));

      expect(() => registry.register(createFlow(flowC, { dependencies: [flowB] }))).toThrow(
        `Failed to register initialization flow '${flowC}': ` +
          `circular dependency detected: ${flowC} → ${flowB} → ${flowA} → ${flowC}`
      );
    });
  });
});
