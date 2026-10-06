/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  buildFieldsZodValidator,
  createWorkflowLiquidEngine,
  WorkflowSchema,
} from '@kbn/workflows';
import { FP_TP_VERDICT_RULES } from '../world';
import { readSampleWorkflowYaml } from './sample_workflow_yaml';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean };
  'connector-id-by-feature'?: string;
  'agent-id'?: string;
}

interface YamlWorkflow {
  steps: YamlStep[];
  consts?: Record<string, unknown>;
  outputs?: Parameters<typeof buildFieldsZodValidator>[0];
  settings?: { timeout?: string };
  triggers?: Array<{
    type: string;
    inputs?: {
      properties?: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  }>;
}

const yaml = readSampleWorkflowYaml();
const workflow = parse(yaml) as YamlWorkflow;
const stepIn = (name: string): YamlStep | undefined =>
  workflow.steps.find((step) => step.name === name);
const collapseWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();
const liquid = createWorkflowLiquidEngine();
const evaluate = (expression: unknown, context: Record<string, unknown>): unknown =>
  liquid.evalValueSync(
    String(expression)
      .replace(/^\$\{\{/, '')
      .replace(/\}\}$/, '')
      .trim(),
    context
  );

const completeOutput = {
  attack_discovery_id: 'ad-1',
  investigation_id: 'inv-1',
  workflow_id: 'wf-1',
  workflow_version: 1,
  coverage: {
    alerts: { seen: 2, total: 2 },
    entities: { seen: 1 },
    events: { seen: 3, cap: 50, truncated: false },
  },
  payload: { verdict: 'inconclusive', summary_markdown: 'A summary' },
  checks: [],
  claims: {},
};

describe('sample FP/TP analysis workflow', () => {
  it('passes strict workflow schema validation', () => {
    const result = WorkflowSchema.safeParse(parse(yaml));
    expect(result.success ? null : result.error.issues).toBeNull();
  });

  it('takes exactly the attack and the Investigation as inputs', () => {
    expect(Object.keys(workflow.triggers?.[0]?.inputs?.properties ?? {}).sort()).toEqual([
      'attack_discovery_id',
      'investigation_id',
    ]);
  });

  it('rejects any other input', () => {
    expect(workflow.triggers?.[0]?.inputs?.additionalProperties).toBe(false);
  });

  it('returns a ten-minute hard timeout', () => {
    expect(workflow.settings?.timeout).toBe('10m');
  });

  it.each(['require_attack_discovery', 'require_cited_alerts', 'require_supported_verdict'])(
    'fails the run from %s',
    (name) => {
      expect(stepIn(name)?.type).toBe('workflow.fail');
    }
  );

  it('ends with a workflow.output step', () => {
    expect(workflow.steps[workflow.steps.length - 1]?.type).toBe('workflow.output');
  });

  it('does not run a claim-verification gate', () => {
    expect(workflow.steps.map(({ name }) => name).filter((name) => /verif/i.test(name))).toEqual(
      []
    );
  });

  it.each(['load_entities', 'load_events'])('continues when optional source %s fails', (name) => {
    expect(stepIn(name)?.['on-failure']?.continue).toBe(true);
  });

  it('returns the verdict rules that deriveFpTpOutcome implements', () => {
    const [, rules = ''] =
      /Choose the verdict by the first rule that matches:\n([\s\S]*?)\n\s*\n/.exec(yaml) ?? [];
    expect(collapseWhitespace(rules)).toBe(collapseWhitespace(FP_TP_VERDICT_RULES));
  });

  it('routes the agent through the AlertZero reasoning feature', () => {
    expect(stepIn('analyze')?.['connector-id-by-feature']).toBe('alertzero_reasoning');
  });

  it('gives the agent no tools', () => {
    expect(stepIn('analyze')?.with?.configuration_overrides).toEqual({
      enable_elastic_capabilities: false,
      tools: [],
      skill_ids: [],
    });
  });

  describe('the missing-discovery guard', () => {
    const guard = (value: number): unknown =>
      evaluate(stepIn('require_attack_discovery')?.if, {
        steps: { load_attack_discovery: { output: { hits: { total: { value } } } } },
      });

    it('returns true when the discovery is missing', () => {
      expect(guard(0)).toBe(true);
    });

    it('returns false when the discovery is found', () => {
      expect(guard(1)).toBe(false);
    });
  });

  describe('the cited-alert guard', () => {
    const guard = (found: number, cited: number): unknown =>
      evaluate(stepIn('require_cited_alerts')?.if, {
        steps: { count_alerts: { output: { found, cited } } },
      });

    it('returns true when a cited alert is missing', () => {
      expect(guard(3, 4)).toBe(true);
    });

    it('returns false when every cited alert is found', () => {
      expect(guard(4, 4)).toBe(false);
    });
  });

  describe('count_alerts', () => {
    const context = {
      steps: {
        load_attack_discovery: {
          output: {
            hits: {
              hits: [{ _source: { 'kibana.alert.attack_discovery.alert_ids': ['a', 'b', 'c'] } }],
            },
          },
        },
        load_alerts: {
          output: {
            hits: {
              total: { value: 150 },
              hits: [
                { _source: { host: { id: 'h1' }, user: { name: 'u1' } } },
                { _source: { host: { id: 'h1' } } },
                { _source: { host: { id: 'h2' }, user: { name: 'u1' } } },
              ],
            },
          },
        },
      },
    };

    it('returns the cited alert count', () => {
      expect(evaluate(stepIn('count_alerts')?.with?.cited, context)).toBe(3);
    });

    it('returns the returned alert count, not the total match count, as found', () => {
      expect(evaluate(stepIn('count_alerts')?.with?.found, context)).toBe(3);
    });

    it('returns the unique cited host ids', () => {
      expect(evaluate(stepIn('count_alerts')?.with?.host_ids, context)).toEqual(['h1', 'h2']);
    });

    it('returns the unique cited user names', () => {
      expect(evaluate(stepIn('count_alerts')?.with?.user_names, context)).toEqual(['u1']);
    });
  });

  describe('the payload check', () => {
    const payloadValid = (verdict: string, summaryMarkdown: string): unknown =>
      evaluate(stepIn('check_payload')?.with?.payload_valid, {
        consts: workflow.consts,
        steps: {
          analyze: {
            output: { structured_output: { verdict, summary_markdown: summaryMarkdown } },
          },
        },
      });

    it('returns true for a supported verdict with a summary', () => {
      expect(payloadValid('false_positive', 'Summary')).toBe(true);
    });

    it('returns false for failed as a verdict', () => {
      expect(payloadValid('failed', 'Summary')).toBe(false);
    });

    it('returns false for an empty summary', () => {
      expect(payloadValid('true_positive', '')).toBe(false);
    });
  });

  describe('the optional-source coverage', () => {
    const emit = stepIn('emit_result')?.with as {
      coverage: { entities: { seen: string } };
    };

    it('returns zero entities seen when the entity query failed', () => {
      expect(
        evaluate(emit.coverage.entities.seen, {
          consts: workflow.consts,
          steps: { load_entities: { error: { message: 'boom' } } },
        })
      ).toBe(0);
    });
  });

  describe('the output schema', () => {
    const validate = (output: Record<string, unknown>): boolean =>
      buildFieldsZodValidator(workflow.outputs).safeParse(output).success;

    it('accepts a complete contract output', () => {
      expect(validate(completeOutput)).toBe(true);
    });

    it('rejects an output without a payload', () => {
      const { payload, ...withoutPayload } = completeOutput;
      expect(validate(withoutPayload)).toBe(false);
    });

    it('rejects a summary longer than 8000 characters', () => {
      expect(
        validate({
          ...completeOutput,
          payload: { verdict: 'inconclusive', summary_markdown: 'x'.repeat(8001) },
        })
      ).toBe(false);
    });
  });

  it('echoes the attack id from the loaded document, not the input', () => {
    expect(String(stepIn('emit_result')?.with?.attack_discovery_id)).not.toContain('inputs.');
  });
});
