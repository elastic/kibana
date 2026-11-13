/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchemaBase } from '@kbn/workflows';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';
import { z } from '@kbn/zod/v4';
import { parse } from 'yaml';
import { RUNNER_WORKFLOW_ID } from './constants';
import {
  assertFloorClean,
  floorDispatchTarget,
  isFloorClean,
  rewriteFloorParentYaml,
} from './floor_parent';

const FLOOR_YAML = `version: "1"
name: Attack Discovery
settings:
  run_as: "kibana/alertzero_attack_discovery"
  concurrency:
    key: floor-attack-discovery
    strategy: cancel-in-progress
    max: 1
triggers:
  - type: scheduled
    with:
      every: "24h"
steps:
  # kept comment
  - name: run_attack_discovery
    type: workflow.execute
    with:
      workflow-id: system-security-attack-discovery-worker
      run-as-mode: inherit
      inputs:
        autonomy: "\${{ consts.autonomy }}"
        parent_run_id: "{{ execution.id }}"
`;

const rewrite = (overrides: Partial<Parameters<typeof rewriteFloorParentYaml>[0]> = {}) =>
  rewriteFloorParentYaml({
    yaml: FLOOR_YAML,
    targetWorkflowId: 'system-security-attack-discovery-review',
    inputs: { attack_discovery_id: 'ad-1', title: 'A: title' },
    ...overrides,
  });

describe('rewriteFloorParentYaml', () => {
  it('points the execute step at the target with literal inputs and keeps the rest', () => {
    const rewritten = parse(rewrite());
    expect(rewritten.steps[0].with).toEqual({
      'workflow-id': 'system-security-attack-discovery-review',
      'run-as-mode': 'inherit',
      inputs: { attack_discovery_id: 'ad-1', title: 'A: title' },
    });
    expect(rewritten.settings).toEqual(parse(FLOOR_YAML).settings);
    expect(rewritten.triggers).toEqual(parse(FLOOR_YAML).triggers);
    expect(rewrite()).toContain('# kept comment');
  });

  it('is reversible: only the step differs from the original', () => {
    const rewritten = parse(rewrite());
    const original = parse(FLOOR_YAML);
    expect({ ...rewritten, steps: undefined }).toEqual({ ...original, steps: undefined });
  });

  it('refuses a floor without run_as', () => {
    expect(() => rewrite({ yaml: FLOOR_YAML.replace(/ {2}run_as:.*\n/, '') })).toThrow(/run_as/);
  });

  it('refuses a floor with no or several workflow.execute steps', () => {
    expect(() => rewrite({ yaml: FLOOR_YAML.replace('workflow.execute', 'wait') })).toThrow(
      /exactly one/
    );
    const doubled = `${FLOOR_YAML}  - name: second\n    type: workflow.execute\n    with:\n      workflow-id: x\n`;
    expect(() => rewrite({ yaml: doubled })).toThrow(/exactly one/);
  });

  it('refuses inputs the floor would render as Liquid', () => {
    expect(() => rewrite({ inputs: { title: '{{ execution.id }}' } })).toThrow(/literal/);
    expect(() => rewrite({ inputs: { nested: ['${{ x }}'] } })).toThrow(/literal/);
  });

  it('refuses YAML that does not parse', () => {
    expect(() => rewrite({ yaml: 'steps: [\n' })).toThrow(/does not parse/);
  });
});

/** The same schema the managed-workflow registry test validates every rendered definition with. */
const ManagedWorkflowSchema = WorkflowSchemaBase.extend({
  triggers: z.array(z.object({ type: z.string().min(1) }).passthrough()).min(1),
});

describe('the floor workflow as the registry renders it', () => {
  const definition = getManagedWorkflowDefinition('system-security-floor-attack-discovery') as
    | { yamlTemplate(values: Record<string, unknown>): string }
    | undefined;
  if (!definition) throw new Error('the floor workflow is not in the managed registry');
  const rendered = definition.yamlTemplate({
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '24h',
    serviceAccountId: 'kibana/alertzero_attack_discovery',
  });

  it('is valid, dispatches the runner, and is clean', () => {
    expect(ManagedWorkflowSchema.safeParse(parse(rendered)).success).toBe(true);
    expect(floorDispatchTarget(rendered)).toBe(RUNNER_WORKFLOW_ID);
    expect(isFloorClean(rendered)).toBe(true);
    expect(() => assertFloorClean('floor', rendered)).not.toThrow();
  });

  it('is still a valid workflow after the rewrite, dispatches the review, and is not clean', () => {
    const rewritten = rewriteFloorParentYaml({
      yaml: rendered,
      targetWorkflowId: 'system-security-attack-discovery-review',
      inputs: { attack_discovery_id: 'ad-1', title: 'A: title' },
    });
    const result = ManagedWorkflowSchema.safeParse(parse(rewritten));
    expect(result.success).toBe(true);
    const step = parse(rewritten).steps.find(
      ({ type }: { type: string }) => type === 'workflow.execute'
    );
    expect(step.with).toEqual({
      'workflow-id': 'system-security-attack-discovery-review',
      'run-as-mode': 'inherit',
      inputs: { attack_discovery_id: 'ad-1', title: 'A: title' },
    });
    expect(parse(rewritten).settings).toEqual(parse(rendered).settings);
    expect(parse(rewritten).triggers).toEqual(parse(rendered).triggers);
    expect(isFloorClean(rewritten)).toBe(false);
    expect(() => assertFloorClean('floor', rewritten)).toThrow(
      /does not dispatch "system-security-attack-discovery-worker" \(it dispatches "system-security-attack-discovery-review"\).*interrupted/
    );
  });
});

describe('floorDispatchTarget', () => {
  it('is undefined for YAML that does not parse or has no single execute step', () => {
    expect(floorDispatchTarget('steps: [\n')).toBeUndefined();
    expect(floorDispatchTarget('steps: []\n')).toBeUndefined();
    expect(floorDispatchTarget(FLOOR_YAML.replace('workflow.execute', 'wait'))).toBeUndefined();
  });

  it('reads the target of the floor fixture', () => {
    expect(floorDispatchTarget(FLOOR_YAML)).toBe(RUNNER_WORKFLOW_ID);
  });
});
