/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsPreviewEsqlQuery } from '.';

const USER_ESQL_QUERY =
  'FROM .alerts-security.alerts-default METADATA _id, _index, _version\n| WHERE kibana.alert.severity == "critical"\n| SORT @timestamp DESC\n| LIMIT 50';

describe('getAlertsPreviewEsqlQuery', () => {
  describe('custom query mode (no esqlQuery provided)', () => {
    it('returns a query with a renamed rule name field when tableStackBy0 is "kibana.alert.rule.name"', () => {
      const result = getAlertsPreviewEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        maxAlerts: 10,
        tableStackBy0: 'kibana.alert.rule.name',
      });

      expect(result).toBe(
        `FROM alerts-* METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL AND @timestamp >= ?_tstart AND @timestamp <= ?_tend
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 10
| RENAME kibana.alert.rule.name AS \`Rule name\`, kibana.alert.risk_score AS \`Risk score\`
| KEEP \`Rule name\`, \`Risk score\`, @timestamp, host.name, user.name\n`
      );
    });

    it('returns a query where the rule name field is NOT renamed when tableStackBy0 is "some.other.field"', () => {
      const result = getAlertsPreviewEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        maxAlerts: 10,
        tableStackBy0: 'some.other.field',
      });

      expect(result).toBe(
        `FROM alerts-* METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL AND @timestamp >= ?_tstart AND @timestamp <= ?_tend
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 10
| RENAME kibana.alert.risk_score AS \`Risk score\`
| KEEP \`some.other.field\`, \`Risk score\`, @timestamp, host.name, user.name\n`
      );
    });

    it('returns the expected query when tableStackBy0 is an empty string', () => {
      const result = getAlertsPreviewEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        maxAlerts: 10,
        tableStackBy0: '',
      });

      expect(result).toBe(
        `FROM alerts-* METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL AND @timestamp >= ?_tstart AND @timestamp <= ?_tend
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 10
| RENAME kibana.alert.risk_score AS \`Risk score\`
| KEEP \`\`, \`Risk score\`, @timestamp, host.name, user.name\n`
      );
    });

    it('applies a LIMIT using the specified maxAlerts', () => {
      const result = getAlertsPreviewEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        maxAlerts: 5,
        tableStackBy0: 'kibana.alert.rule.name',
      });

      expect(result).toBe(
        `FROM alerts-* METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL AND @timestamp >= ?_tstart AND @timestamp <= ?_tend
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 5
| RENAME kibana.alert.rule.name AS \`Rule name\`, kibana.alert.risk_score AS \`Risk score\`
| KEEP \`Rule name\`, \`Risk score\`, @timestamp, host.name, user.name\n`
      );
    });

    it('returns the specified alertsIndexPattern', () => {
      const result = getAlertsPreviewEsqlQuery({
        alertsIndexPattern: 'custom-alerts-*',
        maxAlerts: 10,
        tableStackBy0: 'kibana.alert.rule.name',
      });

      expect(result).toBe(
        `FROM custom-alerts-* METADATA _id, _index, _version, _ignored
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged") AND kibana.alert.building_block_type IS NULL AND @timestamp >= ?_tstart AND @timestamp <= ?_tend
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 10
| RENAME kibana.alert.rule.name AS \`Rule name\`, kibana.alert.risk_score AS \`Risk score\`
| KEEP \`Rule name\`, \`Risk score\`, @timestamp, host.name, user.name\n`
      );
    });
  });

  describe('ES|QL mode (esqlQuery provided)', () => {
    it('uses the user ES|QL query as the base with KEEP appended', () => {
      const result = getAlertsPreviewEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        esqlQuery: USER_ESQL_QUERY,
        maxAlerts: 10,
        tableStackBy0: 'kibana.alert.rule.name',
      });

      expect(result).toBe(
        `${USER_ESQL_QUERY}
| RENAME kibana.alert.rule.name AS \`Rule name\`, kibana.alert.risk_score AS \`Risk score\`
| KEEP \`Rule name\`, \`Risk score\`, @timestamp, host.name, user.name\n`
      );
    });

    it('ignores alertsIndexPattern and maxAlerts when esqlQuery is provided', () => {
      const result = getAlertsPreviewEsqlQuery({
        alertsIndexPattern: 'should-be-ignored-*',
        esqlQuery: USER_ESQL_QUERY,
        maxAlerts: 999,
        tableStackBy0: 'some.other.field',
      });

      expect(result).toContain(USER_ESQL_QUERY);
      expect(result).not.toContain('should-be-ignored-*');
      expect(result).not.toContain('999');
    });

    it('trims trailing whitespace from the user ES|QL query', () => {
      const queryWithTrailingWhitespace = `${USER_ESQL_QUERY}   \n\n`;

      const result = getAlertsPreviewEsqlQuery({
        alertsIndexPattern: 'alerts-*',
        esqlQuery: queryWithTrailingWhitespace,
        maxAlerts: 10,
        tableStackBy0: 'kibana.alert.rule.name',
      });

      expect(result).toBe(
        `${USER_ESQL_QUERY}
| RENAME kibana.alert.rule.name AS \`Rule name\`, kibana.alert.risk_score AS \`Risk score\`
| KEEP \`Rule name\`, \`Risk score\`, @timestamp, host.name, user.name\n`
      );
    });
  });
});
