/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CustomQueryRuleResponseAction {
  action_type_id: '.endpoint';
  params: {
    command: 'isolate' | 'kill-process' | 'suspend-process' | 'runscript';
    comment?: string;
    config?: {
      field: string;
      overwrite: boolean;
    };
  };
}

export interface CustomQueryRule {
  index: string[];
  enabled: boolean;
  name: string;
  description: string;
  risk_score: number;
  rule_id: string;
  severity: RuleSeverity;
  type: 'query';
  query: string;
  from: string;
  /** Rule run interval. Omitted values use the detection engine default. */
  interval?: string;
  investigation_fields?: { field_names: string[] };
  response_actions?: CustomQueryRuleResponseAction[];
  threat?: Array<{
    framework: string;
    tactic: { id: string; name: string; reference: string };
    technique?: Array<{
      id: string;
      name: string;
      reference: string;
      subtechnique?: Array<{ id: string; name: string; reference: string }>;
    }>;
  }>;
}

export interface ThreatMatchRule {
  name: string;
  description: string;
  enabled: boolean;
  risk_score: number;
  rule_id: string;
  severity: RuleSeverity;
  type: 'threat_match';
  query: string;
  index: string[];
  threat_index: string[];
  threat_query: string;
  threat_mapping: Array<{ entries: Array<{ field: string; value: string; type: 'mapping' }> }>;
  threat_indicator_path?: string;
  from: string;
  interval?: string;
  timeline_id?: string;
  timeline_title?: string;
}

export interface EqlRule extends Omit<CustomQueryRule, 'type' | 'response_actions'> {
  type: 'eql';
  language: 'eql';
}

/** Alert suppression settings of a rule, as the detection engine API accepts them. */
export interface RuleAlertSuppression {
  group_by: string[];
  duration?: { value: number; unit: 's' | 'm' | 'h' };
  missing_fields_strategy: 'suppress' | 'doNotSuppress';
}

/** ES|QL rules read the data sources from the query, so they have no `index`. */
export interface EsqlRule extends Omit<CustomQueryRule, 'type' | 'response_actions' | 'index'> {
  type: 'esql';
  language: 'esql';
  alert_suppression?: RuleAlertSuppression;
}

export const DEFAULT_SECURITY_SOLUTION_INDEXES = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
  '-*elastic-cloud-logs-*',
];

export const CUSTOM_QUERY_RULE: CustomQueryRule = {
  index: DEFAULT_SECURITY_SOLUTION_INDEXES,
  enabled: true,
  name: 'Alert Testing Query',
  description: 'Tests a simple query',
  risk_score: 1,
  rule_id: 'rule-1',
  severity: 'high',
  type: 'query',
  query: '*:*',
  from: '2019-01-01T00:00:00.000Z',
};

export const EQL_RULE: EqlRule = {
  index: DEFAULT_SECURITY_SOLUTION_INDEXES,
  enabled: true,
  name: 'EQL Alert Testing Query',
  description: 'Tests a simple EQL query',
  risk_score: 1,
  rule_id: 'eql-rule-1',
  severity: 'high',
  type: 'eql',
  language: 'eql',
  query: 'any where process.name == "zsh"',
  from: '2019-01-01T00:00:00.000Z',
};

export const ESQL_RULE: EsqlRule = {
  enabled: true,
  name: 'ES|QL Alert Testing Query',
  description: 'Tests a simple ES|QL query',
  risk_score: 1,
  rule_id: 'esql-rule-1',
  severity: 'high',
  type: 'esql',
  language: 'esql',
  query: 'from auditbeat-* metadata _id, _version, _index | keep agent.*,_id | eval test_id=_id',
  from: '2019-01-01T00:00:00.000Z',
};
