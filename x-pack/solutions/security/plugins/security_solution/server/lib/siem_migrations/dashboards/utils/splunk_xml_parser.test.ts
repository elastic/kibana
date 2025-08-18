/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SplunkXmlParser } from './splunk_xml_parser';
import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import fs from 'fs';

describe('SplunkXmlParser', () => {
  let mockLogger: Logger;
  let parser: SplunkXmlParser;

  beforeEach(() => {
    mockLogger = loggerMock.create();
    parser = new SplunkXmlParser({ logger: mockLogger });
  });

  describe.only('exhaustive test real splunk dashboards', () => {
    const allDashboardsPath = 'splunk_all_dashboards_description.json';
    const dashboardsExcludingViewPath = 'all_dashboards_excluding_view.json';
    const onlyFormDashboardsPath = 'form_dashboard.json';

    const jsonFileString = fs.readFileSync(
      `x-pack/solutions/security/plugins/security_solution/server/lib/siem_migrations/dashboards/utils/${onlyFormDashboardsPath.json}`,
      'utf-8'
    );

    // all_dashboards_excluding_view.json
    const json = JSON.parse(jsonFileString);

    for (const obj of json) {
      console.log({ result: obj });
      const title = obj.result.title;
      const label = obj.result.label;
      const xmlContent = obj.result['eai:data'];

      it(`should process **** ${title} **** `, () => {
        try {
          const result = parser.parseSplunkXml(xmlContent);
          console.log(JSON.stringify({ result }, null, 2));
          expect(['', label]).toContain(result.title);
          expect(result.panels).toBeDefined();
        } catch (error) {
          mockLogger.error(`Error parsing dashboard ${title}:${xmlContent.slice(0, 100)} `, error);
          throw error; // Re-throw to fail the test
        }
      });
    }

    it('should parse a real Splunk dashboard XML', () => {});
  });

  describe('parseSplunkXml', () => {
    describe('Traditional Form Dashboard', () => {
      it('should parse form v1.1 dashboard with multiple rows and panels', () => {
        // Anonymized version of admission_control_monitoring_distributed dashboard
        const xmlContent = `<form version="1.1" hideEdit="True" script="custom_script.js">
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
            \`error_events\` search_type="failed"
            | fields count
          </query>
        </search>
        <option name="height">80px</option>
      </single>
    </panel>
  </row>

  <row>
    <panel>
      <title>Event Processing Over Time</title>
      <chart>
        <searchString>
          \`system_events\` | timechart count by event_type
        </searchString>
        <option name="charting.chart">column</option>
        <option name="charting.chart.stackMode">stacked</option>
      </chart>
    </panel>
  </row>

</form>`;

        const result = parser.parseSplunkXml(xmlContent);

        expect(result.title).toBe('System Monitoring Dashboard');
        expect(result.panels).toHaveLength(2); // Two rows

        // First row with two panels
        expect(result.panels[0]).toHaveLength(2);
        expect(result.panels[0][0].title).toBe('Total Events Processed (Last Hour)');
        expect(result.panels[0][0].viz_type).toBe('metric'); // single element = metric
        expect(result.panels[0][0].splunk_query).toContain('system_metric_search');

        expect(result.panels[0][1].title).toBe('Failed Events (Last Hour)');
        expect(result.panels[0][1].viz_type).toBe('metric');
        expect(result.panels[0][1].splunk_query).toContain('error_events');

        // Second row with one panel
        expect(result.panels[1]).toHaveLength(1);
        expect(result.panels[1][0].title).toBe('Event Processing Over Time');
        expect(result.panels[1][0].viz_type).toBe('bar vertical stacked'); // column + stacked
        expect(result.panels[1][0].splunk_query).toContain('system_events');
      });
    });

    describe('Security Essentials Dashboard', () => {
      it('should parse complex form with charts and visualization options', () => {
        // Anonymized version of Splunk Security Essentials overview dashboard
        const xmlContent = `<form version="1.1" script="analytics.js" style="/app/custom.css">
  <label>Security Analytics Overview</label>
  <fieldset submitButton="false"></fieldset>

  <search id="base_analytics">
    <query>| securityanalytics</query>
    <earliest>-24h@h</earliest>
    <latest>now</latest>
  </search>

  <row>
    <panel>
      <title>Top Security Categories</title>
      <chart>
        <search base="base_analytics">
          <query>
| stats count by category
| search category!="None"
| sort + count</query>
          <earliest>-24h@h</earliest>
          <latest>now</latest>
        </search>
        <option name="charting.chart">pie</option>
        <option name="charting.chart.sliceCollapsingThreshold">0.01</option>
        <option name="charting.legend.placement">right</option>
      </chart>
    </panel>

    <panel>
      <title>Threat Analysis Trends</title>
      <chart>
        <search base="base_analytics">
          <query>
| chart count over threat_level by time_period
| sort time_period</query>
          <earliest>-24h@h</earliest>
          <latest>now</latest>
        </search>
        <option name="charting.chart">bar</option>
        <option name="charting.chart.stackMode">stacked</option>
        <option name="charting.legend.placement">bottom</option>
      </chart>
    </panel>
  </row>

  <row>
    <panel>
      <title>Alert Volume Data</title>
      <table>
        <search base="base_analytics">
          <query>
| search alert_volume!="None"
| stats count by alert_type, severity
| sort - count</query>
          <earliest>-24h@h</earliest>
          <latest>now</latest>
        </search>
        <option name="dataOverlayMode">heatmap</option>
        <option name="drilldown">none</option>
      </table>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);

        expect(result.title).toBe('Security Analytics Overview');
        expect(result.panels).toHaveLength(2);

        // First row - two charts
        expect(result.panels[0]).toHaveLength(2);
        expect(result.panels[0][0].title).toBe('Top Security Categories');
        expect(result.panels[0][0].viz_type).toBe('pie');
        expect(result.panels[0][0].splunk_query).toContain('stats count by category');

        expect(result.panels[0][1].title).toBe('Threat Analysis Trends');
        expect(result.panels[0][1].viz_type).toBe('bar horizontal stacked'); // bar + stacked
        expect(result.panels[0][1].splunk_query).toContain('chart count over threat_level');

        // Second row - table with heatmap overlay
        expect(result.panels[1]).toHaveLength(1);
        expect(result.panels[1][0].title).toBe('Alert Volume Data');
        expect(result.panels[1][0].viz_type).toBe('heatmap'); // table + dataOverlayMode=heatmap
        expect(result.panels[1][0].splunk_query).toContain('stats count by alert_type');
      });
    });

    describe('Visualization Type Detection', () => {
      it('should correctly detect single/metric visualization', () => {
        const xmlContent = `<form version="1.1">
  <label>Metrics Dashboard</label>
  <row>
    <panel>
      <title>System Health Score</title>
      <single>
        <search>
          <query>| stats avg(health_score) as score</query>
        </search>
      </single>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.panels[0][0].viz_type).toBe('metric');
      });

      it('should correctly detect chart visualizations with options', () => {
        const xmlContent = `<form version="1.1">
  <label>Chart Dashboard</label>
  <row>
    <panel>
      <title>Column Chart</title>
      <chart>
        <search>
          <query>| stats count by category</query>
        </search>
        <option name="charting.chart">column</option>
      </chart>
    </panel>
    <panel>
      <title>Area Chart Stacked</title>
      <chart>
        <search>
          <query>| timechart count by source</query>
        </search>
        <option name="charting.chart">area</option>
        <option name="charting.chart.stackMode">stacked</option>
      </chart>
    </panel>
    <panel>
      <title>Radial Gauge</title>
      <chart>
        <search>
          <query>| stats avg(cpu_usage)</query>
        </search>
        <option name="charting.chart">radialGauge</option>
      </chart>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.panels[0][0].viz_type).toBe('bar vertical'); // column -> bar vertical
        expect(result.panels[0][1].viz_type).toBe('area stacked');
        expect(result.panels[0][2].viz_type).toBe('gauge'); // radialGauge -> gauge
      });

      it('should detect viz type from viz element', () => {
        const xmlContent = `<form version="1.1">
  <label>Viz Dashboard</label>
  <row>
    <panel>
      <title>Custom Viz</title>
      <viz type="scatter">
        <search>
          <query>| stats count by x, y</query>
        </search>
      </viz>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.panels[0][0].viz_type).toBe('scatter');
      });

      it('should default to table for unknown types', () => {
        const xmlContent = `<form version="1.1">
  <label>Default Dashboard</label>
  <row>
    <panel>
      <title>Unknown Panel</title>
      <search>
        <query>| search *</query>
      </search>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.panels[0][0].viz_type).toBe('table');
      });
    });

    describe('Query Extraction', () => {
      it('should extract queries from various search structures', () => {
        const xmlContent = `<form version="1.1">
  <label>Query Test Dashboard</label>
  <row>
    <panel>
      <title>Basic Search</title>
      <table>
        <search>
          <query>index=security | stats count by user</query>
        </search>
      </table>
    </panel>
    <panel>
      <title>Chart SearchString</title>
      <chart>
        <searchString>index=events | timechart count</searchString>
      </chart>
    </panel>
    <panel>
      <title>Nested Query</title>
      <single>
        <search>
          <query>
            \`security_macro\`
            | inputlookup user_list.csv
            | stats dc(user) as unique_users
          </query>
        </search>
      </single>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);

        expect(result.panels[0][0].splunk_query).toBe('index=security | stats count by user');
        expect(result.panels[0][1].splunk_query).toBe('index=events | timechart count');
        expect(result.panels[0][2].splunk_query).toContain('security_macro');
        expect(result.panels[0][2].splunk_query).toContain('inputlookup user_list.csv');
      });

      it('should handle panels without queries', () => {
        const xmlContent = `<form version="1.1">
  <label>Mixed Dashboard</label>
  <row>
    <panel>
      <title>Panel With Query</title>
      <search>
        <query>| makeresults</query>
      </search>
    </panel>
    <panel>
      <title>Panel Without Query</title>
      <html>Static content here</html>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.panels[0][0].splunk_query).toBe('| makeresults');
        expect(result.panels[0][1].splunk_query).toBeNull();
      });
    });

    describe('Edge Cases', () => {
      it('should handle dashboard without rows (flat panel structure)', () => {
        const xmlContent = `<form version="1.1">
  <label>Flat Dashboard</label>
  <panel>
    <title>Direct Panel</title>
    <search>
      <query>| makeresults</query>
    </search>
  </panel>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.panels).toHaveLength(1);
        expect(result.panels[0]).toHaveLength(1);
        expect(result.panels[0][0].title).toBe('Direct Panel');
      });

      it('should handle dashboard without title', () => {
        const xmlContent = `<form version="1.1">
  <row>
    <panel>
      <title>Test Panel</title>
      <search>
        <query>| makeresults</query>
      </search>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.title).toBe('Untitled Dashboard');
      });

      it('should handle panels without titles', () => {
        const xmlContent = `<form version="1.1">
  <label>Test Dashboard</label>
  <row>
    <panel>
      <search>
        <query>| makeresults | eval panel="first"</query>
      </search>
    </panel>
    <panel>
      <search>
        <query>| makeresults | eval panel="second"</query>
      </search>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.panels[0][0].title).toBe('Untitled Panel 0');
        expect(result.panels[0][1].title).toBe('Untitled Panel 1');
      });

      it('should handle empty rows gracefully', () => {
        const xmlContent = `<form version="1.1">
  <label>Test Dashboard</label>
  <row></row>
  <row>
    <panel>
      <title>Valid Panel</title>
      <search>
        <query>| makeresults</query>
      </search>
    </panel>
  </row>
</form>`;

        const result = parser.parseSplunkXml(xmlContent);
        expect(result.panels).toHaveLength(1); // Empty row should be filtered out
        expect(result.panels[0]).toHaveLength(1);
      });
    });

    describe('Error Handling', () => {
      it('should throw error for malformed XML', () => {
        const invalidXml = '<form><unclosed><tag></form>';
        expect(() => parser.parseSplunkXml(invalidXml)).toThrowError(
          /Failed to parse Splunk XML dashboard: Unexpected close tag|Failed to parse Splunk XML dashboard: .+/
        );
      });

      it('should throw error for missing root element', () => {
        const invalidXml = '<html><body>Not a dashboard</body></html>';
        expect(() => parser.parseSplunkXml(invalidXml)).toThrowError(
          /Failed to parse Splunk XML dashboard: Invalid Splunk dashboard XML: missing dashboard or form root element/
        );
      });

      it('should log errors appropriately', () => {
        const invalidXml = '<form><unclosed>';
        expect(() => parser.parseSplunkXml(invalidXml)).toThrowError(
          /Failed to parse Splunk XML dashboard:/
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error parsing Splunk XML dashboard',
          expect.any(Error)
        );
      });
    });
  });

  describe('isSupportedSplunkXml', () => {
    it('should identify traditional form dashboards', () => {
      const formXml = '<form version="1.1"><row><panel></panel></row></form>';
      expect(SplunkXmlParser.isSupportedSplunkXml(formXml)).toBe(true);
    });

    it('should identify traditional dashboard format', () => {
      const dashboardXml = '<dashboard><row><panel></panel></row></dashboard>';
      expect(SplunkXmlParser.isSupportedSplunkXml(dashboardXml)).toBe(true);
    });

    it('should reject v2 dashboards', () => {
      const v2Dashboard =
        '<dashboard version="2"><definition><![CDATA[{}]]></definition></dashboard>';
      expect(SplunkXmlParser.isSupportedSplunkXml(v2Dashboard)).toBe(false);
    });

    it('should reject simple view templates', () => {
      const viewTemplate = '<view template="generic.html"><label>Test</label></view>';
      expect(SplunkXmlParser.isSupportedSplunkXml(viewTemplate)).toBe(false);
    });

    it('should reject dashboards without row/panel structure', () => {
      const simpleForm = '<form><fieldset></fieldset></form>';
      expect(SplunkXmlParser.isSupportedSplunkXml(simpleForm)).toBe(false);
    });
  });

  describe('Resource Extraction Integration Test', () => {
    it('should extract queries suitable for splResourceIdentifier', () => {
      const xmlContent = `<form version="1.1">
  <label>Resource Test Dashboard</label>
  <row>
    <panel>
      <title>Macro and Lookup Test</title>
      <search>
        <query>
          \`system_index_search\`
          | inputlookup threat_intelligence.csv
          | lookup user_data_lookup username
          | \`calculate_risk_score(90)\`
        </query>
      </search>
    </panel>
    <panel>
      <title>Complex Query</title>
      <search>
        <query>
          index=security \`get_user_activity\`
          | lookup geographic_lookup src_ip OUTPUT country
          | \`anomaly_detection\`
          | inputlookup known_bad_ips
        </query>
      </search>
    </panel>
  </row>
</form>`;

      const result = parser.parseSplunkXml(xmlContent);

      // Verify queries are extracted properly for resource identification
      const query1 = result.panels[0][0].splunk_query!;
      const query2 = result.panels[0][1].splunk_query!;

      // Check for macros (backticks)
      expect(query1).toContain('`system_index_search`');
      expect(query1).toContain('`calculate_risk_score(90)`');
      expect(query2).toContain('`get_user_activity`');
      expect(query2).toContain('`anomaly_detection`');

      // Check for lookups
      expect(query1).toContain('inputlookup threat_intelligence.csv');
      expect(query1).toContain('lookup user_data_lookup');
      expect(query2).toContain('lookup geographic_lookup');
      expect(query2).toContain('inputlookup known_bad_ips');
    });
  });
});
