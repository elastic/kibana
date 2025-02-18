/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertSummaryEsqlQuery } from '.';

describe('getAlertSummaryEsqlQuery', () => {
  it('returns the expected query when tableStackBy0 is kibana.alert.rule.name', () => {
    const query = getAlertSummaryEsqlQuery({
      alertsIndexPattern: 'alerts-*',
      maxAlerts: 100,
      tableStackBy0: 'kibana.alert.rule.name',
    });

    expect(query).toBe(
      `FROM alerts-* METADATA _id, _index, _version
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.rule.building_block_type IS NULL
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 100
| STATS Count = count() by \`kibana.alert.rule.name\`
| SORT Count DESC
| RENAME kibana.alert.rule.name AS \`Rule name\`
| KEEP \`Rule name\`, Count\n`
    );
  });

  it('returns the expected query when tableStackBy0 is NOT kibana.alert.rule.name', () => {
    const query = getAlertSummaryEsqlQuery({
      alertsIndexPattern: 'alerts-*',
      maxAlerts: 100,
      tableStackBy0: 'kibana.alert.severity',
    });

    expect(query).toBe(
      `FROM alerts-* METADATA _id, _index, _version
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.rule.building_block_type IS NULL
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 100
| STATS Count = count() by \`kibana.alert.severity\`
| SORT Count DESC
| KEEP \`kibana.alert.severity\`, Count\n`
    );
  });
});
