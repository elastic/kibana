/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { RuleResponse } from './rule';
import { DETECTION_RULE_RULES_API_CURRENT_VERSION } from '../constants';

interface RuleSeverityMapping {
  field: string;
  value: string;
  operator: 'equals';
  severity: string;
}

export interface RuleCreateProps {
  type: string;
  language: string;
  license: string;
  author: string[];
  filters: unknown[];
  false_positives: unknown[];
  risk_score: number;
  risk_score_mapping: unknown[];
  severity: string;
  severity_mapping: RuleSeverityMapping[];
  threat: unknown[];
  interval: string;
  from: string;
  to: string;
  timestamp_override: string;
  timestamp_override_fallback_disabled: boolean;
  actions: unknown[];
  enabled: boolean;
  alert_suppression: {
    group_by: string[];
    missing_fields_strategy: string;
  };
  index: string[];
  query: string;
  references: string[];
  name: string;
  description: string;
  tags: string[];
  max_signals: number;
  investigation_fields?: {
    field_names: string[];
  };
  note?: string;
}

const DETECTION_ENGINE_URL = '/api/detection_engine' as const;
const DETECTION_ENGINE_RULES_URL = `${DETECTION_ENGINE_URL}/rules` as const;

export const createDetectionRule = async ({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleCreateProps;
}): Promise<RuleResponse> => {
  const res = await http.post<RuleCreateProps>(DETECTION_ENGINE_RULES_URL, {
    version: DETECTION_RULE_RULES_API_CURRENT_VERSION,
    body: JSON.stringify(rule),
  });

  return res as RuleResponse;
};
