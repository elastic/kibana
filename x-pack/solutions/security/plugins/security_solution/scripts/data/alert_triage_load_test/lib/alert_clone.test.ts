/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertSource, CloneAlertParams } from './alert_clone';
import {
  LOAD_TEST_TAG,
  buildAlertId,
  buildRuleUuid,
  cloneAlert,
  loadTestRunTag,
} from './alert_clone';

const buildTemplate = (): AlertSource => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  'kibana.alert.uuid': 'template-uuid',
  'kibana.alert.rule.uuid': 'template-rule',
  'kibana.alert.rule.rule_id': 'template-rule-id',
  'kibana.alert.rule.name': 'Okta session hijack',
  'kibana.alert.rule.tags': ['data-generator', 'data-generator-fp', 'pack:okta'],
  tags: ['data-generator', 'data-generator-fp', 'pack:okta', 'forwarded'],
  'kibana.alert.rule.rule_type_id': 'siem.queryRule',
  'kibana.alert.workflow_tags': ['az:true_positive'],
  'kibana.alert.workflow_status': 'closed',
  'kibana.alert.workflow_status_updated_at': '2026-01-01T00:00:00.000Z',
  'kibana.alert.case_ids': ['case-1'],
  'host.name': 'host-1',
});

const cloneParams = (overrides: Partial<CloneAlertParams> = {}): CloneAlertParams => ({
  template: buildTemplate(),
  alertId: 'alert-1',
  ruleUuid: 'rule-uuid',
  runId: 'run-1',
  executionUuid: 'execution-1',
  nowIso: '2026-09-30T12:00:00.000Z',
  ...overrides,
});

describe('cloneAlert', () => {
  it('gives the clone a fresh identity, time and open state', () => {
    const clone = cloneAlert(cloneParams());

    expect(clone).toMatchObject({
      '@timestamp': '2026-09-30T12:00:00.000Z',
      'kibana.alert.uuid': 'alert-1',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.workflow_tags': [],
      'kibana.alert.rule.execution.uuid': 'execution-1',
    });
  });

  it('assigns the clone to the synthetic rule', () => {
    const clone = cloneAlert(cloneParams());

    expect(clone['kibana.alert.rule.uuid']).toBe('rule-uuid');
    expect(clone['kibana.alert.rule.rule_id']).toBe('rule-uuid');
  });

  it('keeps the template content the agent reasons about', () => {
    const clone = cloneAlert(cloneParams());

    expect(clone['kibana.alert.rule.name']).toBe('Okta session hijack');
    expect(clone['kibana.alert.rule.rule_type_id']).toBe('siem.queryRule');
    expect(clone['host.name']).toBe('host-1');
  });

  it('replaces generator tags so the ground truth is not visible to the agent', () => {
    const clone = cloneAlert(cloneParams());

    expect(clone['kibana.alert.rule.tags']).toEqual([LOAD_TEST_TAG, loadTestRunTag('run-1')]);
  });

  it('removes generator tags from the top-level tags, where the false-positive label also lives', () => {
    const clone = cloneAlert(cloneParams());

    expect(clone.tags).toEqual(['forwarded']);
  });

  it('removes a top-level tags value that is a single generator tag', () => {
    const clone = cloneAlert(
      cloneParams({ template: { ...buildTemplate(), tags: 'data-generator-fp' } })
    );

    expect(clone).not.toHaveProperty('tags');
  });

  it('leaves a template without top-level tags without them', () => {
    const template = buildTemplate();
    delete template.tags;

    const clone = cloneAlert(cloneParams({ template }));

    expect(clone).not.toHaveProperty('tags');
  });

  it('drops state that belongs to the template alert', () => {
    const clone = cloneAlert(cloneParams());

    expect(clone).not.toHaveProperty(['kibana.alert.case_ids']);
    expect(clone).not.toHaveProperty(['kibana.alert.workflow_status_updated_at']);
  });

  it('does not modify the template', () => {
    const template = buildTemplate();

    cloneAlert(cloneParams({ template }));

    expect(template).toEqual(buildTemplate());
  });

  it('rejects a template that is not a flattened alert document', () => {
    expect(() => cloneAlert(cloneParams({ template: { kibana: { alert: {} } } }))).toThrow(
      'not a flattened alert document'
    );
  });
});

describe('ids', () => {
  it('derives the same rule uuid for the same run and rule', () => {
    expect(buildRuleUuid('run-1', 3)).toBe(buildRuleUuid('run-1', 3));
  });

  it('derives different rule uuids for different rules and runs', () => {
    expect(buildRuleUuid('run-1', 3)).not.toBe(buildRuleUuid('run-1', 4));
    expect(buildRuleUuid('run-1', 3)).not.toBe(buildRuleUuid('run-2', 3));
  });

  it('produces uuid-shaped rule ids', () => {
    expect(buildRuleUuid('run-1', 0)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('builds alert ids that name the run and batch', () => {
    expect(buildAlertId('run-1', 'batch-0002', 7)).toBe('triage-load-test-run-1-batch-0002-0007');
  });
});
