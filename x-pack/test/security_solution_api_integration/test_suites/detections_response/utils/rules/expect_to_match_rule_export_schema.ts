/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

export function expectToMatchRuleExportSchema(obj: Record<string, unknown>): void {
  // Rule export shouldn't contain rule level throttle since it's migrated to actions level
  expect(obj.throttle).toBeUndefined();
  // Runtime fields shouldn't be part of the export
  expect(obj.execution_summary).toBeUndefined();

  // Common fields
  expect(obj).toMatchObject({
    id: expect.any(String),
    rule_id: expect.any(String),
    enabled: expect.any(Boolean),
    immutable: expect.any(Boolean),
    rule_source: expect.objectContaining({
      type: expect.any(String),
    }),
    updated_at: expect.any(String),
    updated_by: expect.any(String),
    created_at: expect.any(String),
    created_by: expect.any(String),
    name: expect.any(String),
    tags: expect.arrayContaining([]),
    interval: expect.any(String),
    description: expect.any(String),
    risk_score: expect.any(Number),
    severity: expect.any(String),
    output_index: expect.any(String),
    author: expect.arrayContaining([]),
    license: expect.any(String),
    false_positives: expect.arrayContaining([]),
    from: expect.any(String),
    max_signals: expect.any(Number),
    revision: expect.any(Number),
    risk_score_mapping: expect.arrayContaining([]),
    severity_mapping: expect.arrayContaining([]),
    threat: expect.arrayContaining([]),
    to: expect.any(String),
    references: expect.arrayContaining([]),
    version: expect.any(Number),
    exceptions_list: expect.arrayContaining([]),
    related_integrations: expect.arrayContaining([]),
    required_fields: expect.arrayContaining([]),
    setup: expect.any(String),
    type: expect.any(String),
    language: expect.any(String),
    index: expect.arrayContaining([]),
    query: expect.any(String),
    actions: expect.arrayContaining([]),
  });

  // Type specific fields
  switch (obj.type) {
    case 'query':
      expectCustomQueryRuleFields(obj);
      break;

    case 'saved_query':
      expectSavedQueryRuleFields(obj);
      break;

    case 'threshold':
      expectThresholdRuleFields(obj);
      break;

    case 'threat_match':
      expectThreatMatchRuleFields(obj);
      break;

    case 'eql':
      expectEqlRuleFields(obj);
      break;

    case 'machine_learning':
      expectMachineLearningRuleFields(obj);
      break;

    case 'esql':
      expectEsqlRuleFields(obj);
      break;
  }
}

function expectCustomQueryRuleFields(obj: Record<string, unknown>): void {
  expect(obj).toMatchObject({
    type: 'query',
    query: expect.any(String),
    language: expect.stringMatching(/^(kuery|lucene)$/),
    index: expect.arrayContaining([]),
    data_view_id: expect.any(String),
    filters: expect.arrayContaining([]),
    alert_suppression: expect.objectContaining({
      groupBy: expect.any(String),
    }),
  });
}

function expectSavedQueryRuleFields(obj: Record<string, unknown>): void {
  expect(obj).toMatchObject({
    type: 'saved_query',
    saved_id: expect.any(String),
    index: expect.arrayContaining([]),
    data_view_id: expect.any(String),
    filters: expect.arrayContaining([]),
    alert_suppression: expect.objectContaining({
      groupBy: expect.any(String),
    }),
  });
}

function expectThresholdRuleFields(obj: Record<string, unknown>): void {
  expect(obj).toMatchObject({
    type: 'threshold',
    query: expect.any(String),
    threshold: expect.objectContaining({
      field: expect.any(String),
      value: expect.any(Number),
      cardinality: expect.arrayContaining([]),
    }),
    index: expect.arrayContaining([]),
    data_view_id: expect.any(String),
    filters: expect.arrayContaining([]),
    alert_suppression: expect.objectContaining({
      groupBy: expect.any(String),
    }),
  });
}

function expectThreatMatchRuleFields(obj: Record<string, unknown>): void {
  expect(obj).toMatchObject({
    type: 'threat_match',
    query: expect.any(String),
    threat_query: expect.any(String),
    threat_mapping: expect.arrayContaining([]),
    threat_index: expect.arrayContaining([]),
    index: expect.arrayContaining([]),
    data_view_id: expect.any(String),
    filters: expect.arrayContaining([]),
    threat_filters: expect.arrayContaining([]),
    threat_indicator_path: expect.any(String),
    threat_language: expect.any(['kuery', 'lucene']),
    concurrent_searches: expect.any(Number),
    items_per_search: expect.any(Number),
    alert_suppression: expect.objectContaining({
      groupBy: expect.any(String),
    }),
  });
}

function expectEqlRuleFields(obj: Record<string, unknown>): void {
  expect(obj).toMatchObject({
    type: 'eql',
    query: expect.any(String),
    language: 'eql',
    index: expect.arrayContaining([]),
    data_view_id: expect.any(String),
    filters: expect.arrayContaining([]),
    event_category_override: expect.any(String),
    tiebreaker_field: expect.any(String),
    timestamp_field: expect.any(String),
    alert_suppression: expect.objectContaining({
      groupBy: expect.any(String),
    }),
  });
}

function expectMachineLearningRuleFields(obj: Record<string, unknown>): void {
  expect(obj).toMatchObject({
    type: 'machine_learning',
    anomaly_threshold: expect.any(String),
    machine_learning_job_id: expect.any(String),
    alert_suppression: expect.objectContaining({
      groupBy: expect.any(String),
    }),
  });
}

function expectEsqlRuleFields(obj: Record<string, unknown>): void {
  expect(obj).toMatchObject({
    type: 'esql',
    language: 'esql',
    query: expect.any(String),
  });
}
