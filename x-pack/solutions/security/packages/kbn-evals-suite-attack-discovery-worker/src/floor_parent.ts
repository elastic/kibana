/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { isMap, isSeq, parseDocument, type YAMLMap } from 'yaml';
import { PUBLIC_API_VERSION, RUNNER_WORKFLOW_ID } from './constants';
import { apiVersion, spacePath } from './kibana_api';

const WORKFLOW_EXECUTE_STEP_TYPE = 'workflow.execute';
const TEMPLATE_MARKERS = ['{{', '{%', '${{'] as const;

const isExecuteStep = (step: unknown): step is YAMLMap =>
  isMap(step) && step.get('type') === WORKFLOW_EXECUTE_STEP_TYPE;

const hasTemplateMarker = (value: unknown): boolean => {
  if (typeof value === 'string') return TEMPLATE_MARKERS.some((marker) => value.includes(marker));
  if (Array.isArray(value)) return value.some(hasTemplateMarker);
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(hasTemplateMarker);
  }
  return false;
};

/**
 * Returns `yaml` with its single `workflow.execute` step pointed at `targetWorkflowId` with literal
 * `inputs`; everything else stays as stored, including `settings.run_as` (the delegated identity
 * the child inherits). Throws unless there is exactly one such step and a `settings.run_as`, since
 * the child would otherwise get no delegated identity. Inputs holding Liquid markers are refused:
 * the floor would render them, so the child would not receive what the caller passed.
 */
export const rewriteFloorParentYaml = ({
  yaml,
  targetWorkflowId,
  inputs,
}: {
  yaml: string;
  targetWorkflowId: string;
  inputs: Record<string, unknown>;
}): string => {
  if (hasTemplateMarker(inputs)) {
    throw new Error('Inputs for a floor-parent run must be literal; they contain a Liquid marker.');
  }
  const document = parseDocument(yaml);
  if (document.errors.length > 0) {
    throw new Error(`The floor workflow YAML does not parse: ${document.errors[0].message}`);
  }
  if (!document.hasIn(['settings', 'run_as'])) {
    throw new Error('The floor workflow has no settings.run_as, so a child could not inherit it.');
  }
  const steps = document.get('steps');
  const executeSteps = isSeq(steps) ? steps.items.filter(isExecuteStep) : [];
  if (executeSteps.length !== 1) {
    throw new Error(
      `The floor workflow must have exactly one ${WORKFLOW_EXECUTE_STEP_TYPE} step (found ${executeSteps.length}).`
    );
  }
  const [step] = executeSteps;
  step.setIn(['with', 'workflow-id'], targetWorkflowId);
  step.setIn(['with', 'inputs'], document.createNode(inputs));
  return String(document);
};

export const floorDispatchTarget = (yaml: string): string | undefined => {
  const document = parseDocument(yaml);
  if (document.errors.length > 0) return undefined;
  const steps = document.get('steps');
  const executeSteps = isSeq(steps) ? steps.items.filter(isExecuteStep) : [];
  if (executeSteps.length !== 1) return undefined;
  const target = executeSteps[0].getIn(['with', 'workflow-id']);
  return typeof target === 'string' ? target : undefined;
};

/**
 * Whether `yaml` still dispatches `inputs` that are the registry's own rather than a run's literal
 * ones. The rendered floor passes Liquid-templated inputs (`parent_run_id: "{{ execution.id }}"`);
 * a rewrite replaces them with literals, so an inputs map with no marker is a leftover even when
 * the target is the runner.
 */
const hasRenderedInputs = (yaml: string): boolean => {
  const document = parseDocument(yaml);
  const steps = document.get('steps');
  const [step] = isSeq(steps) ? steps.items.filter(isExecuteStep) : [];
  const inputs = step?.getIn(['with', 'inputs']);
  // The rendered floor always carries an inputs map; its absence is not a clean floor.
  return isMap(inputs) && hasTemplateMarker(inputs.toJSON());
};

/**
 * Whether the floor is as the registry renders it: it dispatches the runner and still has the
 * rendered inputs.
 */
export const isFloorClean = (yaml: string): boolean =>
  floorDispatchTarget(yaml) === RUNNER_WORKFLOW_ID && hasRenderedInputs(yaml);

/** What a floor-parent run must put back exactly: the stored definition and its managed state. */
export interface FloorWorkflowState {
  yaml: string;
  definition: unknown;
  /** The stored workflow's revision counter; the server bumps it only when the trimmed YAML text changes. */
  version?: number;
  enabled: boolean;
  definitionHash?: string;
  managedVersion?: number;
  originManagedWorkflowId?: string;
}

export const readFloorWorkflow = async ({
  fetch,
  spaceId,
  floorWorkflowId,
}: {
  fetch: HttpHandler;
  spaceId: string;
  floorWorkflowId: string;
}): Promise<FloorWorkflowState> => {
  const stored = await fetch<Partial<FloorWorkflowState>>(
    spacePath(spaceId, `/api/workflows/workflow/${encodeURIComponent(floorWorkflowId)}`),
    { method: 'GET', headers: apiVersion(PUBLIC_API_VERSION) }
  );
  if (!stored.yaml) throw new Error(`Floor workflow "${floorWorkflowId}" has no stored YAML.`);
  return {
    yaml: stored.yaml,
    definition: stored.definition,
    version: stored.version,
    enabled: stored.enabled === true,
    definitionHash: stored.definitionHash,
    managedVersion: stored.managedVersion,
    originManagedWorkflowId: stored.originManagedWorkflowId,
  };
};

/** Throws unless the floor is as the registry renders it (see `isFloorClean`). */
export const assertFloorClean = (floorWorkflowId: string, yaml: string): void => {
  if (isFloorClean(yaml)) return;
  const target = floorDispatchTarget(yaml);
  let reason: string;
  if (target === RUNNER_WORKFLOW_ID) {
    reason = `Floor workflow "${floorWorkflowId}" dispatches "${RUNNER_WORKFLOW_ID}" with missing or literal inputs instead of the ones the registry renders`;
  } else if (target === undefined) {
    reason = `Floor workflow "${floorWorkflowId}" does not parse or has no single workflow.execute step with a workflow-id, so it dispatches nothing`;
  } else {
    reason = `Floor workflow "${floorWorkflowId}" does not dispatch "${RUNNER_WORKFLOW_ID}" (it dispatches "${target}")`;
  }
  throw new Error(
    `${reason}: an earlier floor-parent run was interrupted before it put the YAML back. The preflight repairs this; a run started without it must not continue.`
  );
};
