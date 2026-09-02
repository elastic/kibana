/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertSnapshotSchema,
  type AlertSnapshot,
} from '@kbn/nightshift-investigations-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_FLAPPING,
  ALERT_GROUP,
  ALERT_GROUPING,
  ALERT_INDEX_PATTERN,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_URL,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

export const buildAlertSnapshot = (alert: Record<string, unknown>): AlertSnapshot | undefined => {
  const value = alert[ALERT_EVALUATION_VALUES] ?? alert[ALERT_EVALUATION_VALUE];
  const threshold = alert[ALERT_EVALUATION_THRESHOLD];
  const parsed = alertSnapshotSchema.safeParse({
    id: alert[ALERT_UUID],
    rule_id: alert[ALERT_RULE_UUID],
    rule_name: alert[ALERT_RULE_NAME],
    rule_type_id: alert[ALERT_RULE_TYPE_ID],
    rule_category: alert[ALERT_RULE_CATEGORY],
    reason: alert[ALERT_REASON],
    status: alert[ALERT_STATUS],
    start: alert[ALERT_START] ?? alert[TIMESTAMP],
    flapping: alert[ALERT_FLAPPING],
    url: alert[ALERT_URL],
    rule_tags: alert[ALERT_RULE_TAGS],
    grouping: alert[ALERT_GROUPING],
    group: alert[ALERT_GROUP],
    ...(value !== undefined || threshold !== undefined ? { evaluation: { value, threshold } } : {}),
    rule_parameters: alert[ALERT_RULE_PARAMETERS],
    index_pattern: alert[ALERT_INDEX_PATTERN],
  });

  return parsed.success ? parsed.data : undefined;
};
