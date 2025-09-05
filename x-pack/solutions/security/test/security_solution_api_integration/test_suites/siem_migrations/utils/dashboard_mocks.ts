/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
