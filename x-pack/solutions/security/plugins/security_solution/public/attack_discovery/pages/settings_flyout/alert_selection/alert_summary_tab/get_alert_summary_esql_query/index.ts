/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlKeepStatement } from './get_esql_keep_statement';

const getDefaultBaseQuery = ({
  alertsIndexPattern,
  maxAlerts,
}: {
  alertsIndexPattern: string;
  maxAlerts: number;
}): string => `FROM ${alertsIndexPattern} METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL AND @timestamp >= ?_tstart AND @timestamp <= ?_tend
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT ${maxAlerts}`;

export const getAlertSummaryEsqlQuery = ({
  alertsIndexPattern,
  esqlQuery,
  maxAlerts,
  tableStackBy0,
}: {
  alertsIndexPattern: string;
  esqlQuery?: string;
  maxAlerts: number;
  tableStackBy0: string;
}): string => {
  const baseQuery =
    esqlQuery != null
      ? esqlQuery.trimEnd()
      : getDefaultBaseQuery({ alertsIndexPattern, maxAlerts });

  return `${baseQuery}
| STATS Count = count() by \`${tableStackBy0}\`
| SORT Count DESC
${getEsqlKeepStatement(tableStackBy0)}
`;
};
