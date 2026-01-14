/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';

/**
 * Reads the vendored `endpoint_alert.ndjson` export and returns a rule preview/create payload.
 * The export contains additional fields that are not allowed by the create schema, so we
 * whitelist only the supported create fields.
 */
export const loadInsightsRuleCreateProps = (ruleExportNdjsonPath: string): Record<string, unknown> => {
  const firstLine = fs.readFileSync(ruleExportNdjsonPath, 'utf8').split('\n').find(Boolean);
  if (!firstLine) throw new Error(`Invalid rule export file (empty): ${ruleExportNdjsonPath}`);
  const rule = JSON.parse(firstLine) as Record<string, unknown>;

  // Query rule create props (subset)
  const allowed: Record<string, unknown> = {};
  const pick = (k: string) => {
    if (rule[k] !== undefined) allowed[k] = rule[k];
  };

  for (const k of [
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
  ]) {
    pick(k);
  }

  return allowed;
};

