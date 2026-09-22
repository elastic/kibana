/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  getManagedWorkflowDefinition,
  ALERTZERO_CORRELATION_WORKFLOW_ID,
  ALERTZERO_HUNT_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { API_VERSIONS } from '@kbn/alertzero-common';

interface NestedStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  steps?: NestedStep[];
}

interface ParsedWorkflow {
  tags?: string[];
  steps: NestedStep[];
}

const flattenSteps = (steps: NestedStep[]): NestedStep[] =>
  steps.flatMap((step) => [step, ...(step.steps ? flattenSteps(step.steps) : [])]);

const parseChild = (workflowId: string): ParsedWorkflow => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition || !('yaml' in definition) || !definition.yaml) {
    throw new Error(`Missing managed workflow YAML for "${workflowId}"`);
  }
  return parse(definition.yaml) as ParsedWorkflow;
};

const requestSteps = (workflow: ParsedWorkflow): NestedStep[] =>
  flattenSteps(workflow.steps).filter((step) => step.type === 'kibana.request');

const stepNamed = (workflow: ParsedWorkflow, name: string): NestedStep => {
  const step = flattenSteps(workflow.steps).find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Step "${name}" not found`);
  return step;
};

/**
 * The two children call the hunt routes over HTTP and write the evidence the
 * candidate selection gate reads, so their contract with the routes and with
 * build_candidate_query.ts is pinned here rather than discovered at demo time.
 */
describe.each([ALERTZERO_HUNT_WORKFLOW_ID, ALERTZERO_CORRELATION_WORKFLOW_ID])(
  '%s',
  (workflowId) => {
    let workflow: ParsedWorkflow;

    beforeEach(() => {
      workflow = parseChild(workflowId);
    });

    it('is untagged, so the Worker owns the watch tagging', () => {
      expect(workflow.tags ?? []).toEqual([]);
    });

    it('calls the hunt routes with the version they register', () => {
      const versions = requestSteps(workflow).map(
        (step) => (step.with?.headers as Record<string, string>)['elastic-api-version']
      );
      expect(versions).toEqual(requestSteps(workflow).map(() => API_VERSIONS.internal.v1));
    });
  }
);

describe('system-security-hunt-execute', () => {
  let workflow: ParsedWorkflow;

  beforeEach(() => {
    workflow = parseChild(ALERTZERO_HUNT_WORKFLOW_ID);
  });

  it('sends the coordinator a snake_case run_id', () => {
    const body = stepNamed(workflow, 'run_hunt_coordinator').with?.body as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining(['report_id', 'run_id', 'trigger', 'tier2_when', 'technology'])
    );
  });

  it('never sends the camelCase runId the coordinator no longer accepts', () => {
    const body = stepNamed(workflow, 'run_hunt_coordinator').with?.body as Record<string, unknown>;
    expect(body).not.toHaveProperty('runId');
  });

  it('writes the evidence fields the candidate selection gate filters on', () => {
    const script = stepNamed(workflow, 'set_evidence_script').with?.evidence_script as string;
    expect(script).toEqual(expect.stringContaining('last_hunted_at'));
  });

  it('keys the evidence element by space, matching the gate', () => {
    const script = stepNamed(workflow, 'set_evidence_script').with?.evidence_script as string;
    expect(script).toEqual(expect.stringContaining('space_id'));
  });

  it('writes evidence only when the coordinator reports a completed run', () => {
    expect(stepNamed(workflow, 'write_evidence').if).toEqual(
      expect.stringContaining('completedSuccessfully == true')
    );
  });
});
