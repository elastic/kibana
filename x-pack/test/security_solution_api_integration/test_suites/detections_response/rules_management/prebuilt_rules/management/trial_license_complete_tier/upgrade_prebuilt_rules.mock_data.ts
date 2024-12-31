/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TEXT_XL_A,
  TEXT_XL_B,
  TEXT_XL_C,
  TEXT_XL_MERGED,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/logic/diff/calculation/algorithms/multi_line_string_diff_algorithm.mock';
import {
  KQL_QUERY_FIELDS,
  MULTI_LINE_STRING_FIELDS,
  NUMBER_FIELDS,
  SCALAR_ARRAY_FIELDS,
  SIMPLE_FIELDS,
  SINGLE_LINE_STRING_FIELDS,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
import { calculateFromValue } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';

// ---------------------- Number fields --------------------------- //
export const NUMBER_FIELD_RULE_TYPE_MAPPING = {
  query: ['risk_score', 'max_signals'],
  machine_learning: ['anomaly_threshold'],
} as const;

export interface NumberFieldTestValues {
  baseValue: number;
  customValue: number;
  updatedValue: number;
  resolvedValue: number;
}

export const NUMBER_FIELDS_MOCK_VALUES: Record<NUMBER_FIELDS, NumberFieldTestValues> = {
  risk_score: {
    baseValue: 25,
    customValue: 50,
    updatedValue: 75,
    resolvedValue: 100,
  },
  max_signals: {
    baseValue: 100,
    customValue: 200,
    updatedValue: 300,
    resolvedValue: 400,
  },
  anomaly_threshold: {
    baseValue: 50,
    customValue: 75,
    updatedValue: 90,
    resolvedValue: 100,
  },
};

// ---------------------- Scalar array fields --------------------------- //
export const SCALAR_ARRAY_FIELD_RULE_TYPE_MAPPING = {
  query: ['tags', 'references'],
  threat_match: ['threat_index'],
  new_terms: ['new_terms_fields'],
} as const;

export interface ScalarArrayFieldTestValues {
  baseValue: string[];
  customValue: string[];
  updatedValue: string[];
  resolvedValue: string[];
}

export const SCALAR_ARRAY_FIELDS_MOCK_VALUES: Record<
  SCALAR_ARRAY_FIELDS,
  ScalarArrayFieldTestValues
> = {
  tags: {
    baseValue: ['one', 'two', 'three'],
    customValue: ['one', 'two', 'four'],
    updatedValue: ['one', 'two', 'five'],
    resolvedValue: ['one', 'two', 'resolved'],
  },
  references: {
    baseValue: ['ref1', 'ref2', 'ref3'],
    customValue: ['ref1', 'ref2', 'ref4'],
    updatedValue: ['ref1', 'ref2', 'ref5'],
    resolvedValue: ['ref1', 'ref2', 'resolved'],
  },
  threat_index: {
    baseValue: ['index1', 'index2', 'index3'],
    customValue: ['index1', 'index2', 'index4'],
    updatedValue: ['index1', 'index2', 'index5'],
    resolvedValue: ['index1', 'index2', 'resolved'],
  },
  new_terms_fields: {
    baseValue: ['field1', 'field2', 'field3'],
    customValue: ['field1', 'field2', 'field4'],
    updatedValue: ['field1', 'field2', 'field5'],
    resolvedValue: ['field1', 'field2', 'resolved'],
  },
};

// ---------------------- Single line string fields ---------------------- //
export const SINGLE_LINE_FIELD_RULE_TYPE_MAPPING = {
  query: ['name', 'severity'],
  threat_match: ['threat_indicator_path'],
  new_terms: ['history_window_start'],
} as const;

export interface SingleLineStringFieldTestValues {
  baseValue: string;
  customValue: string;
  updatedValue: string;
  resolvedValue: string;
}

export const SINGLE_LINE_STRING_FIELDS_MOCK_VALUES: Record<
  SINGLE_LINE_STRING_FIELDS,
  SingleLineStringFieldTestValues
> = {
  name: {
    baseValue: 'Base Rule Name',
    customValue: 'Custom Rule Name',
    updatedValue: 'Updated Rule Name',
    resolvedValue: 'Resolved Rule Name',
  },
  severity: {
    baseValue: 'low',
    customValue: 'medium',
    updatedValue: 'high',
    resolvedValue: 'low',
  },
  threat_indicator_path: {
    baseValue: 'indicator.file.hash.base',
    customValue: 'indicator.ip.current',
    updatedValue: 'indicator.domain.target',
    resolvedValue: 'resolved.file.hash.base',
  },
  history_window_start: {
    baseValue: 'now-10000m',
    customValue: 'now-20000m',
    updatedValue: 'now-30000m',
    resolvedValue: 'now-50000m',
  },
};

// ---------------------- Multi line string fields ---------------------- //
export const MULTI_LINE_FIELD_RULE_TYPE_MAPPING = {
  query: ['description', 'note', 'setup'],
} as const;

export interface MultiLineStringFieldTestValues {
  baseValue: string;
  customValue: string;
  updatedValue: string;
  mergedValue: string;
  resolvedValue: string;
  longBaseValue?: string;
  longCustomValue?: string;
  longUpdatedValue?: string;
  longMergedValue?: string;
  longResolvedValue?: string;
}
export const MULTI_LINE_STRING_FIELDS_MOCK_VALUES: Record<
  MULTI_LINE_STRING_FIELDS,
  MultiLineStringFieldTestValues
> = {
  description: {
    baseValue: 'My description.\nThis is a second line.',
    customValue: 'My GREAT description.\nThis is a second line.',
    updatedValue: 'My description.\nThis is a second line, now longer.',
    mergedValue: 'My GREAT description.\nThis is a second line, now longer.',
    resolvedValue: 'My RESOLVED value\nThis is a second line, now longer.',
    longBaseValue: TEXT_XL_A,
    longCustomValue: TEXT_XL_B,
    longUpdatedValue: TEXT_XL_C,
    longMergedValue: TEXT_XL_MERGED,
  },
  note: {
    baseValue: 'My note.\nThis is a second line.',
    customValue: 'My GREAT note.\nThis is a second line.',
    updatedValue: 'My note.\nThis is a second line, now longer.',
    mergedValue: 'My GREAT note.\nThis is a second line, now longer.',
    resolvedValue: 'My RESOLVED note.\nThis is a second line, now longer.',
  },
  setup: {
    baseValue: 'My setup.\nThis is a second line.',
    customValue: 'My GREAT setup.\nThis is a second line.',
    updatedValue: 'My setup.\nThis is a second line, now longer.',
    mergedValue: 'My GREAT setup.\nThis is a second line, now longer.',
    resolvedValue: 'My RESOLVED setup.\nThis is a second line, now longer.',
  },
};

// ---------------------- KQL query fields ------------------------ //
export const KQL_QUERY_FIELD_RULE_TYPE_MAPPING = {
  query: ['kql_query'],
  threat_match: ['threat_query'],
} as const;

interface Value {
  query: string;
  language: string;
  type?: string;
  filters: string[];
}

export interface KqlQueryFieldTestValues {
  baseValue: Value;
  customValue: Value;
  updatedValue: Value;
  resolvedValue: Value;
}

export const mapKQLQueryDiffableFieldToRuleFields = (diffableField: string, value: Value) => {
  const updatePayload: Record<string, any> = {};

  switch (diffableField) {
    case 'kql_query':
      updatePayload.query = value.query;
      updatePayload.language = value.language;
      updatePayload.filters = value.filters;
      break;
    case 'threat_query':
      updatePayload.threat_query = value.query;
      updatePayload.threat_language = value.language;
      updatePayload.threat_filters = value.filters;
      break;
  }

  return updatePayload;
};

export const KQL_QUERY_FIELDS_MOCK_VALUES: Record<KQL_QUERY_FIELDS, KqlQueryFieldTestValues> = {
  kql_query: {
    baseValue: {
      query: 'process.name:*.exe',
      language: 'kuery',
      filters: [],
      type: 'inline_query',
    },
    customValue: {
      query: 'process.name:*.dll',
      language: 'kuery',
      filters: [],
      type: 'inline_query',
    },
    updatedValue: {
      query: 'process.name:*.sys',
      language: 'kuery',
      filters: [],
      type: 'inline_query',
    },
    resolvedValue: {
      query: 'resolved.name:*.sys',
      language: 'kuery',
      filters: [],
      type: 'inline_query',
    },
  },
  threat_query: {
    baseValue: {
      query: 'source.ip:10.0.0.*',
      language: 'kuery',
      filters: [],
      type: 'inline_query',
    },
    customValue: {
      query: 'source.ip:192.168.*',
      language: 'kuery',
      filters: [],
      type: 'inline_query',
    },
    updatedValue: {
      query: 'source.ip:172.16.*',
      language: 'kuery',
      filters: [],
      type: 'inline_query',
    },
    resolvedValue: {
      query: 'resolved.ip:172.16.*',
      language: 'kuery',
      filters: [],
      type: 'inline_query',
    },
  },
};

// ---------------------- Simple diff algorithm fields ------------------------ //
export const SIMPLE_FIELD_RULE_TYPE_MAPPING = {
  query: [
    'severity_mapping',
    'risk_score_mapping',
    'false_positives',
    'threat',
    'related_integrations',
    'required_fields',
    'rule_schedule',
    'rule_name_override',
    'timestamp_override',
    'timeline_template',
    'building_block',
    'investigation_fields',
    'alert_suppression',
  ],
  threshold: ['threshold'],
  machine_learning: ['machine_learning_job_id'],
} as const;

export interface SimpleFieldTestValues {
  baseValue: any;
  customValue: any;
  updatedValue: any;
  resolvedValue: any;
}

export const mapDiffableFieldToRuleFields = (diffableField: string, value: any) => {
  const updatePayload: Record<string, any> = {};

  switch (diffableField) {
    case 'rule_schedule':
      updatePayload.interval = value.interval;
      updatePayload.from = calculateFromValue(value.interval, value.lookback);
      updatePayload.to = 'now';
      break;
    case 'timestamp_override':
      updatePayload.timestamp_override = value.field_name;
      break;
    case 'timestamp_override_fallback_disabled':
      updatePayload.timestamp_override_fallback_disabled = value.field_name;
    case 'rule_name_override':
      updatePayload.rule_name_override = value.field_name;
    case 'timeline_template':
      updatePayload.timeline_id = value.timeline_id;
      updatePayload.timeline_title = value.timeline_title;

      break;
    case 'building_block':
      updatePayload.building_block_type = value.type;
      break;
    default:
      updatePayload[diffableField] = value;
  }

  return updatePayload;
};

export const SIMPLE_FIELDS_MOCK_VALUES: Record<SIMPLE_FIELDS, SimpleFieldTestValues> = {
  severity_mapping: {
    baseValue: [
      {
        field: 'base.field',
        value: 'base-value',
        operator: 'equals',
        severity: 'low',
      },
    ],
    customValue: [
      {
        field: 'custom.field',
        value: 'custom-value',
        operator: 'equals',
        severity: 'medium',
      },
    ],
    updatedValue: [
      {
        field: 'updated.field',
        value: 'updated-value',
        operator: 'equals',
        severity: 'high',
      },
    ],
    resolvedValue: [
      {
        field: 'resolved.field',
        value: 'resolved-value',
        operator: 'equals',
        severity: 'low',
      },
    ],
  },
  risk_score_mapping: {
    baseValue: [
      {
        field: 'base.field',
        value: 'base-value',
        operator: 'equals',
        risk_score: 10,
      },
    ],
    customValue: [
      {
        field: 'custom.field',
        value: 'custom-value',
        operator: 'equals',
        risk_score: 20,
      },
    ],
    updatedValue: [
      {
        field: 'updated.field',
        value: 'updated-value',
        operator: 'equals',
        risk_score: 30,
      },
    ],
    resolvedValue: [
      {
        field: 'resolved.field',
        value: 'resolved-value',
        operator: 'equals',
        risk_score: 30,
      },
    ],
  },
  false_positives: {
    baseValue: ['base-false-positive'],
    customValue: ['custom-false-positive'],
    updatedValue: ['updated-false-positive'],
    resolvedValue: ['resolved-false-positive'],
  },
  threat: {
    baseValue: [{ framework: 'MITRE', tactic: { id: 'base', name: 'base', reference: 'base' } }],
    customValue: [
      { framework: 'MITRE', tactic: { id: 'custom', name: 'custom', reference: 'custom' } },
    ],
    updatedValue: [
      { framework: 'MITRE', tactic: { id: 'updated', name: 'updated', reference: 'updated' } },
    ],
    resolvedValue: [
      { framework: 'MITRE', tactic: { id: 'resolved', name: 'resolved', reference: 'resolved' } },
    ],
  },
  related_integrations: {
    baseValue: [
      {
        package: 'base-package',
        version: '1.0.0',
        integration: 'base-integration',
      },
    ],
    customValue: [
      {
        package: 'custom-package',
        version: '1.0.0',
        integration: 'custom-integration',
      },
    ],
    updatedValue: [
      {
        package: 'updated-package',
        version: '1.0.0',
        integration: 'updated-integration',
      },
    ],
    resolvedValue: [
      {
        package: 'resolved-package',
        version: '1.0.0',
        integration: 'resolved-integration',
      },
    ],
  },
  required_fields: {
    baseValue: [
      {
        name: 'base.field',
        type: 'keyword',
        ecs: false,
      },
    ],
    customValue: [
      {
        name: 'custom.field',
        type: 'keyword',
        ecs: false,
      },
    ],
    updatedValue: [
      {
        name: 'updated.field',
        type: 'keyword',
        ecs: false,
      },
    ],
    resolvedValue: [
      {
        name: 'resolved.field',
        type: 'keyword',
        ecs: false,
      },
    ],
  },
  rule_schedule: {
    baseValue: { interval: '5m', lookback: '60s' },
    customValue: { interval: '10m', lookback: '0s' },
    updatedValue: { interval: '15m', lookback: '60s' },
    resolvedValue: { interval: '20m', lookback: '60s' },
  },
  rule_name_override: {
    baseValue: { field_name: 'base-override' },
    customValue: { field_name: 'custom-override' },
    updatedValue: { field_name: 'updated-override' },
    resolvedValue: { field_name: 'resolved-override' },
  },
  timestamp_override: {
    baseValue: { field_name: 'base-timestamp', fallback_disabled: false },
    customValue: { field_name: 'custom-timestamp', fallback_disabled: false },
    updatedValue: { field_name: 'updated-timestamp', fallback_disabled: false },
    resolvedValue: { field_name: 'resolved-timestamp', fallback_disabled: false },
  },
  timeline_template: {
    baseValue: { timeline_id: 'base-template', timeline_title: 'base-template' },
    customValue: { timeline_id: 'custom-template', timeline_title: 'base-template' },
    updatedValue: { timeline_id: 'updated-template', timeline_title: 'base-template' },
    resolvedValue: { timeline_id: 'resolved-template', timeline_title: 'base-template' },
  },
  building_block: {
    baseValue: { type: 'a' },
    customValue: { type: 'b' },
    updatedValue: { type: 'c' },
    resolvedValue: { type: 'c' },
  },
  investigation_fields: {
    baseValue: {
      field_names: ['base.field'],
    },
    customValue: {
      field_names: ['custom.field'],
    },
    updatedValue: {
      field_names: ['updated.field'],
    },
    resolvedValue: {
      field_names: ['resolved.field'],
    },
  },
  alert_suppression: {
    baseValue: { group_by: ['base-field'] },
    customValue: { group_by: ['custom-field'] },
    updatedValue: { group_by: ['updated-field'] },
    resolvedValue: { group_by: ['resolved-field'] },
  },
  threshold: {
    baseValue: { field: ['base-field'], value: 100 },
    customValue: { field: ['custom-field'], value: 200 },
    updatedValue: { field: ['updated-field'], value: 300 },
    resolvedValue: { field: ['resolved-field'], value: 300 },
  },
  machine_learning_job_id: {
    baseValue: ['base-job-id'],
    customValue: ['custom-job-id'],
    updatedValue: ['updated-job-id'],
    resolvedValue: ['resolved-job-id'],
  },
};
