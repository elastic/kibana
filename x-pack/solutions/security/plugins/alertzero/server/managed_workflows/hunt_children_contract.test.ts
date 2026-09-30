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
  ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID,
  ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  API_VERSIONS,
  CANDIDATES_URL,
  HUNT_COORDINATOR_URL,
  HUNT_INDEX_SCOPE_URL,
  SYSTEM_SECURITY_HUNT_PACKAGE_REPORT_ID,
  SYSTEM_SECURITY_HUNT_PROPOSAL_GATE_ID,
} from '@kbn/alertzero-common';

interface NestedStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  steps?: NestedStep[];
  'on-failure'?: { continue?: boolean; fallback?: NestedStep[] };
}

interface ParsedWorkflow {
  tags?: string[];
  outputs?: Array<{ name: string; type: string }>;
  steps: NestedStep[];
}

/** Includes `on-failure` fallbacks: a step that only runs on the sad path still calls routes. */
const flattenSteps = (steps: NestedStep[]): NestedStep[] =>
  steps.flatMap((step) => [
    step,
    ...flattenSteps(step.steps ?? []),
    ...flattenSteps(step['on-failure']?.fallback ?? []),
  ]);

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

  // `buildSseAttachmentId` hashes (space, report, technique) with no run component, so a rerun
  // of the same subject collides. Without the update the surviving card keeps the first run's
  // payload, and packaging -- which matches on the current `run_id` -- cannot see the rerun at all.
  it('upserts the SSE attachment so a rerun refreshes the card instead of conflicting', () => {
    const add = stepNamed(workflow, 'add_sse_attachment');
    const fallback = add['on-failure']?.fallback ?? [];

    expect(fallback.map((step) => step.type)).toEqual(['ai.attachment.update']);
    expect(fallback[0].with?.data).toBe(add.with?.data);
  });

  it('points the SSE update at exactly the id the add used', () => {
    const add = stepNamed(workflow, 'add_sse_attachment');
    const update = stepNamed(workflow, 'update_sse_attachment');

    // Diverging here would make the update create-or-miss a different attachment, which is the
    // same stranded-rerun bug wearing a second id.
    expect(update.with?.attachment_id).toBe(add.with?.id);
    expect(update.with?.conversation_id).toBe(add.with?.conversation_id);
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

describe(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID, () => {
  // Both requeries swallow their own failure, so every settlement count has to fall
  // back to the earlier read. Reading the retry alone means a transient failure on
  // the second call discards a first call that succeeded, collapses created_count to
  // 0, and leaves the Investigation open forever with every Proposal already decided.
  it('falls back to the first requery for every settlement count', () => {
    const workflow = parseChild(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID);
    const counts = stepNamed(workflow, 'resolve_settlement_counts').with as Record<string, string>;

    for (const count of ['created_count', 'pending_count', 'executing_count']) {
      expect(counts[count]).toEqual(
        expect.stringContaining('steps.requery_proposals_retry.output')
      );
      expect(counts[count]).toEqual(
        expect.stringContaining('default: steps.requery_proposals.output')
      );
    }
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

// @kbn/alertzero-common's exported ids are checked against the real registered
// workflow ids here, not against a second copy of the same literal --
// this file already safely depends on both @kbn/workflows/managed and
// @kbn/alertzero-common, which is why this cross-check lives here rather than in
// kbn-workflows' own hunt_worker_workflows.test.ts (a platform package with no dependency
// on this solution-specific one).
describe('Hunt Watch public exports (kbn-alertzero-common)', () => {
  it('exports the two feature-child ids matching their real registered ids', () => {
    expect(SYSTEM_SECURITY_HUNT_PACKAGE_REPORT_ID).toBe(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID);
    expect(SYSTEM_SECURITY_HUNT_PROPOSAL_GATE_ID).toBe(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID);
  });

  // No `kibana.request` step in any of the five hunt YAMLs calls a route path that
  // isn't one of the exported constants above -- a stale or hand-typed path string
  // would otherwise only 404 at runtime, on the first sweep that reaches that step.
  describe('every kibana.request step across the five hunt YAMLs', () => {
    const KNOWN_ROUTE_PATHS = new Set<string>([
      HUNT_INDEX_SCOPE_URL,
      CANDIDATES_URL,
      HUNT_COORDINATOR_URL,
      // main's own public package, not alertzero's -- Hunt Watch calls it but does not
      // own it, so it is not one of this package's exports.
      '/internal/proposals',
    ]);
    const SPACE_PREFIX = '/s/{{ workflow.spaceId }}';
    const stripSpacePrefix = (path: string): string | undefined =>
      path.startsWith(SPACE_PREFIX) ? path.slice(SPACE_PREFIX.length) : undefined;

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
        })
      ) as ParsedWorkflow;
    };

    const rawPaths = [
      renderWorker(),
      parseChild(ALERTZERO_HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID),
      parseChild(ALERTZERO_HUNT_WORKFLOW_ID),
      parseChild(ALERTZERO_HUNT_PACKAGE_REPORT_WORKFLOW_ID),
      parseChild(ALERTZERO_HUNT_PROPOSAL_GATE_WORKFLOW_ID),
    ]
      .flatMap((workflow) => requestSteps(workflow))
      .map((step) => step.with?.path)
      .filter((path): path is string => typeof path === 'string');

    it('calls at least one route', () => {
      expect(rawPaths.length).toBeGreaterThan(0);
    });

    it('is space-addressed rather than an unconditional /s/default', () => {
      expect(rawPaths.filter((path) => stripSpacePrefix(path) === undefined)).toEqual([]);
    });

    it('calls a known route path', () => {
      const strippedPaths = rawPaths.map(stripSpacePrefix).filter((path): path is string => !!path);

      expect(strippedPaths.filter((path) => !KNOWN_ROUTE_PATHS.has(path))).toEqual([]);
    });
  });
});
