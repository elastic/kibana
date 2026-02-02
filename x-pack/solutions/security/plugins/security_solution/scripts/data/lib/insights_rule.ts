/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickDefined } from './pick';
import { readFirstNonEmptyLineUtf8 } from './fs_utils';
import { isRecord } from './type_guards';

export interface InsightsRuleCreateProps extends Record<string, unknown> {
  interval?: string;
  from?: string;
  to?: string;
  rule_name_override?: unknown;
}

/**
 * Reads the vendored `endpoint_alert.ndjson` export and returns a rule preview/create payload.
 * The export contains additional fields that are not allowed by the create schema, so we
 * whitelist only the supported create fields.
 */
export const loadInsightsRuleCreateProps = (
  ruleExportNdjsonPath: string
): InsightsRuleCreateProps => {
  const firstLine = readFirstNonEmptyLineUtf8(ruleExportNdjsonPath);
  if (!firstLine) throw new Error(`Invalid rule export file (empty): ${ruleExportNdjsonPath}`);
  const parsed: unknown = JSON.parse(firstLine);
  if (!isRecord(parsed)) {
    throw new Error(`Invalid rule export NDJSON (expected object): ${ruleExportNdjsonPath}`);
  }
  const rule: Record<string, unknown> = parsed;

  // Query rule create props (subset)
  const picked: InsightsRuleCreateProps = pickDefined(rule, [
    'name',
    'description',
    'tags',
    'interval',
    'from',
    'to',
    'rule_id',
    'risk_score',
    'severity',
    'type',
    'language',
    'index',
    'query',
    'filters',
    'max_signals',
    'timestamp_override',
    'timestamp_override_fallback_disabled',
    'rule_name_override',
    'references',
    'false_positives',
    'threat',
    'note',
    'timeline_id',
    'timeline_title',
    'exceptions_list',
    'actions',
    'meta',
  ]);
  return picked;
};
