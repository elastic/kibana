/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import {
  ExecutionStatus,
  StepCategory,
  WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG,
} from '@kbn/workflows';
import { of } from 'rxjs';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  createPollServerStepDefinition,
  createServerStepDefinition,
  type ServerStepDefinition,
} from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { InvestigationLocatorDefinition } from '../common/locators';
import { createRoutingTestContext } from '../server/lib/notifications/notification_routing.mock';
import type { NotificationExecution } from '../server/lib/notifications/notification_delivery';
import { handleInvestigationFailureStepDefinition } from '../server/step_definitions/handle_investigation_failure';
import { sendNotificationsStepDefinition } from '../server/step_definitions/send_notifications';
import {
  createNightshiftWorkflowFixture,
  managedYaml,
  resolveNightshiftModelForRequest,
} from './nightshift_workflow_fixture';

type Failure =
  | 'model'
  | 'setup'
  | 'persistence'
  | 'pre_execution'
  | 'agent'
  | 'handler'
  | 'step_timeout';

const setup = (failure?: Failure, persistenceFailures = 0) => {
  jest
    .mocked(resolveNightshiftModelForRequest)
    .mockReset()
    .mockResolvedValue('default-nightshift-connector');
  const fixture = createNightshiftWorkflowFixture();
  const { engine } = fixture;
  engine.dependencies.coreStart.featureFlags.getBooleanValue$.mockImplementation(
    (flag, defaultValue) => of(flag === WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG || defaultValue)
  );
  const routing = createRoutingTestContext('fake_space_id');
  const destinations = [{ type: 'slack', connector_id: 'slack', params: { channel: '#alerts' } }];
  const execute = jest.fn(async (_execution: NotificationExecution) => ({
    status: 'ok',
    data: { ts: '1.2', channel: 'C123' },
  }));
  const ensureForFailure = jest.fn(async () => {
    if (failure === 'handler') throw new Error('Failure handler unavailable');
    return 'conv-1';
  });
  const getInvestigationExecutionContext = jest.fn(async () => ({
    investigation: { investigation_id: 'inv-1', title: 'Latency' },
    conversationId: 'conv-1',
    workflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
    notificationDestinations: destinations,
  }));
  const emitter = jest.fn();
  const deps = {
    investigationLocator: new MockUrlService().locators.create(
      new InvestigationLocatorDefinition()
    ),
    getInvestigationsClient: jest.fn(() => ({
      ensureForFailure,
      getInvestigationExecutionContext,
      getLifecycleSubject: async () => ({
        subject: { type: 'manual', id: 'question' },
        triggerType: 'manual',
        startedAt: new Date().toISOString(),
      }),
    })) as never,
    getActions: () => ({ getActionsClientWithRequestInSpace: async () => ({ execute }) } as never),
    getRoutingClient: async () => routing.client,
    getTriggerEmitter: () => emitter,
  };
  let persistenceAttempts = 0;
  const selfFetch = jest.fn(async (path: string) => {
    if (path.endsWith('/_ensure')) {
      persistenceAttempts++;
      if (failure === 'persistence' || persistenceAttempts <= persistenceFailures) {
        throw new Error('Persistence unavailable');
      }
    }
    return {
      request: { url: `http://localhost:5601${path}` },
      response: new Response(JSON.stringify({ conversation_id: 'inv-1' }), { status: 200 }),
    };
  });
  jest
    .mocked(engine.dependencies.coreStart.http.selfClient.asScoped)
    .mockReturnValue({ fetch: selfFetch } as never);

  // The model and setup steps are real; only their service boundaries and the agent are faked.
  if (failure === 'model') {
    jest.mocked(resolveNightshiftModelForRequest).mockRejectedValue(new Error('Model unavailable'));
  }
  if (failure === 'setup')
    fixture.agentBuilder.ensure.mockRejectedValue(new Error('Agent setup unavailable'));
  const agent = jest.fn(async () => {
    if (failure === 'pre_execution') throw new Error('Agent pre-execution failed');
    if (failure === 'agent' || failure === 'handler') throw new Error('Agent execution failed');
    return { output: {} };
  });
  const definitions: ServerStepDefinition[] = [
    sendNotificationsStepDefinition(deps),
    handleInvestigationFailureStepDefinition(deps),
    failure === 'step_timeout'
      ? createPollServerStepDefinition({
          id: 'ai.agent',
          label: 'Waiting agent',
          category: StepCategory.Ai,
          description: 'Agent boundary stand-in',
          inputSchema: z.object({ message: z.string(), conversation_id: z.string() }),
          configSchema: z.object({}).passthrough(),
          outputSchema: z.object({}),
          poll: async () => undefined,
          policy: { strategy: 'fixed', intervalMs: 1_800_001 },
          ceilings: { maxAttempts: 100, maxWaitMs: 6_000_000 },
        })
      : createServerStepDefinition({
          id: 'ai.agent',
          label: 'Agent',
          category: StepCategory.Ai,
          description: 'Agent boundary stand-in',
          inputSchema: z.object({ message: z.string(), conversation_id: z.string() }),
          configSchema: z.object({}).passthrough(),
          outputSchema: z.object({}),
          handler: agent,
        }),
  ];
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const originalGet =
    engine.dependencies.workflowsExtensions.getStepDefinition.getMockImplementation();
  engine.dependencies.workflowsExtensions.hasStepDefinition.mockReturnValue(true);
  engine.dependencies.workflowsExtensions.getStepDefinition.mockImplementation(
    (id) => byId.get(id) ?? originalGet?.(id)
  );
  return {
    fixture,
    routing,
    execute,
    agent,
    ensureForFailure,
    emitter,
    persistenceAttempts: () => persistenceAttempts,
    run: async () => {
      await engine.runWorkflow({
        workflowYaml: managedYaml(NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID),
        inputs: {
          investigation_id: 'inv-1',
          message: 'Why is latency high?',
          notificationDestinations: destinations,
        },
      });
      await fixture.driveToTerminal();
    },
    execution: () =>
      engine.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id'),
  };
};

