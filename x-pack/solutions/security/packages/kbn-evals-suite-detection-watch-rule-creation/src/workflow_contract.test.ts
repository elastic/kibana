/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { PND_RULE_CREATION_WORKFLOW } from '@kbn/workflows/managed/definitions/pnd/rule_workflows';
import { DRAFT_STEP_ID, REVIEW_STEP_ID, RULE_CREATION_TOOL_ID } from './constants';
import { REQUIRED_PROMPT_CONTRACT } from './workflow_fixture';

// The definition module is the single source for both the yaml and the version, so this
// asserts exactly what the pnd plugin installs — not a copy that could drift from it.
const RULE_CREATION_YAML: string = PND_RULE_CREATION_WORKFLOW.yaml;

/**
 * Deterministic guard for the managed rule-creation workflow contract.
 *
 * The eval suite measures this workflow with LLM-scored datasets: slow, costly, and
 * noisy. Everything the suite structurally DEPENDS on is asserted here instead, so a
 * prompt or schema edit that breaks the contract fails in milliseconds rather than
 * showing up as an unexplained score drop one CI cycle later.
 *
 * Each assertion below maps to a measured failure:
 *  - quality gate wording  -> Canary Tripped scored 0 (gate never discriminated)
 *  - rule.threat wording   -> MITRE Accuracy 0.49-0.80 (prompt never asked for it)
 *  - skip-shaped output    -> a refusal must satisfy the step schema, else it errors
 *  - step ids / tool id    -> client + Tool Routing evaluator address these by name
 */
describe('installed-revision guard', () => {
  // The stack can serve an older revision than the checkout (managed definitions only
  // reinstall on Kibana start). These patterns are what assertWorkflowInstalled checks, so
  // a v2-shaped document fails setup loudly instead of scoring a workflow not under test.
  const CONTRACT = REQUIRED_PROMPT_CONTRACT.map(({ pattern }) => pattern);
  const v2Shaped =
    'steps:\n  - name: draft_creation\n    with:\n      message: |-\n        Draft a rule now.\n';

  it('rejects a stack still serving the pre-gate revision', () => {
    expect(CONTRACT.every((p) => p.test(v2Shaped))).toBe(false);
  });

  it('accepts the revision shipped in this checkout', () => {
    expect(CONTRACT.every((p) => p.test(RULE_CREATION_YAML))).toBe(true);
  });
});

describe('system-security-rule-creation contract', () => {
  const yaml: string = RULE_CREATION_YAML;
  interface JsonSchemaNode {
    type?: string;
    required?: string[];
    anyOf?: Array<{ required?: string[] }>;
    properties?: Record<string, JsonSchemaNode>;
  }
  const doc = parse(yaml) as {
    steps: Array<{
      name: string;
      type: string;
      with?: { message?: string; schema?: JsonSchemaNode };
    }>;
  };
  const draft = doc.steps.find((s) => s.name === DRAFT_STEP_ID)!;
  const prompt: string = draft.with?.message ?? '';

  it('exposes the step ids the eval client addresses by name', () => {
    const names = doc.steps.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining([DRAFT_STEP_ID, REVIEW_STEP_ID]));
  });

  it('instructs the agent to call the tool the Tool Routing evaluator scores on', () => {
    expect(prompt).toContain(RULE_CREATION_TOOL_ID);
  });

  describe('quality gate (canary defence)', () => {
    it('tells the agent to refuse unwinnable gaps rather than draft anyway', () => {
      // Assert the gate is DECLARED, not just that its conditions appear somewhere:
      // deleting the declaration line while leaving the conditions behind previously
      // survived mutation, which would ship a canary that cannot trip.
      expect(prompt).toMatch(/quality gate/i);
      expect(prompt).toMatch(/refuse to draft/i);
      expect(prompt).toMatch(/do NOT call the tool/i);
      expect(prompt).toMatch(/catch-all/i);
      expect(prompt).toMatch(/evidence is empty/i);
      expect(prompt).toMatch(/confidence is below/i);
    });

    it('defines the refusal payload the client parses as `skipped`', () => {
      expect(prompt).toContain('"skipped": true');
      expect(prompt).toContain('"reason"');
    });

    it('accepts a refusal in the step output schema', () => {
      const schema = draft.with?.schema;
      expect(schema?.properties?.skipped).toEqual({ type: 'boolean' });
      expect(schema?.properties?.reason).toEqual({ type: 'string' });
      // `rule` must NOT be unconditionally required or a refusal fails validation.
      expect(schema?.required ?? []).not.toContain('rule');
      expect(schema?.anyOf).toEqual(
        expect.arrayContaining([{ required: ['rule'] }, { required: ['skipped'] }])
      );
    });
  });

  describe('MITRE mapping (accuracy defence)', () => {
    it('asks for rule.threat to be populated from the stated technique', () => {
      expect(prompt).toMatch(/rule\.threat/);
      expect(prompt).toMatch(/tactic and technique ids and names/i);
      expect(prompt).toMatch(/sub-technique/i);
    });

    it('keeps threat a required field of the drafted rule', () => {
      const ruleSchema = draft.with?.schema?.properties?.rule;
      expect(ruleSchema?.required ?? []).toContain('threat');
    });
  });

  it('bumps the definition version so versionStrategy:auto reinstalls the change', () => {
    // Any edit to the yaml above must move this number, or running stacks keep v2.
    expect(PND_RULE_CREATION_WORKFLOW.version).toBeGreaterThanOrEqual(3);
  });
});
