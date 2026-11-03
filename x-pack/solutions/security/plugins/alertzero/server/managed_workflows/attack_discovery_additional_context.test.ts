/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus, type EsWorkflowExecution } from '@kbn/workflows';
import {
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { validateWorkflowInputs } from '@kbn/workflows-execution-engine/server/lib/validate_workflow_inputs';
import type { WorkflowExecutionRepository } from '@kbn/workflows-execution-engine/server/repositories/workflow_execution_repository';
import { WorkflowTemplatingEngine } from '@kbn/workflows-execution-engine/server/templating_engine';
import { AdditionalContext } from '@kbn/alertzero-common';

interface ParsedStep {
  name: string;
  steps?: ParsedStep[];
  with?: { inputs?: Record<string, unknown> } & Record<string, unknown>;
}

interface ParsedWorkflow {
  consts?: { worker_settings?: Record<string, unknown> };
  steps: ParsedStep[];
}

const definitionOf = (id: string) => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition) throw new Error(`Managed workflow ${id} is not registered`);
  return definition;
};

const templatingEngine = new WorkflowTemplatingEngine();

const findStep = (steps: ParsedStep[], name: string): ParsedStep | undefined => {
  for (const step of steps) {
    if (step.name === name) return step;
    const nested = findStep(step.steps ?? [], name);
    if (nested) return nested;
  }
  return undefined;
};

/**
 * What the engine does when a workflow starts: the provided inputs go through the same input
 * validation the engine runs, which decides whether a provided string is data or an expression.
 */
const startWorkflow = async (
  workflowId: string,
  workflow: ParsedWorkflow,
  providedInputs: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const execution = {
    id: `${workflowId}-execution`,
    workflowId,
    spaceId: 'default',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: ExecutionStatus.RUNNING,
    context: { inputs: providedInputs },
    workflowDefinition: workflow,
  } as unknown as EsWorkflowExecution;
  const repository = {
    updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  } as unknown as WorkflowExecutionRepository;

  const isValid = await validateWorkflowInputs(
    execution,
    repository,
    loggerMock.create() as unknown as Logger
  );
  expect(isValid).toBe(true);
  return (execution.context as { inputs: Record<string, unknown> }).inputs;
};

const renderStepInputs = (
  workflow: ParsedWorkflow,
  stepName: string,
  context: Record<string, unknown>
): Record<string, unknown> => {
  const inputs = findStep(workflow.steps, stepName)?.with?.inputs;
  return templatingEngine.render(inputs, context) as Record<string, unknown>;
};

/**
 * Runs an additional context through the chain a scheduled run takes: the floor renders its
 * `consts` and dispatches `with.inputs`; the runner starts (input validation) and forwards the
 * value to the batched generation workflow; that workflow starts (input validation again) and its
 * `run_batch` step reads `inputs.additional_context`. Returns what the generation step receives.
 */
const runChain = async (additionalContext?: string): Promise<unknown> => {
  const floor = parse(
    definitionOf(ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID).yamlTemplate?.({
      autonomyLevel: 'manual',
      scheduleInterval: '24h',
      settingsVersion: 1,
      extras: additionalContext === undefined ? {} : { additionalContext },
    }) ?? ''
  ) as ParsedWorkflow;
  const runner = parse(
    definitionOf(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID).yaml ?? ''
  ) as ParsedWorkflow;
  const batched = parse(
    definitionOf(ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID).yaml ?? ''
  ) as ParsedWorkflow;

  const toRunner = renderStepInputs(floor, 'run_attack_discovery', {
    consts: floor.consts,
    execution: { id: 'floor-execution' },
  });
  const runnerInputs = await startWorkflow(
    ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
    runner,
    toRunner
  );
  const toBatched = renderStepInputs(runner, 'run_generation', { inputs: runnerInputs });
  const batchedInputs = await startWorkflow(
    ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
    batched,
    toBatched
  );
  const runBatchWith = findStep(batched.steps, 'run_batch')?.with;
  return templatingEngine.render(runBatchWith?.additional_context, { inputs: batchedInputs });
};

describe('Attack Discovery additional context, floor to runner', () => {
  // Each of these is a value the settings schema accepts. The engine must hand it on unchanged.
  it.each([
    'Payment hosts are named pay-*.',
    'x ${{ kibanaUrl }}',
    '${{ kibanaUrl }} y',
    ' ${{ kibanaUrl }}',
    '${{ kibanaUrl }}\n',
    'Hosts use {{ braces }} and {% tags %}.',
    'say "hi"\nline two \\ end',
  ])('keeps the accepted value %j literal all the way to the generation step', async (text) => {
    expect(AdditionalContext.safeParse(text).success).toBe(true);

    await expect(runChain(text)).resolves.toBe(text);
  });

  it('leaves the generation input undefined, not an empty string, when no context is set', async () => {
    await expect(runChain(undefined)).resolves.toBeUndefined();
  });

  // The hazard the schema pattern guards against: a value that is wholly `${{ … }}` is evaluated by
  // the runner's input validation, so the prompt would carry the result instead of the text.
  it.each(['${{ execution.id }}', '${{ workflow.id }}'])(
    'evaluates the expression-shaped value %j, which the schema therefore rejects',
    async (text) => {
      expect(AdditionalContext.safeParse(text).success).toBe(false);

      await expect(runChain(text)).resolves.not.toBe(text);
    }
  );
});
