/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationDashboardData } from '@kbn/security-solution-plugin/common/siem_migrations/model/dashboard_migration.gen';
import type { MigrationDocument } from '@kbn/security-solution-plugin/server/lib/siem_migrations/common/types';
import { merge } from 'lodash';
import type { DeepPartial } from 'utility-types';

export const getDefaultDashboardMigrationDoc: () => Omit<MigrationDocument, 'id'> = () => ({
  name: 'Default Migration',
  created_by: 'elastic',
  created_at: new Date().toISOString(),
  last_execution: {
    is_aborted: false,
    started_at: new Date().toISOString(),
    ended_at: null,
    connector_id: 'preconfigured-bedrock',
  },
});

export const defaultOriginalDashboardExports = {
  preview: false,
  result: {
    id: 'some_id',
    label: 'Sample Dashboard label',
    title: 'sample_dashboard_label',
    description: 'Description of a Sample Dashboard',
    'eai:data':
      '<view template="some_template:/templates/udf_generic.html" type="html">\n  <label>Sample Dashboard</label>\n  <description>Description of Sample Dashboard</description>\n</view>',
    'eai:acl.app': 'SomeApp',
    'eai:acl.sharing': 'global',
    'eai:acl.owner': 'nobody',
    updated: '2025-07-23T14:33:10+00:00',
  },
};

export const defaultDashboardMigrationDocument: DashboardMigrationDashboardData = {
  migration_id: 'dac6570f-5f41-4e8e-972e-a1de368ee118',
  original_dashboard: {
    id: 'some_id',
    title: 'Some Dashboard',
    description: '',
    data: '<dashboard/>',
    format: 'xml',
    vendor: 'splunk',
    last_updated: '1970-01-01T00:00:00+00:00',
    splunk_properties: {
      app: 'system',
      owner: 'nobody',
      sharing: 'system',
    },
  },
  elastic_dashboard: {
    title: 'Some Dashboard',
  },
  '@timestamp': '2025-09-03T14:20:49.748Z',
  status: 'pending',
  updated_at: '2025-09-03T14:20:49.748Z',
  translation_result: 'full',
  created_by: 'elastic',
};

export const getDefaultDashboardMigrationDocumentWithOverrides = (
  overrides: DeepPartial<DashboardMigrationDashboardData>
): DashboardMigrationDashboardData => {
  const overrideWithElasticDashboardTitle = {
    ...overrides,
    elastic_dashboard: {
      title: overrides.original_dashboard?.title,
      ...overrides.elastic_dashboard,
    },
  };

  return merge(
    structuredClone(defaultDashboardMigrationDocument),
    overrideWithElasticDashboardTitle
  );
};

export const splunkXMLWithMultipleQueries = `<form version="1.1" hideEdit="True" script="custom_script.js">
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
