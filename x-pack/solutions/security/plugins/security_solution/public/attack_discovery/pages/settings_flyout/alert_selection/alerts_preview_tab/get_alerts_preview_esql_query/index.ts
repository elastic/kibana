/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlKeepStatement } from './get_esql_keep_statement';

export const getAlertsPreviewEsqlQuery = ({
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
${getEsqlKeepStatement(tableStackBy0)}
`;
