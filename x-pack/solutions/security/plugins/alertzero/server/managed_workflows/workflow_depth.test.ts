/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { visitNestedSteps } from '@kbn/workflows';
import {
  ACTION_WORKFLOW_TAG,
  CREATE_PROPOSAL_WORKFLOW_ID,
  getManagedWorkflowDefinition,
  managedWorkflowDefinitions,
  RESOLVE_PROPOSAL_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { workerRegistry } from './worker_registry';

/**
 * Mirrors the default `maxWorkflowDepth` of the workflows execution engine
 * (`src/platform/plugins/shared/workflows_execution_engine/server/config.ts`). The root of an
 * execution is level 0, and a `workflow.execute` or `workflow.executeAsync` call from a workflow
 * at this level fails, so this is the deepest level a chain can reach.
 */
const MAX_WORKFLOW_DEPTH = 10;

const CHILD_WORKFLOW_STEP_TYPES: ReadonlySet<string> = new Set([
  'workflow.execute',
  'workflow.executeAsync',
]);

const parseWorkflow = (yaml: string): WorkflowYaml => parse(yaml) as WorkflowYaml;

/** Workers render from their own default settings, the way they are installed. */
const loadWorkflow = (workflowId: string): WorkflowYaml => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition) {
    throw new Error(`"${workflowId}" has no managed workflow definition`);
  }
  if ('yaml' in definition && definition.yaml) {
    return parseWorkflow(definition.yaml);
  }
  const registration = workerRegistry.get(workflowId);
  if ('yamlTemplate' in definition && definition.yamlTemplate && registration) {
    return parseWorkflow(definition.yamlTemplate(registration.settings.createDefaultValues()));
  }
  throw new Error(
    `"${workflowId}" is templated but is not a registered Worker, so it cannot render`
  );
};

/** Every workflow the proposal gate can run as a proposal's action. */
const actionWorkflowIds = managedWorkflowDefinitions
  .filter(
    (definition) =>
      'yaml' in definition && parseWorkflow(definition.yaml).tags?.includes(ACTION_WORKFLOW_TAG)
  )
  .map(({ id }) => id);

/**
 * `workflow-id` expressions whose value only exists at runtime, keyed by the workflow that
 * declares them, with every workflow each one can resolve to. An expression missing here fails
 * the test, so a new one is mapped on purpose instead of being skipped.
 */
const RUNTIME_WORKFLOW_IDS: Record<string, Record<string, readonly string[]>> = {
  [RESOLVE_PROPOSAL_WORKFLOW_ID]: { 'inputs.actionWorkflowId': actionWorkflowIds },
};

const resolveChildIds = (
  parentId: string,
  parent: WorkflowYaml,
  workflowId: string
): readonly string[] | undefined => {
  const expression = workflowId.match(/^\s*\{\{\s*(.+?)\s*\}\}\s*$/)?.[1];
  if (expression === undefined) {
    return workflowId.includes('{') ? undefined : [workflowId];
  }
  const constName = expression.match(/^consts\.(\w+)$/)?.[1];
  if (constName !== undefined) {
    const value = parent.consts?.[constName];
    return typeof value === 'string' ? [value] : undefined;
  }
  return RUNTIME_WORKFLOW_IDS[parentId]?.[expression];
};

const childCalls = (workflow: WorkflowYaml): Array<{ stepName: string; workflowId: string }> => {
  const calls: Array<{ stepName: string; workflowId: string }> = [];
  visitNestedSteps(
    [...workflow.steps, ...(workflow.settings?.['on-failure']?.fallback ?? [])],
    ({ step }) => {
      if (CHILD_WORKFLOW_STEP_TYPES.has(step.type) && 'with' in step) {
        const settings = step.with as Record<string, unknown> | undefined;
        calls.push({ stepName: step.name, workflowId: String(settings?.['workflow-id'] ?? '') });
      }
    }
  );
  return calls;
};

/** Child workflows by caller, for every workflow a Worker chain can reach. */
const children = new Map<string, Set<string>>();
const unresolved: string[] = [];

const collectChildren = (workflowId: string): void => {
  if (children.has(workflowId)) {
    return;
  }
  const targets = new Set<string>();
  children.set(workflowId, targets);

  let workflow: WorkflowYaml;
  try {
    workflow = loadWorkflow(workflowId);
  } catch (error) {
    unresolved.push(error instanceof Error ? error.message : String(error));
    return;
  }

  for (const call of childCalls(workflow)) {
    const childIds = resolveChildIds(workflowId, workflow, call.workflowId);
    if (!childIds) {
      unresolved.push(`${workflowId} > ${call.stepName}: cannot resolve "${call.workflowId}"`);
      continue;
    }
    for (const childId of childIds) {
      targets.add(childId);
      collectChildren(childId);
    }
  }
};

const cycles: string[] = [];
const deepestChains = new Map<string, readonly string[]>();

/** The longest chain of nested calls that starts at `workflowId`, itself included. */
const deepestChainFrom = (workflowId: string, ancestors: readonly string[]): readonly string[] => {
  if (ancestors.includes(workflowId)) {
    cycles.push([...ancestors.slice(ancestors.indexOf(workflowId)), workflowId].join(' → '));
    return [];
  }
  const known = deepestChains.get(workflowId);
  if (known) {
    return known;
  }
  let deepest: readonly string[] = [];
  for (const childId of children.get(workflowId) ?? []) {
    const chain = deepestChainFrom(childId, [...ancestors, workflowId]);
    if (chain.length > deepest.length) {
      deepest = chain;
    }
  }
  const chain = [workflowId, ...deepest];
  deepestChains.set(workflowId, chain);
  return chain;
};

const workerIds = workerRegistry.list().map(({ id }) => id);
workerIds.forEach(collectChildren);
const workerChains = workerIds.map((workerId) => deepestChainFrom(workerId, []));

describe('Worker workflow nesting depth', () => {
  it('should resolve every child workflow a Worker chain can start', () => {
    expect(unresolved).toEqual([]);
  });

  it('should find no cycle, which only the nesting limit would stop at runtime', () => {
    expect(cycles).toEqual([]);
  });

  it('should follow Worker chains into workflows other plugins own', () => {
    expect([...children.keys()]).toEqual(
      expect.arrayContaining([CREATE_PROPOSAL_WORKFLOW_ID, RESOLVE_PROPOSAL_WORKFLOW_ID])
    );
  });

  // Fails once a chain reaches the deepest level the engine still accepts, one level before
  // a call in it would fail at runtime.
  it('should keep every Worker chain below the nesting limit', () => {
    const chainsAtLimit = workerChains
      .filter((chain) => chain.length - 1 >= MAX_WORKFLOW_DEPTH)
      .map((chain) => `${chain.length - 1} levels: ${chain.join(' → ')}`);

    expect(chainsAtLimit).toEqual([]);
  });
});
