/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { GeneratedDoc, TestDataEsArchive, TestDataGenerated } from './types';

export const farequoteDataViewTestData: TestDataEsArchive = {
  suiteTitle: 'farequote index pattern',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'ft_farequote',
  brushDeviationTargetTimestamp: 1455033600000,
  brushIntervalFactor: 1,
  chartClickCoordinates: [0, 0],
  expected: {
    totalDocCountFormatted: '86,374',
    analysisGroupsTable: [
      { docCount: '297', group: 'airline: AAL' },
      {
        docCount: '100',
        group: 'airline: UALcustom_field.keyword: deviation',
      },
    ],
    analysisTable: [
      {
        fieldName: 'airline',
        fieldValue: 'AAL',
        logRate: 'Chart type:bar chart',
        pValue: '4.66e-11',
        impact: 'High',
      },
    ],
  },
};

const REFERENCE_TS = 1669018354793;
const DAY_MS = 86400000;
const ES_INDEX = 'aiops_frequent_items_test';

const DEVIATION_TS = REFERENCE_TS - DAY_MS * 2;
const BASELINE_TS = DEVIATION_TS - DAY_MS * 1;

export const artificialLogDataViewTestData: TestDataGenerated = {
  suiteTitle: 'artificial index pattern',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'aiops_frequent_items_test',
  brushBaselineTargetTimestamp: BASELINE_TS + DAY_MS / 2,
  brushDeviationTargetTimestamp: DEVIATION_TS + DAY_MS / 2,
  brushIntervalFactor: 10,
  chartClickCoordinates: [-200, 30],
  bulkBody: getArtificialLogsBulkBody(),
  expected: {
    totalDocCountFormatted: '8,400',
    analysisGroupsTable: [
      { group: 'user: Peter', docCount: '2081' },
      { group: 'response_code: 500url: login.php', docCount: '834' },
    ],
    analysisTable: [
      {
        fieldName: 'user',
        fieldValue: 'Peter',
        logRate: 'Chart type:bar chart',
        pValue: '2.78e-22',
        impact: 'High',
      },
    ],
  },
};

function getArtificialLogsBulkBody() {
  const bulkBody: estypes.BulkRequest<GeneratedDoc, GeneratedDoc>['body'] = [];
  const action = { index: { _index: ES_INDEX } };
  let tsOffset = 0;

  // Creates docs evenly spread across baseline and deviation time frame
  [BASELINE_TS, DEVIATION_TS].forEach((ts) => {
    ['Peter', 'Paul', 'Mary'].forEach((user) => {
      ['200', '404', '500'].forEach((responseCode) => {
        ['login.php', 'user.php', 'home.php'].forEach((url) => {
          // Don't add docs that match the exact pattern of the filter we want to base the test queries on
          if (
            !(
              user === 'Peter' &&
              responseCode === '500' &&
              (url === 'home.php' || url === 'login.php')
            )
          ) {
            tsOffset = 0;
            [...Array(100)].forEach(() => {
              tsOffset += DAY_MS / 100;
              const doc: GeneratedDoc = {
                user,
                response_code: responseCode,
                url,
                version: 'v1.0.0',
                '@timestamp': ts + tsOffset,
              };

              bulkBody.push(action);
              bulkBody.push(doc);
            });
          }
        });
      });
    });
  });

  // Now let's add items to the dataset to make some specific significant terms being returned as results
  ['200', '404'].forEach((responseCode) => {
    ['login.php', 'user.php', 'home.php'].forEach((url) => {
      tsOffset = 0;
      [...Array(300)].forEach(() => {
        tsOffset += DAY_MS / 300;
        bulkBody.push(action);
        bulkBody.push({
          user: 'Peter',
          response_code: responseCode,
          url,
          version: 'v1.0.0',
          '@timestamp': DEVIATION_TS + tsOffset,
        });
      });
    });
  });

  ['Paul', 'Mary'].forEach((user) => {
    ['login.php', 'home.php'].forEach((url) => {
      tsOffset = 0;
      [...Array(400)].forEach(() => {
        tsOffset += DAY_MS / 400;
        bulkBody.push(action);
        bulkBody.push({
          user,
          response_code: '500',
          url,
          version: 'v1.0.0',
          '@timestamp': DEVIATION_TS + tsOffset,
        });
      });
    });
  });

  return bulkBody;
}
