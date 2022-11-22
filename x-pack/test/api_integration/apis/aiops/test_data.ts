/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiExplainLogRateSpikes } from '@kbn/aiops-plugin/common/api';

const requestBody: ApiExplainLogRateSpikes['body'] = {
  baselineMax: 1561719083292,
  baselineMin: 1560954147006,
  deviationMax: 1562254538692,
  deviationMin: 1561986810992,
  end: 2147483647000,
  index: 'ft_ecommerce',
  searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
  start: 0,
  timeFieldName: 'order_date',
};

export const explainLogRateSpikesTestData = [
  {
    testName: 'ecommerce',
    esArchive: 'x-pack/test/functional/es_archives/ml/ecommerce',
    requestBody,
    expected: {
      chunksLength: 34,
      actionsLength: 33,
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      changePointFilter: 'add_change_points',
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
        },
        {
          fieldName: 'day_of_week',
          fieldValue: 'Thursday',
          doc_count: 157,
          bg_count: 224,
          score: 20.366950718358762,
          pValue: 1.428057484826135e-9,
          normalizedScore: 0.7661649691018979,
        },
      ],
      histogramLength: 20,
    },
  },
];
