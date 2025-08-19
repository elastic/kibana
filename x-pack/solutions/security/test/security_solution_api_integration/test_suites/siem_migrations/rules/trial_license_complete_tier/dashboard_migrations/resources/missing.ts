/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import pRetry from 'p-retry';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { defaultOriginalDashboardExports } from '../../../../utils/dashboard_mocks';
import { dashboardMigrationRouteFactory } from '../../../../utils/dashboards';
import {
  deleteAllDashboardMigrations,
  getDashboardResourcesPerMigrationFromES,
} from '../../../../utils/es_queries_dashboards';

const splunkXMLWithMultipleQueries = `<form version="1.1" hideEdit="True" script="custom_script.js">
  <label>System Monitoring Dashboard</label>

  <fieldset autoRun="true" submitButton="false">
    <input type="radio" searchWhenChanged="true" token="role">
      <label>Role</label>
      <choice value="search_heads">Search Heads</choice>
      <choice value="indexers">Indexers</choice>
      <default>search_heads</default>
    </input>
  </fieldset>

  <row>
    <panel>
      <title>Total Events Processed (Last Hour)</title>
      <single>
        <search>
          <query>
            \`system_metric_search\`
            | stats dc(event_id) as total_events
          </query>
        </search>
        <option name="height">80px</option>
      </single>
    </panel>
    <panel>
      <title>Failed Events (Last Hour)</title>
      <single>
        <search>
          <query>
            | lookup ColorScheme.csv WHERE Enabled=\"Yes\"\n| appendcols [\n| transpose 10 header_field=Key\n| fields - column\n]
          </query>
        </search>
        <option name="height">80px</option>
      </single>
    </panel>
    <panel>
      <title>A Panel with macro query</title>
      <single>
        <search>
          <query>
            | \`macro_one('90','2')\` | \`macro_two('20')\`          </query>
        </search>
        <option name="height">80px</option>
      </single>
    </panel>
  </row>

  <row>
    <panel>
      <title>Event Processing Over Time</title>
      <chart>
        <query>
          search ... | lookup my_lookup_table field AS alias OUTPUT new_field | lookup other_lookup_list | lookup third_lookup
        </query>
        <option name="charting.chart">column</option>
        <option name="charting.chart.stackMode">stacked</option>
      </chart>
    </panel>
  </row>

</form>`;

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Dashboard Migration Missing Resources', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should identify and persist macros and lookups from multiple queries in a dashboard', async () => {
      const sampleDashbaordExport = {
        ...defaultOriginalDashboardExports,
        result: {
          ...defaultOriginalDashboardExports.result,
          'eai:data': splunkXMLWithMultipleQueries,
        },
      };

      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: [sampleDashbaordExport],
      });

      await pRetry(
        async () => {
          const resourcesIndexData = await getDashboardResourcesPerMigrationFromES({
            es,
            migrationId,
          });

          expect(resourcesIndexData.hits.hits.length).toBeGreaterThan(0);
        },
        {
          retries: 3,
        }
      );

      const missingResourcesResponse = await dashboardMigrationRoutes.resources.missing({
        migrationId,
      });

      expect(missingResourcesResponse.body).toMatchObject([
        { name: 'system_metric_search', type: 'macro' },
        { name: 'macro_one(2)', type: 'macro' },
        { name: 'macro_two(1)', type: 'macro' },
        { name: 'ColorScheme', type: 'lookup' },
        { name: 'my_lookup_table', type: 'lookup' },
        { name: 'other_lookup_list', type: 'lookup' },
        { name: 'third', type: 'lookup' },
      ]);
    });
  });
};
