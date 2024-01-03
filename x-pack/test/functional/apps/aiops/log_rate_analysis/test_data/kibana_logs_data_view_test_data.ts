/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-utils';

import type { TestData } from '../../types';

export const kibanaLogsDataViewTestData: TestData = {
  suiteTitle: 'kibana sample data logs',
  analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
  dataGenerator: 'kibana_sample_data_logs',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'kibana_sample_data_logs',
  brushIntervalFactor: 1,
  chartClickCoordinates: [235, 0],
  fieldSelectorSearch: 'referer',
  fieldSelectorApplyAvailable: true,
  action: {
    type: 'LogPatternAnalysis',
    tableRowId: '1064853178',
    expected: {
      queryBar:
        'clientip:30.156.16.164 AND host.keyword:elastic-elastic-elastic.org AND ip:30.156.16.163 AND response.keyword:404 AND machine.os.keyword:win xp AND geo.dest:IN AND geo.srcdest:US\\:IN',
      totalDocCount: 100,
    },
  },
  expected: {
    totalDocCountFormatted: '14,074',
    analysisGroupsTable: [
      {
        group:
          '* clientip: 30.156.16.164* host.keyword: elastic-elastic-elastic.org* ip: 30.156.16.163* referer: http://www.elastic-elastic-elastic.com/success/timothy-l-kopra* response.keyword: 404Showing 5 out of 8 items. 8 items unique to this group.',
        docCount: '100',
      },
    ],
    filteredAnalysisGroupsTable: [
      {
        group:
          '* clientip: 30.156.16.164* host.keyword: elastic-elastic-elastic.org* ip: 30.156.16.163* response.keyword: 404* machine.os.keyword: win xpShowing 5 out of 7 items. 7 items unique to this group.',
        docCount: '100',
      },
    ],
    analysisTable: [
      {
        fieldName: 'clientip',
        fieldValue: '30.156.16.164',
        logRate: 'Chart type:bar chart',
        pValue: '3.10e-13',
        impact: 'High',
      },
      {
        fieldName: 'geo.dest',
        fieldValue: 'IN',
        logRate: 'Chart type:bar chart',
        pValue: '0.000716',
        impact: 'Medium',
      },
      {
        fieldName: 'geo.srcdest',
        fieldValue: 'US:IN',
        logRate: 'Chart type:bar chart',
        pValue: '0.000716',
        impact: 'Medium',
      },
      {
        fieldName: 'host.keyword',
        fieldValue: 'elastic-elastic-elastic.org',
        logRate: 'Chart type:bar chart',
        pValue: '7.14e-9',
        impact: 'High',
      },
      {
        fieldName: 'ip',
        fieldValue: '30.156.16.163',
        logRate: 'Chart type:bar chart',
        pValue: '3.28e-13',
        impact: 'High',
      },
      {
        fieldName: 'machine.os.keyword',
        fieldValue: 'win xp',
        logRate: 'Chart type:bar chart',
        pValue: '0.0000997',
        impact: 'Medium',
      },
      {
        fieldName: 'referer',
        fieldValue: 'http://www.elastic-elastic-elastic.com/success/timothy-l-kopra',
        logRate: 'Chart type:bar chart',
        pValue: '4.74e-13',
        impact: 'High',
      },
      {
        fieldName: 'response.keyword',
        fieldValue: '404',
        logRate: 'Chart type:bar chart',
        pValue: '0.00000604',
        impact: 'Medium',
      },
    ],
    fieldSelectorPopover: [
      'clientip',
      'geo.dest',
      'geo.srcdest',
      'host.keyword',
      'ip',
      'machine.os.keyword',
      'referer',
      'response.keyword',
    ],
  },
};