describe('managed investigation workflow failure handling', () => {
  it.each([
    ['model', 'Model unavailable', 1],
    ['setup', 'Agent setup unavailable', 1],
    ['persistence', 'Persistence unavailable', 1],
    ['pre_execution', 'Agent pre-execution failed', 2],
    ['agent', 'Agent execution failed', 2],
  ] as const)(
    'reports %s failure while preserving the original error',
    async (failure, reason, sends) => {
      const context = setup(failure);
      await context.run();
      expect(context.execution()?.status).toBe(ExecutionStatus.FAILED);
      expect(context.execution()?.error?.message).toContain(reason);
      expect(context.execute).toHaveBeenCalledTimes(sends);
      expect(context.execute.mock.calls.at(-1)?.[0].params.subActionParams).toMatchObject({
        text: expect.stringContaining(reason),
      });
      expect(context.ensureForFailure).toHaveBeenCalledWith('inv-1', 'fake_workflow_execution_id');
      expect(context.emitter).toHaveBeenCalledTimes(1);
      if (failure === 'persistence') {
        expect(context.persistenceAttempts()).toBe(4);
      }
      expect(
        (await context.routing.client.get())?.attempts.filter(({ phase }) => phase === 'failed')
      ).toHaveLength(1);
    }
  );

  it('does not notify failure when a persistence retry succeeds', async () => {
    const context = setup(undefined, 1);
    await context.run();
    expect(context.execution()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(context.persistenceAttempts()).toBe(2);
    expect(context.ensureForFailure).not.toHaveBeenCalled();
    expect((await context.routing.client.get())?.attempts.map(({ phase }) => phase)).toEqual([
      'started',
      'completed',
    ]);
  });

  it('preserves the agent error if the failure handler itself fails', async () => {
    const context = setup('handler');
    await context.run();
    expect(context.execution()?.status).toBe(ExecutionStatus.FAILED);
    expect(context.execution()?.error?.message).toBe('Agent execution failed');
    expect(context.ensureForFailure).toHaveBeenCalledTimes(1);
  });

  it('reports an agent step timeout through the fallback', async () => {
    const context = setup('step_timeout');
    await context.run();
    expect(context.execution()?.status).toBe(ExecutionStatus.FAILED);
    expect(context.execution()?.error?.type).toBe('TimeoutError');
    expect(context.execute).toHaveBeenCalledTimes(2);
    expect(context.execute.mock.calls.at(-1)?.[0].params.subActionParams).toMatchObject({
      text: expect.stringContaining('timeout'),
    });
    expect((await context.routing.client.get())?.executions[0].terminal_phase).toBe('failed');
  });
});
