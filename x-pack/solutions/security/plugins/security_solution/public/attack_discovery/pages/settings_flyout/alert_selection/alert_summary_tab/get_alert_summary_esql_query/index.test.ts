/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertSummaryEsqlQuery } from '.';

const USER_ESQL_QUERY =
  'FROM .alerts-security.alerts-default METADATA _id, _index, _version\n| WHERE kibana.alert.severity == "critical"\n| SORT @timestamp DESC\n| LIMIT 50';

describe('getAlertSummaryEsqlQuery', () => {
  describe('custom query mode (no esqlQuery provided)', () => {
    it('returns the expected query when tableStackBy0 is kibana.alert.rule.name', () => {
      const query = getAlertSummaryEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        maxAlerts: 100,
        tableStackBy0: 'kibana.alert.rule.name',
      });

      expect(query).toBe(
        `FROM alerts-* METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL AND @timestamp >= ?_tstart AND @timestamp <= ?_tend
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
        `FROM alerts-* METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL AND @timestamp >= ?_tstart AND @timestamp <= ?_tend
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 100
| STATS Count = count() by \`kibana.alert.severity\`
| SORT Count DESC
| KEEP \`kibana.alert.severity\`, Count\n`
      );
    });
  });

  describe('ES|QL mode (esqlQuery provided)', () => {
    it('uses the user ES|QL query as the base with STATS and KEEP appended', () => {
      const query = getAlertSummaryEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        esqlQuery: USER_ESQL_QUERY,
        maxAlerts: 100,
        tableStackBy0: 'kibana.alert.rule.name',
      });

      expect(query).toBe(
        `${USER_ESQL_QUERY}
| STATS Count = count() by \`kibana.alert.rule.name\`
| SORT Count DESC
| RENAME kibana.alert.rule.name AS \`Rule name\`
| KEEP \`Rule name\`, Count\n`
      );
    });

    it('ignores alertsIndexPattern and maxAlerts when esqlQuery is provided', () => {
      const query = getAlertSummaryEsqlQuery({
        alertsIndexPattern: 'should-be-ignored-*',
        esqlQuery: USER_ESQL_QUERY,
        maxAlerts: 999,
        tableStackBy0: 'kibana.alert.severity',
      });

      expect(query).toContain(USER_ESQL_QUERY);
      expect(query).not.toContain('should-be-ignored-*');
      expect(query).not.toContain('999');
    });

    it('trims trailing whitespace from the user ES|QL query', () => {
      const queryWithTrailingWhitespace = `${USER_ESQL_QUERY}   \n\n`;

      const query = getAlertSummaryEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        esqlQuery: queryWithTrailingWhitespace,
        maxAlerts: 100,
        tableStackBy0: 'kibana.alert.rule.name',
      });

      expect(query).toBe(
        `${USER_ESQL_QUERY}
| STATS Count = count() by \`kibana.alert.rule.name\`
| SORT Count DESC
| RENAME kibana.alert.rule.name AS \`Rule name\`
| KEEP \`Rule name\`, Count\n`
      );
    });
  });
});
