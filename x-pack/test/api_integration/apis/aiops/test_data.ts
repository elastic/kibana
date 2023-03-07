/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// We're using the mocks for jest unit tests as expected data in the integration tests here.
// This makes sure should the assertions for the integration tests need to be updated,
// that also the jest unit tests use mocks that are not outdated.
import { changePoints as artificialLogChangePoints } from '@kbn/aiops-plugin/common/__mocks__/artificial_logs/change_points';
import { finalChangePointGroups as artificialLogsChangePointGroups } from '@kbn/aiops-plugin/common/__mocks__/artificial_logs/final_change_point_groups';

import type { TestData } from './types';

export const explainLogRateSpikesTestData: TestData[] = [
  {
    testName: 'ecommerce',
    esArchive: 'x-pack/test/functional/es_archives/ml/ecommerce',
    requestBody: {
      baselineMax: 1561719083292,
      baselineMin: 1560954147006,
      deviationMax: 1562254538692,
      deviationMin: 1561986810992,
      end: 2147483647000,
      index: 'ft_ecommerce',
      searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
      start: 0,
      timeFieldName: 'order_date',
      grouping: true,
    },
    expected: {
      chunksLength: 35,
      actionsLength: 34,
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      changePointFilter: 'add_change_points',
      groupFilter: 'add_change_point_group',
      groupHistogramFilter: 'add_change_point_group_histogram',
      histogramFilter: 'add_change_points_histogram',
      errorFilter: 'add_error',
      changePoints: [
        {
          fieldName: 'day_of_week',
          fieldValue: 'Wednesday',
          doc_count: 145,
          bg_count: 142,
          score: 36.31595998561873,
          pValue: 1.6911377077437753e-16,
          normalizedScore: 0.8055203624020835,
          total_doc_count: 0,
          total_bg_count: 0,
        },
        {
          fieldName: 'day_of_week',
          fieldValue: 'Thursday',
          doc_count: 157,
          bg_count: 224,
          score: 20.366950718358762,
          pValue: 1.428057484826135e-9,
          normalizedScore: 0.7661649691018979,
          total_doc_count: 0,
          total_bg_count: 0,
        },
      ],
      groups: [],
      histogramLength: 20,
    },
  },
  {
    testName: 'artificial_logs_with_spike',
    dataGenerator: 'artificial_logs_with_spike',
    requestBody: {
      start: 1668760018793,
      end: 1668931954793,
      searchQuery: '{"match_all":{}}',
      timeFieldName: '@timestamp',
      index: 'artificial_logs_with_spike',
      baselineMin: 1668769200000,
      baselineMax: 1668837600000,
      deviationMin: 1668855600000,
      deviationMax: 1668924000000,
      grouping: true,
    },
    expected: {
      chunksLength: 25,
      actionsLength: 24,
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      changePointFilter: 'add_change_points',
      groupFilter: 'add_change_point_group',
      groupHistogramFilter: 'add_change_point_group_histogram',
      histogramFilter: 'add_change_points_histogram',
      errorFilter: 'add_error',
      changePoints: artificialLogChangePoints,
      groups: artificialLogsChangePointGroups,
      histogramLength: 20,
    },
  },
];
