/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_FLAPPING,
  ALERT_GROUP,
  ALERT_GROUPING,
  ALERT_INDEX_PATTERN,
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
import type { NightshiftInvestigationsAPIClientRequestParamsOf } from '@kbn/nightshift-investigations-plugin/public';
import type { TopAlert } from '../../typings/alerts';

type StartInvestigationRequest =
  NightshiftInvestigationsAPIClientRequestParamsOf<'POST /internal/nightshift/investigations'>['params']['body'];
type AlertSnapshot = Extract<
  StartInvestigationRequest,
  { subject: { type: 'alert' } }
>['context']['alerts'][number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAlertGroup = (value: unknown): value is NonNullable<AlertSnapshot['group']> =>
  Array.isArray(value) &&
  value.every(
    (group) => isRecord(group) && typeof group.field === 'string' && typeof group.value === 'string'
  );

export const buildAlertSnapshot = ({ fields, reason }: TopAlert): AlertSnapshot | undefined => {
  const start = fields[ALERT_START] ?? fields[TIMESTAMP];
  const grouping = fields[ALERT_GROUPING];
  const group = fields[ALERT_GROUP];
  if (
    !fields[ALERT_UUID] ||
    !fields[ALERT_RULE_UUID] ||
    !fields[ALERT_RULE_NAME] ||
    !fields[ALERT_RULE_TYPE_ID] ||
    !fields[ALERT_RULE_CATEGORY] ||
    !reason ||
    !fields[ALERT_STATUS] ||
    !start ||
    typeof fields[ALERT_FLAPPING] !== 'boolean'
  ) {
    return;
  }

  return {
    id: fields[ALERT_UUID],
    rule_id: fields[ALERT_RULE_UUID],
    rule_name: fields[ALERT_RULE_NAME],
    rule_type_id: fields[ALERT_RULE_TYPE_ID],
    rule_category: fields[ALERT_RULE_CATEGORY],
    reason,
    status: fields[ALERT_STATUS],
    start,
    flapping: fields[ALERT_FLAPPING],
    ...(fields[ALERT_URL] ? { url: fields[ALERT_URL] } : {}),
    ...(fields[ALERT_RULE_TAGS] ? { rule_tags: fields[ALERT_RULE_TAGS] } : {}),
    ...(isRecord(grouping) ? { grouping } : {}),
    ...(isAlertGroup(group) ? { group } : {}),
    ...(fields[ALERT_EVALUATION_VALUES] !== undefined ||
    fields[ALERT_EVALUATION_VALUE] !== undefined ||
    fields[ALERT_EVALUATION_THRESHOLD] !== undefined
      ? {
          evaluation: {
            value: fields[ALERT_EVALUATION_VALUES] ?? fields[ALERT_EVALUATION_VALUE],
            threshold: fields[ALERT_EVALUATION_THRESHOLD],
          },
        }
      : {}),
    ...(fields[ALERT_RULE_PARAMETERS] ? { rule_parameters: fields[ALERT_RULE_PARAMETERS] } : {}),
    ...(fields[ALERT_INDEX_PATTERN] ? { index_pattern: fields[ALERT_INDEX_PATTERN] } : {}),
  };
};
