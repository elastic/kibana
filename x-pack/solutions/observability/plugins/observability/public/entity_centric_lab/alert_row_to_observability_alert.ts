/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerting-types';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { AlertRow } from '@kbn/entity-centric-lab-flyout';
import {
  alertRowToStableAlertUuid,
  alertRowToStableRuleUuid,
} from '@kbn/entity-centric-lab-flyout';
import {
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_INSTANCE_ID,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { Aggregators } from '../../common/custom_threshold_rule/types';

const parseTriggeredAt = (triggeredAt: string): string => {
  const parsed = Date.parse(triggeredAt.replace(' @ ', ' '));
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
};

const syntheticEvaluationValue = (row: AlertRow): number => {
  let hash = 0;
  for (let i = 0; i < row.reason.length; i++) {
    hash = (hash * 31 + row.reason.charCodeAt(i)) >>> 0;
  }
  return 0.72 + (hash % 28) / 100;
};

const buildRuleParameters = (entityName: string) => ({
  criteria: [
    {
      comparator: COMPARATORS.GREATER_THAN,
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.AVERAGE,
          field: 'system.cpu.user.pct',
          filter: `host.name: "${entityName}"`,
        },
      ],
      threshold: [0.85],
      timeSize: 5,
      timeUnit: 'm',
    },
  ],
  searchConfiguration: {
    query: { query: `host.name: "${entityName}"`, language: 'kuery' },
    index: '',
  },
});

export const alertRowToObservabilityAlert = (row: AlertRow, entityName: string): Alert => {
  const start = parseTriggeredAt(row.triggeredAt);
  const alertUuid = alertRowToStableAlertUuid(row, entityName);
  const ruleUuid = alertRowToStableRuleUuid(row);
  const evaluationValue = syntheticEvaluationValue(row);
  const durationMs = 5 * 60 * 1000;

  return {
    [ALERT_RULE_TYPE_ID]: [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID],
    [ALERT_RULE_NAME]: [row.ruleName],
    [ALERT_RULE_CONSUMER]: ['alerts'],
    [ALERT_RULE_PRODUCER]: ['alerts'],
    [SPACE_IDS]: ['default'],
    [ALERT_STATUS]: [ALERT_STATUS_ACTIVE],
    [ALERT_SEVERITY]: ['warning'],
    [ALERT_UUID]: [alertUuid],
    [ALERT_RULE_UUID]: [ruleUuid],
    [ALERT_INSTANCE_ID]: [entityName],
    [ALERT_RULE_CATEGORY]: ['Custom threshold'],
    [ALERT_REASON]: [row.reason],
    [ALERT_START]: [start],
    [TIMESTAMP]: [start],
    [ALERT_DURATION]: [durationMs],
    [ALERT_EVALUATION_VALUE]: [evaluationValue],
    [ALERT_EVALUATION_VALUES]: [evaluationValue],
    [ALERT_EVALUATION_THRESHOLD]: [0.85],
    [ALERT_RULE_PARAMETERS]: [buildRuleParameters(entityName)],
    'host.name': [entityName],
    'kibana.alert.uuid': [alertUuid],
    'kibana.alert.rule.uuid': [ruleUuid],
    'kibana.alert.rule.name': [row.ruleName],
    'kibana.alert.rule.rule_type_id': [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID],
    'kibana.alert.rule.parameters': [buildRuleParameters(entityName)],
    'kibana.alert.status': [ALERT_STATUS_ACTIVE],
    'kibana.alert.reason': [row.reason],
    'kibana.alert.start': [start],
    'kibana.alert.duration.us': [durationMs * 1000],
    'kibana.alert.evaluation.value': [evaluationValue],
    'kibana.alert.evaluation.values': [evaluationValue],
    'kibana.alert.evaluation.threshold': [0.85],
  } as Alert;
};
