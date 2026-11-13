/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { WorkflowInputSchema } from '@kbn/workflows/spec/schema/triggers/manual_trigger_schema';
import { PARITY_DOCS } from './chrysalis_parity_docs';
import {
  PARITY_WORKFLOWS,
  PARITY_CASE_TAG,
  PARITY_ON_CALL_EMAIL,
  SIDE_EFFECTS_INDEX,
  TODOS_INDEX,
} from './parity_workflows';

interface ParsedWorkflow {
  name: string;
  enabled: boolean;
  inputs: Array<{ name: string; required: boolean; default?: string }>;
  triggers: Array<{ type: string }>;
  steps: Array<{ name: string; type: string; with: Record<string, unknown> }>;
}

const parsed = (id: string): ParsedWorkflow => {
  const workflow = PARITY_WORKFLOWS.find((w) => w.id === id);
  if (!workflow) throw new Error(`no workflow ${id}`);
  return parse(workflow.yaml) as ParsedWorkflow;
};

const getDeep = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);

describe('parity workflows', () => {
  it.each(PARITY_WORKFLOWS.map((w) => w.id))(
    '%s parses, is named after its id, enabled, and manually triggerable',
    (id) => {
      const workflow = parsed(id);
      expect(workflow.name).toBe(id);
      expect(workflow.enabled).toBe(true);
      expect(workflow.triggers).toEqual([{ type: 'manual' }]);
      expect(workflow.steps.length).toBeGreaterThan(0);
    }
  );

  it.each(PARITY_WORKFLOWS.map((w) => w.id))(
    '%s trigger inputs satisfy the workflow-input schema the server enforces',
    (id) => {
      // The server parses trigger inputs with WorkflowInputSchema on create;
      // a violation only surfaces at seed time (POST 400), so validate here.
      const workflow = parse(PARITY_WORKFLOWS.find((w) => w.id === id)?.yaml ?? '') as {
        inputs?: unknown;
      };
      const result = WorkflowInputSchema.safeParse(workflow.inputs);
      expect(result.success ? 'valid' : JSON.stringify(result.error.issues)).toBe('valid');
    }
  );

  it('no workflow calls an external service or carries a credential', () => {
    const inClusterStepTypes = [
      'elasticsearch.esql.query',
      'elasticsearch.index',
      'kibana.request',
    ];
    for (const { id, yaml } of PARITY_WORKFLOWS) {
      for (const { type } of parsed(id).steps) {
        expect(inClusterStepTypes).toContain(type);
      }
      expect(yaml).not.toMatch(/x-apikey|api[_-]?key|@elastic\.co|virustotal\.com/i);
    }
  });

  it('no ES|QL step splices a template value into the query text', () => {
    // Workflow inputs come from the model; inside a quoted literal a `"` would end
    // the string and turn the rest of the input into query syntax. Values must be
    // bound through `params` instead.
    for (const { id } of PARITY_WORKFLOWS) {
      for (const step of parsed(id).steps.filter(
        ({ type }) => type === 'elasticsearch.esql.query'
      )) {
        expect({ id, query: step.with.query }).not.toEqual({
          id,
          query: expect.stringContaining('{{'),
        });
      }
    }
  });

  it('vt-hash-lookup queries the seeded TI index by sha256 and resolves the EICAR hash', () => {
    const [step] = parsed('vt-hash-lookup').steps;
    expect(step.type).toBe('elasticsearch.esql.query');
    const query = String(step.with.query);
    const [, index, field] = /^FROM (\S+) \| WHERE ([\w.]+) == \?1 /.exec(query) ?? [];
    expect(index).toBeDefined();
    expect(step.with.params).toEqual(['{{ inputs.hash }}']);

    const eicar = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';
    const hits = PARITY_DOCS.filter((d) => d.index === index && getDeep(d.doc, field) === eicar);
    expect(hits).toHaveLength(1);
    expect(String(getDeep(hits[0].doc, 'threat.indicator.description'))).toContain('65/76');

    const keep =
      /\| KEEP ([^|]+)\|/
        .exec(query)?.[1]
        .split(',')
        .map((f) => f.trim()) ?? [];
    for (const keepField of keep) {
      expect({ keepField, value: getDeep(hits[0].doc, keepField) }).toEqual({
        keepField,
        value: expect.anything(),
      });
    }
  });

  it('create-case tags every case so cleanup can find it', () => {
    const [step] = parsed('create-case').steps;
    expect(step.type).toBe('kibana.request');
    expect(getDeep(step.with, 'body.tags')).toContain(PARITY_CASE_TAG);
  });

  it('create-channel records the request in the side-effects index and defaults to the seeded responder', () => {
    const workflow = parsed('create-channel');
    const [step] = workflow.steps;
    expect(step.type).toBe('elasticsearch.index');
    expect(step.with.index).toBe(SIDE_EFFECTS_INDEX);
    expect(getDeep(step.with, 'document.side_effect')).toBe('create.channel');

    const oncall = workflow.inputs.find((i) => i.name === 'oncall_email');
    expect(oncall?.default).toBe(PARITY_ON_CALL_EMAIL);
    const onCallDoc = PARITY_DOCS.find((d) => d.index === 'on-call-schedule')?.doc;
    expect(getDeep(onCallDoc, 'responder.email')).toBe(PARITY_ON_CALL_EMAIL);
  });

  it('write-todos records the full todo list in its own index, under the removed builtin tool contract', () => {
    const workflow = parsed('write-todos');
    const [step] = workflow.steps;
    expect(step.type).toBe('elasticsearch.index');
    expect(step.with.index).toBe(TODOS_INDEX);
    // The full todos array is indexed as JSON, not spliced into a query.
    expect(String(getDeep(step.with, 'document.todos'))).toContain('{{ inputs.todos | json }}');
  });

  it('write-todos declares JSON-Schema trigger inputs with a required todos array of {content, status}', () => {
    // JSON-Schema inputs (object, not the legacy array form): the only input
    // format that can express an array of objects.
    const workflow = parse(
      PARITY_WORKFLOWS.find((w) => w.id === 'write-todos')?.yaml ?? ''
    ) as Record<string, unknown>;
    const inputs = workflow.inputs as {
      type: string;
      properties: Record<string, { type: string; items?: Record<string, unknown> }>;
      required?: string[];
    };
    expect(inputs.type).toBe('object');
    expect(inputs.properties.todos.type).toBe('array');
    expect(inputs.properties.todos.items).toMatchObject({
      type: 'object',
      properties: {
        content: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
      },
      required: ['content', 'status'],
    });
    expect(inputs.required).toEqual(['todos']);
  });
});
