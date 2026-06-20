/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelWorkbookArmResource } from '../../model/vendor/dashboards/sentinel.gen';
import { SentinelWorkbookParser } from './workbook_json';

const buildSerializedData = (items: object[]) =>
  JSON.stringify({
    version: 'Notebook/1.0',
    items,
  });

const WORKBOOK_RESOURCE: SentinelWorkbookArmResource = {
  id: '/subscriptions/sub-id/.../providers/Microsoft.Insights/workbooks/wb-guid',
  name: 'wb-guid',
  type: 'Microsoft.Insights/workbooks',
  properties: {
    displayName: 'Sign-in Overview',
    description: 'Workbook covering Azure AD sign-ins',
    serializedData: buildSerializedData([
      { type: 1, name: 'intro', content: { json: '## Welcome' } },
      {
        type: 3,
        name: 'failed-signins',
        title: 'Failed sign-ins by user',
        content: {
          version: 'KqlItem/1.0',
          query: 'SigninLogs | where ResultType != 0 | summarize count() by UserPrincipalName',
          queryType: 0,
          visualization: 'barchart',
        },
      },
      {
        type: 3,
        name: 'arg-panel',
        title: 'Resource graph panel',
        content: {
          version: 'KqlItem/1.0',
          query: 'Resources | project name',
          queryType: 1,
          visualization: 'table',
        },
      },
    ]),
  },
};

describe('SentinelWorkbookParser', () => {
  describe('getWorkbooks', () => {
    it('parses Workbook resources and surfaces query items', () => {
      const parser = new SentinelWorkbookParser([WORKBOOK_RESOURCE]);
      const workbooks = parser.getWorkbooks();

      expect(workbooks).toHaveLength(1);
      expect(workbooks[0]).toMatchObject({
        id: 'wb-guid',
        title: 'Sign-in Overview',
        description: 'Workbook covering Azure AD sign-ins',
      });
      expect(workbooks[0].panels).toHaveLength(2);
      expect(workbooks[0].panels[0]).toMatchObject({
        title: 'Failed sign-ins by user',
        query: 'SigninLogs | where ResultType != 0 | summarize count() by UserPrincipalName',
        viz_type: 'bar_vertical',
      });
      expect(workbooks[0].panels[1]).toMatchObject({
        title: 'Resource graph panel',
        query: 'Resources | project name',
        viz_type: 'table',
      });
    });

    it('skips text/markdown items (type 1) in v1 scope', () => {
      const parser = new SentinelWorkbookParser([WORKBOOK_RESOURCE]);
      const [workbook] = parser.getWorkbooks();
      expect(workbook.panels.every((p) => p.title !== 'intro')).toBe(true);
    });

    it('filters out non-workbook resources by type', () => {
      const ruleResource = {
        ...WORKBOOK_RESOURCE,
        type: 'Microsoft.SecurityInsights/alertRules',
      } as SentinelWorkbookArmResource;
      const parser = new SentinelWorkbookParser([ruleResource]);
      expect(parser.getWorkbooks()).toHaveLength(0);
    });

    it('skips workbooks with missing displayName or serializedData', () => {
      const incomplete: SentinelWorkbookArmResource = {
        name: 'wb-bad',
        type: 'Microsoft.Insights/workbooks',
        properties: { displayName: '', serializedData: '' },
      };
      const parser = new SentinelWorkbookParser([incomplete]);
      expect(parser.getWorkbooks()).toHaveLength(0);
    });

    it('defensively handles malformed serializedData', () => {
      const broken: SentinelWorkbookArmResource = {
        name: 'wb-broken',
        type: 'Microsoft.Insights/workbooks',
        properties: {
          displayName: 'Broken',
          serializedData: '{not-json',
        },
      };
      const parser = new SentinelWorkbookParser([broken]);
      expect(parser.getWorkbooks()).toHaveLength(0);
    });

    it('skips query items with empty query strings', () => {
      const empty: SentinelWorkbookArmResource = {
        name: 'wb-empty-q',
        type: 'Microsoft.Insights/workbooks',
        properties: {
          displayName: 'Empty Query',
          serializedData: buildSerializedData([
            { type: 3, name: 'p1', title: 'No query', content: { query: '   ' } },
          ]),
        },
      };
      const parser = new SentinelWorkbookParser([empty]);
      const [workbook] = parser.getWorkbooks();
      expect(workbook.panels).toHaveLength(0);
    });

    it('falls back to a generated title when missing', () => {
      const noTitle: SentinelWorkbookArmResource = {
        name: 'wb-no-title',
        type: 'Microsoft.Insights/workbooks',
        properties: {
          displayName: 'No Titles',
          serializedData: buildSerializedData([
            { type: 3, content: { query: 'SigninLogs | limit 1' } },
          ]),
        },
      };
      const parser = new SentinelWorkbookParser([noTitle]);
      const [workbook] = parser.getWorkbooks();
      expect(workbook.panels[0].title).toBe('Untitled Panel 0');
    });

    it('uses displayName as id when name and id are absent', () => {
      const idless: SentinelWorkbookArmResource = {
        type: 'Microsoft.Insights/workbooks',
        properties: {
          displayName: 'Fallback Id Workbook',
          serializedData: buildSerializedData([
            { type: 3, content: { query: 'SigninLogs | limit 1' } },
          ]),
        },
      };
      const parser = new SentinelWorkbookParser([idless]);
      const [workbook] = parser.getWorkbooks();
      expect(workbook.id).toBe('Fallback Id Workbook');
    });

    it('marks panels with non-KQL queryType as unsupported', () => {
      const parser = new SentinelWorkbookParser([WORKBOOK_RESOURCE]);
      const [workbook] = parser.getWorkbooks();
      const [kqlPanel, argPanel] = workbook.panels;
      expect(kqlPanel.query_language).toBe('kql');
      expect(argPanel.query_language).toBe('unsupported');
    });
  });

  describe('getQueries', () => {
    it('returns de-duplicated query strings across all workbooks', () => {
      const parser = new SentinelWorkbookParser([WORKBOOK_RESOURCE]);
      const queries = parser.getQueries();
      expect(queries).toHaveLength(2);
      expect(queries).toContain(
        'SigninLogs | where ResultType != 0 | summarize count() by UserPrincipalName'
      );
    });
  });
});
