/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TAGS, ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';

import { getEsqlKeepStatement } from './get_esql_keep_statement';

const TAG_FIELDS = new Set([ALERT_RULE_TAGS, ALERT_WORKFLOW_TAGS, 'tags']);

const getSingleValueGroupingStatement = (tableStackBy0: string): string =>
  TAG_FIELDS.has(tableStackBy0)
    ? `| EVAL \`${tableStackBy0}\` = MV_CONCAT(MV_SORT(\`${tableStackBy0}\`), ", ")
`
    : '';

export const getAlertSummaryEsqlQuery = ({
  alertsIndexPattern,
  maxAlerts,
  tableStackBy0,
}: {
  alertsIndexPattern: string;
  maxAlerts: number;
  tableStackBy0: string;
}): string => `FROM ${alertsIndexPattern} METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT ${maxAlerts}
${getSingleValueGroupingStatement(tableStackBy0)}| STATS Count = count() by \`${tableStackBy0}\`
| SORT Count DESC
${getEsqlKeepStatement(tableStackBy0)}
`;
