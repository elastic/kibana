/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs/promises';
import { SplunkXmlDashboardParser } from './splunk_xml_dashboard_parser';

describe('SplunkXmlDashboardParser', () => {
  let exampleXml: string;

  beforeAll(async () => {
    const examplePath = path.join(__dirname, '../../../__mocks__/original_dashboard_example.xml');
    exampleXml = await fs.readFile(examplePath, 'utf8');
  });

  describe('constructor', () => {
    test('should create an instance successfully', () => {
      const parser = new SplunkXmlDashboardParser(exampleXml);
      expect(parser).toBeInstanceOf(SplunkXmlDashboardParser);
    });
  });

  describe('toObject', () => {
    test('should parse XML to object correctly', async () => {
      const parser = new SplunkXmlDashboardParser(exampleXml);
      const result = await parser.toObject();

      expect(result).toEqual(expect.any(Object));
      expect(result.dashboard?.label).toEqual(['Dashboard example']);
    });

    test('should apply parser options correctly', async () => {
      const parser = new SplunkXmlDashboardParser(exampleXml);
      const result = await parser.toObject({ explicitArray: false });

      expect(result).toEqual(expect.any(Object));
      expect(result.dashboard?.label).toEqual('Dashboard example');
    });
  });

  describe('getQueries', () => {
    test('should extract all queries from the dashboard', async () => {
      const parser = new SplunkXmlDashboardParser(exampleXml);
      const queries = await parser.getQueries();

      // There should be 3 queries (one from each panel in the example)
      expect(queries).toHaveLength(3);

      // Verify the content of the first query
      expect(queries[0]).toContain(
        `| rest /servicesNS/-/-/data/ui/views
                        | search eai:acl.app = "search" \`\`\`eai:acl.owner!="nobody"\`\`\`
                        | stats count by eai:acl.owner`
      );

      // Verify the content of the second query
      expect(queries[1]).toContain(`| rest /servicesNS/-/-/data/ui/views
                        | search eai:acl.app = "search" eai:acl.owner!="nobody"
                        | stats count`);

      // Verify the content of the third query
      expect(queries[2]).toContain(`| rest /servicesNS/-/-/data/ui/views
                        \`\`\`| search eai:acl.app = "search" \`\`\`
                        | stats count by eai:acl.app | sort - count`);
    });

    test('should return an empty array if no queries are found', async () => {
      const emptyXml = '<dashboard><label>Empty</label></dashboard>';
      const parser = new SplunkXmlDashboardParser(emptyXml);
      const queries = await parser.getQueries();

      expect(queries).toEqual([]);
    });
  });
});
