/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject } from '@kbn/core/types';
import { RiskScoreFields } from '../../../../../common/search_strategy';

export const userRiskScoreDashboards: SavedObject[] = [
  {
    attributes: {
      fieldAttrs: '{}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: 'ml_user_risk_score_latest_<REPLACE-WITH-SPACE>',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID9>',
    migrationVersion: { 'index-pattern': '8.0.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: {
      description: '',
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              'b4c8cd6f-2499-4791-a0f7-01b0d3f75efc': {
                columnOrder: [
                  'ba672ee7-0990-4277-9bc7-6361077efe18',
                  '6b6df37f-ad45-462c-aa2f-2d19af98ed98',
                  'daefb732-9f48-4017-a49a-979cfdeef127',
                ],
                columns: {
                  '6b6df37f-ad45-462c-aa2f-2d19af98ed98': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Risk Score',
                    operationType: 'sum',
                    params: { emptyAsNull: true },
                    scale: 'ratio',
                    sourceField: RiskScoreFields.userRiskScore,
                  },
                  'ba672ee7-0990-4277-9bc7-6361077efe18': {
                    customLabel: true,
                    dataType: 'string',
                    isBucketed: true,
                    label: 'User Name',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: { columnId: '6b6df37f-ad45-462c-aa2f-2d19af98ed98', type: 'column' },
                      orderDirection: 'desc',
                      otherBucket: true,
                      parentFormat: { id: 'terms' },
                      size: 30,
                    },
                    scale: 'ordinal',
                    sourceField: RiskScoreFields.userName,
                  },
                  'daefb732-9f48-4017-a49a-979cfdeef127': {
                    customLabel: true,
                    dataType: 'string',
                    filter: { language: 'kuery', query: '' },
                    isBucketed: false,
                    label: 'Current Risk',
                    operationType: 'last_value',
                    params: { sortField: '@timestamp' },
                    scale: 'ordinal',
                    sourceField: RiskScoreFields.userRisk,
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: { language: 'kuery', query: '' },
        visualization: {
          columns: [
            { columnId: 'ba672ee7-0990-4277-9bc7-6361077efe18', isTransposed: false },
            { columnId: '6b6df37f-ad45-462c-aa2f-2d19af98ed98', hidden: true, isTransposed: false },
            { columnId: 'daefb732-9f48-4017-a49a-979cfdeef127', isTransposed: false },
          ],
          layerId: 'b4c8cd6f-2499-4791-a0f7-01b0d3f75efc',
          layerType: 'data',
        },
      },
      title: 'Current Risk Score for Users',
      visualizationType: 'lnsDatatable',
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID1>',
    migrationVersion: { lens: '8.3.0' },
    references: [
      {
        id: '<REPLACE-WITH-ID9>',
        name: 'indexpattern-datasource-layer-b4c8cd6f-2499-4791-a0f7-01b0d3f75efc',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: {
      fieldAttrs: '{}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: 'ml_user_risk_score_<REPLACE-WITH-SPACE>',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID10>',
    migrationVersion: { 'index-pattern': '8.0.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: {
      description: '',
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              'b885eaad-3c68-49ad-9891-70158d912dbd': {
                columnOrder: [
                  '1fced52d-7ba5-4254-8656-fe0d7ced586a',
                  'e82aed80-ee04-4ad1-9b9d-fde4a25be58a',
                  '3fadebce-2f31-4eed-9fc0-237249281a1a',
                ],
                columns: {
                  '1fced52d-7ba5-4254-8656-fe0d7ced586a': {
                    customLabel: true,
                    dataType: 'string',
                    isBucketed: true,
                    label: 'User Name',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: { columnId: '3fadebce-2f31-4eed-9fc0-237249281a1a', type: 'column' },
                      orderDirection: 'desc',
                      otherBucket: false,
                      parentFormat: { id: 'terms' },
                      size: 20,
                    },
                    scale: 'ordinal',
                    sourceField: RiskScoreFields.userName,
                  },
                  '3fadebce-2f31-4eed-9fc0-237249281a1a': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Cumulative Risk Score',
                    operationType: 'max',
                    params: { emptyAsNull: true },
                    scale: 'ratio',
                    sourceField: RiskScoreFields.userRiskScore,
                  },
                  'e82aed80-ee04-4ad1-9b9d-fde4a25be58a': {
                    dataType: 'date',
                    isBucketed: true,
                    label: '@timestamp',
                    operationType: 'date_histogram',
                    params: { includeEmptyRows: true, interval: '1d' },
                    scale: 'interval',
                    sourceField: '@timestamp',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: { language: 'kuery', query: 'not user.name: SYSTEM' },
        visualization: {
          layers: [
            {
              accessors: ['3fadebce-2f31-4eed-9fc0-237249281a1a'],
              layerId: 'b885eaad-3c68-49ad-9891-70158d912dbd',
              layerType: 'data',
              position: 'top',
              seriesType: 'bar_stacked',
              showGridlines: false,
              splitAccessor: '1fced52d-7ba5-4254-8656-fe0d7ced586a',
              xAccessor: 'e82aed80-ee04-4ad1-9b9d-fde4a25be58a',
            },
          ],
          legend: { isVisible: true, legendSize: 'auto', position: 'right' },
          preferredSeriesType: 'bar_stacked',
          title: 'Empty XY chart',
          valueLabels: 'hide',
          yLeftExtent: { mode: 'full' },
          yRightExtent: { mode: 'full' },
        },
      },
      title: 'User Risk Score (Max Risk Score Histogram)',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID2>',
    migrationVersion: { lens: '8.3.0' },
    references: [
      {
        id: '<REPLACE-WITH-ID10>',
        name: 'indexpattern-datasource-layer-b885eaad-3c68-49ad-9891-70158d912dbd',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2022-08-12T16:31:30.450Z',
  },
  {
    attributes: {
      fieldAttrs: '{}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: '.alerts-security.alerts-<REPLACE-WITH-SPACE>',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID11>',
    migrationVersion: { 'index-pattern': '8.0.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"user.name: root","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'Associated Users (Rule Breakdown)',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"Associated Users (Rule Breakdown)","type":"table","aggs":[{"id":"2","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score","emptyAsNull":false},"schema":"metric"},{"id":"1","enabled":true,"type":"count","params":{"customLabel":"Number of Hits","emptyAsNull":false},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"user.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"User"},"schema":"split"},{"id":"4","enabled":true,"type":"terms","params":{"field":"signal.rule.name","orderBy":"2","order":"desc","size":50,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Name"},"schema":"bucket"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.type","orderBy":"2","order":"desc","size":50,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Type"},"schema":"bucket"}],"params":{"perPage":25,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true,"autoFitRowToContent":true}}',
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID3>',
    migrationVersion: { visualization: '8.3.0' },
    references: [
      {
        id: '<REPLACE-WITH-ID11>',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'Alerts by Hostname',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"Alerts by Hostname","type":"table","aggs":[{"id":"2","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score","emptyAsNull":false},"schema":"metric"},{"id":"1","enabled":true,"type":"count","params":{"customLabel":"Number of Hits","emptyAsNull":false},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"host.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Host"},"schema":"split"},{"id":"4","enabled":true,"type":"terms","params":{"field":"signal.rule.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Name"},"schema":"bucket"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.type","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Type"},"schema":"bucket"}],"params":{"perPage":10,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true,"autoFitRowToContent":false}}',
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID4>',
    migrationVersion: { visualization: '8.3.0' },
    references: [
      {
        id: '<REPLACE-WITH-ID11>',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"not user.name : *$","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'User Risk Score (Tactic Breakdown)- Verbose',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"User Risk Score (Tactic Breakdown)- Verbose","type":"table","aggs":[{"id":"1","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score","emptyAsNull":false},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"user.name","orderBy":"1","order":"desc","size":40,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Username"},"schema":"split"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.threat.tactic.name","orderBy":"1","order":"desc","size":100,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":true,"missingBucketLabel":"Other","customLabel":"Tactic"},"schema":"bucket"},{"id":"6","enabled":true,"type":"terms","params":{"field":"signal.rule.threat.technique.name","orderBy":"1","order":"desc","size":100,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":true,"missingBucketLabel":"Other","customLabel":"Technique"},"schema":"bucket"},{"id":"7","enabled":true,"type":"count","params":{"customLabel":"Number of Hits","emptyAsNull":false},"schema":"metric"}],"params":{"perPage":10,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true,"autoFitRowToContent":false}}',
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID5>',
    migrationVersion: { visualization: '8.3.0' },
    references: [
      {
        id: '<REPLACE-WITH-ID11>',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: { color: '#6edb7f', description: '', name: 'experimental' },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID6>',
    migrationVersion: { tag: '8.0.0' },
    references: [],
    type: 'tag',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: {
      description:
        'This dashboard allows users to drill down further into the details of the risk components associated with a particular user.',
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      panelsJSON:
        '[{"version":"8.3.0","type":"visualization","gridData":{"x":0,"y":0,"w":48,"h":3,"i":"eaa57cf4-7ca3-4919-ab76-dbac0eb6a195"},"panelIndex":"eaa57cf4-7ca3-4919-ab76-dbac0eb6a195","embeddableConfig":{"savedVis":{"title":"","description":"","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"The User Risk Score capability is an experimental feature. You can read further about it [here](https://github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/user-risk-score.md)."},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"hidePanelTitles":true,"enhancements":{}}},{"version":"8.3.0","type":"lens","gridData":{"x":0,"y":3,"w":48,"h":15,"i":"b3fdccab-59c1-47c8-9393-fa043e0dff83"},"panelIndex":"b3fdccab-59c1-47c8-9393-fa043e0dff83","embeddableConfig":{"enhancements":{},"hidePanelTitles":false},"title":"Cumulative User Risk Score (multiple users)","panelRefName":"panel_b3fdccab-59c1-47c8-9393-fa043e0dff83"},{"version":"8.3.0","type":"visualization","gridData":{"x":0,"y":18,"w":24,"h":45,"i":"8d09b97c-a023-4b7e-9e9d-1c46e726a487"},"panelIndex":"8d09b97c-a023-4b7e-9e9d-1c46e726a487","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[]}},"hidePanelTitles":false,"vis":{"params":{"colWidth":[{"colIndex":0,"width":410.5}]}}},"title":"Alert Counts by User","panelRefName":"panel_8d09b97c-a023-4b7e-9e9d-1c46e726a487"},{"version":"8.3.0","type":"visualization","gridData":{"x":24,"y":18,"w":24,"h":45,"i":"cae82aa1-20c8-4354-94ab-3934ac53b8fe"},"panelIndex":"cae82aa1-20c8-4354-94ab-3934ac53b8fe","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[]}},"hidePanelTitles":false,"vis":{"params":{"colWidth":[{"colIndex":0,"width":304}]}}},"title":"Alert Counts by Host","panelRefName":"panel_cae82aa1-20c8-4354-94ab-3934ac53b8fe"},{"version":"8.3.0","type":"visualization","gridData":{"x":0,"y":63,"w":48,"h":15,"i":"ca3c8903-be5d-4265-820c-cc3d67443af2"},"panelIndex":"ca3c8903-be5d-4265-820c-cc3d67443af2","embeddableConfig":{"enhancements":{},"hidePanelTitles":false},"title":"Tactic Breakdown of Risky Users","panelRefName":"panel_ca3c8903-be5d-4265-820c-cc3d67443af2"}]',
      refreshInterval: { pause: false, value: 0 },
      timeFrom: 'now-1w',
      timeRestore: true,
      timeTo: 'now',
      title: 'Drilldown of User Risk Score',
      version: 1,
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID8>',
    migrationVersion: { dashboard: '8.3.0' },
    references: [
      {
        id: '<REPLACE-WITH-ID2>',
        name: 'b3fdccab-59c1-47c8-9393-fa043e0dff83:panel_b3fdccab-59c1-47c8-9393-fa043e0dff83',
        type: 'lens',
      },
      {
        id: '<REPLACE-WITH-ID3>',
        name: '8d09b97c-a023-4b7e-9e9d-1c46e726a487:panel_8d09b97c-a023-4b7e-9e9d-1c46e726a487',
        type: 'visualization',
      },
      {
        id: '<REPLACE-WITH-ID4>',
        name: 'cae82aa1-20c8-4354-94ab-3934ac53b8fe:panel_cae82aa1-20c8-4354-94ab-3934ac53b8fe',
        type: 'visualization',
      },
      {
        id: '<REPLACE-WITH-ID5>',
        name: 'ca3c8903-be5d-4265-820c-cc3d67443af2:panel_ca3c8903-be5d-4265-820c-cc3d67443af2',
        type: 'visualization',
      },
      {
        id: '<REPLACE-WITH-ID6>',
        name: 'tag-93fc0f00-1a57-11ed-bb53-ad8c26f4d942',
        type: 'tag',
      },
    ],
    type: 'dashboard',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
  {
    attributes: {
      description: '',
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncTooltips":false,"hidePanelTitles":false}',
      panelsJSON:
        '[{"version":"8.3.0","type":"visualization","gridData":{"x":0,"y":0,"w":48,"h":3,"i":"02f0548a-aae6-460f-9300-be42b4ae9a1e"},"panelIndex":"02f0548a-aae6-460f-9300-be42b4ae9a1e","embeddableConfig":{"savedVis":{"id":"","title":"","description":"","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"User Risk Score is an experimental feature. You can read further about it [here](https://github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/user-risk-score.md)."},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"hidePanelTitles":true,"enhancements":{}}},{"version":"8.3.0","type":"lens","gridData":{"x":17,"y":3,"w":14,"h":15,"i":"1e9c2cc7-ae0c-4ae7-8d03-8e079b5891b5"},"panelIndex":"1e9c2cc7-ae0c-4ae7-8d03-8e079b5891b5","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"d26cff88-a061-494e-abb1-958216009585","triggers":["FILTER_TRIGGER"],"action":{"factoryId":"DASHBOARD_TO_DASHBOARD_DRILLDOWN","name":"Go to Dashboard","config":{"useCurrentFilters":true,"useCurrentDateRange":true,"openInNewTab":false}}}]}},"hidePanelTitles":false},"title":"Current Risk Scores for Users","panelRefName":"panel_1e9c2cc7-ae0c-4ae7-8d03-8e079b5891b5"}]',
      refreshInterval: { pause: false, value: 0 },
      timeFrom: 'now-1w',
      timeRestore: true,
      timeTo: 'now',
      title: 'Current Risk Score for Users',
      version: 1,
    },
    coreMigrationVersion: '8.3.0',
    id: '<REPLACE-WITH-ID7>',
    migrationVersion: { dashboard: '8.3.0' },
    references: [
      {
        id: '<REPLACE-WITH-ID1>',
        name: '1e9c2cc7-ae0c-4ae7-8d03-8e079b5891b5:panel_1e9c2cc7-ae0c-4ae7-8d03-8e079b5891b5',
        type: 'lens',
      },
      {
        id: '<REPLACE-WITH-ID8>',
        name: '1e9c2cc7-ae0c-4ae7-8d03-8e079b5891b5:drilldown:DASHBOARD_TO_DASHBOARD_DRILLDOWN:d26cff88-a061-494e-abb1-958216009585:dashboardId',
        type: 'dashboard',
      },
      {
        id: '<REPLACE-WITH-ID6>',
        name: 'tag-93fc0f00-1a57-11ed-bb53-ad8c26f4d942',
        type: 'tag',
      },
    ],
    type: 'dashboard',
    updated_at: '2022-08-12T16:20:10.121Z',
  },
];
