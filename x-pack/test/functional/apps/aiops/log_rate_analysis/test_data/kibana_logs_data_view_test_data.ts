/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis';
import { kibanaSampleDataLogsSignificantTermsBase } from '@kbn/aiops-test-utils/kibana_sample_data_logs/significant_terms';

import type { TestData } from '../../types';

export const kibanaLogsDataViewTestData: TestData = {
  suiteTitle: 'kibana sample data logs',
  analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
  dataGenerator: 'kibana_sample_data_logs',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'kibana_sample_data_logstsdb',
  brushIntervalFactor: 1,
  chartClickCoordinates: [235, 0],
  fieldSelectorSearch: 'referer',
  fieldSelectorApplyAvailable: true,
  action: {
    type: 'LogPatternAnalysis',
    tableRowId: '822370508',
    expected: {
      queryBar:
        'clientip:"30.156.16.164" AND geo.dest:"IN" AND geo.srcdest:"US:IN" AND host.keyword:"elastic-elastic-elastic.org" AND response.keyword:"404" AND ip:"30.156.16.163" AND machine.os.keyword:"win xp" AND agent.keyword:"Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24" AND tags.keyword:"info" AND extension.keyword:""',
      totalDocCount: 100,
    },
  },
  expected: {
    totalDocCountFormatted: '14,068',
    globalState: {
      refreshInterval: { pause: true, value: 60000 },
      time: { from: '2023-04-16T00:39:02.912Z', to: '2023-06-15T21:45:26.749Z' },
    },
    appState: {
      logRateAnalysis: {
        filters: [],
        searchQuery: { match_all: {} },
        searchQueryLanguage: 'kuery',
        searchString: '',
        wp: {
          bMax: 1685059200000,
          bMin: 1683590400000,
          dMax: 1685232000000,
          dMin: 1685145600000,
        },
      },
    },
    analysisGroupsTable: [
      {
        group:
          '* clientip: 30.156.16.164* geo.dest: IN* geo.srcdest: US:IN* host.keyword: elastic-elastic-elastic.org* response.keyword: 404Showing 5 out of 11 items. 11 items unique to this group.',
        docCount: '100',
      },
    ],
    filteredAnalysisGroupsTable: [
      {
        group:
          '* clientip: 30.156.16.164* geo.dest: IN* geo.srcdest: US:IN* host.keyword: elastic-elastic-elastic.org* response.keyword: 404Showing 5 out of 10 items. 10 items unique to this group.',
        docCount: '100',
      },
    ],
    analysisTable: kibanaSampleDataLogsSignificantTermsBase.map((d) => ({
      ...d,
      logRate: 'Chart type:bar chart',
      impact: 'High',
    })),
    fieldSelectorPopover: [
      'agent.keyword',
      'clientip',
      'extension.keyword',
      'geo.dest',
      'geo.srcdest',
      'host.keyword',
      'ip',
      'machine.os.keyword',
      'referer',
      'response.keyword',
      'tags.keyword',
    ],
    prompt: 'change-point',
  },
};
