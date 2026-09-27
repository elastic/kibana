/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  getManagedWorkflowDefinition,
  ALERTZERO_HUNT_WORKFLOW_ID,
  ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
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
  outputs?: Array<{ name: string; type: string }>;
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
 * The hunt child calls the coordinator over HTTP and writes the evidence the
 * candidate selection gate reads, so its contract with the routes and with
 * build_candidate_query.ts is pinned here rather than discovered at demo time.
 * Correlation lives on 3B under R.7.
 */
describe(ALERTZERO_HUNT_WORKFLOW_ID, () => {
  let workflow: ParsedWorkflow;

  beforeEach(() => {
    workflow = parseChild(ALERTZERO_HUNT_WORKFLOW_ID);
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
});

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
      expect.stringContaining('completed_successfully == true')
    );
  });

  it('writes the coordinator narrative as the hunt results message', () => {
    const inputs = stepNamed(workflow, 'write_hunt_results_message').with?.inputs as Record<
      string,
      string
    >;
    expect(inputs.message).toEqual(expect.stringContaining('coordinator.narrative'));
  });

  it('exposes the headline, hit, and sse_count the Worker conclusion quotes', () => {
    const emitted = stepNamed(workflow, 'emit_result').with as Record<string, unknown>;
    expect(Object.keys(emitted)).toEqual(expect.arrayContaining(['headline', 'hit', 'sse_count']));
    expect((workflow.outputs ?? []).map((output) => output.name)).toEqual(
      expect.arrayContaining(['headline', 'hit', 'sse_count'])
    );
  });
});

describe(ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID, () => {
  it('opens the story with the report facts and distinguishes a rerun', () => {
    const workflow = parseChild(ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID);
    const inputs = stepNamed(workflow, 'write_trigger_message').with?.inputs as Record<
      string,
      string
    >;
    expect(inputs.message).toEqual(expect.stringContaining('report.title'));
    expect(inputs.message).toEqual(expect.stringContaining('report.techniques'));
    expect(inputs.message).toEqual(expect.stringContaining('output.created == true'));
  });
});

describe(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID, () => {
  it('emits a packaging summary for the Worker conclusion', () => {
    const workflow = parseChild(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID);
    const emitted = stepNamed(workflow, 'emit_result').with as Record<string, unknown>;
    expect(emitted.summary).toEqual(expect.stringContaining('package_summary'));
    expect((workflow.outputs ?? []).map((output) => output.name)).toEqual(
      expect.arrayContaining(['summary'])
    );
  });
});

describe(ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID, () => {
  const renderWorker = (): ParsedWorkflow => {
    const definition = getManagedWorkflowDefinition(
      ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID
    );
    if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
      throw new Error('Missing Worker yamlTemplate');
    }
    const yamlTemplate = definition.yamlTemplate as (values: Record<string, unknown>) => string;
    return parse(
      yamlTemplate({
        settingsVersion: 1,
        autonomyLevel: 'manual',
        scheduleInterval: '4h',
        extras: { tier2When: 'always', candidateLimit: 10, fanOutMax: 10 },
      })
    ) as ParsedWorkflow;
  };

  it('threads the engine execution id, not a nonexistent workflow.runId, to every child', () => {
    const workflow = renderWorker();
    for (const name of ['find_or_create_investigation', 'hunt', 'package_report']) {
      const inputs = stepNamed(workflow, name).with?.inputs as Record<string, string>;
      expect(inputs.runId).toBe('{{ execution.id }}');
    }
  });

  it('closes each branch with the hunt headline, the packaging summary, and the execution link', () => {
    const inputs = stepNamed(renderWorker(), 'write_run_conclusion').with?.inputs as Record<
      string,
      string
    >;
    expect(inputs.message).toEqual(expect.stringContaining('steps.hunt.output.headline'));
    expect(inputs.message).toEqual(expect.stringContaining('steps.package_report.output.summary'));
    expect(inputs.message).toEqual(expect.stringContaining('steps.package_report.output.reason'));
    expect(inputs.message).toEqual(expect.stringContaining('steps.hunt.output.reason'));
    expect(inputs.message).toEqual(expect.stringContaining('execution.url'));
  });
});
