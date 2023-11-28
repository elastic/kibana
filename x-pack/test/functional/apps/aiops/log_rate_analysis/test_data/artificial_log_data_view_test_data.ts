/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogRateAnalysisType } from '@kbn/aiops-utils';

import type { TestData } from '../../types';

import type { LogRateAnalysisDataGenerator } from '../../../../services/aiops/log_rate_analysis_data_generator';

const REFERENCE_TS = 1669018354793;
const DAY_MS = 86400000;

const DEVIATION_TS = REFERENCE_TS - DAY_MS * 2;
const BASELINE_TS = DEVIATION_TS - DAY_MS * 1;

export const getArtificialLogDataViewTestData = (
  analysisType: LogRateAnalysisType,
  textField: boolean,
  gaps: boolean
): TestData => {
  function getAnalysisGroupsTable() {
    if (gaps) {
      return textField
        ? [
            {
              group:
                'message: an unexpected error occuredurl: home.phpuser: Maryresponse_code: 500version: v1.0.0',
              docCount: '29',
            },
            {
              group:
                'message: an unexpected error occuredurl: home.phpuser: Paulresponse_code: 500version: v1.0.0',
              docCount: '29',
            },
            {
              group:
                'message: an unexpected error occuredurl: login.phpuser: Paulresponse_code: 500version: v1.0.0',
              docCount: '29',
            },
            {
              group:
                'url: home.phpuser: Paulresponse_code: 500message: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '30',
            },
            {
              group:
                'user: Peterresponse_code: 200url: home.phpmessage: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '30',
            },
            {
              group:
                'user: Peterresponse_code: 200url: login.phpmessage: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '30',
            },
            {
              group:
                'user: Peterresponse_code: 404url: home.phpmessage: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '30',
            },
            {
              group:
                'user: Peterresponse_code: 404url: login.phpmessage: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '30',
            },
            {
              group:
                'user: Peterurl: user.phpresponse_code: 200message: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '30',
            },
            {
              group:
                'user: Peterurl: user.phpresponse_code: 404message: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '30',
            },
          ]
        : [
            { group: 'response_code: 500url: home.phpuser: Maryversion: v1.0.0', docCount: '47' },
            { group: 'response_code: 500url: home.phpuser: Paulversion: v1.0.0', docCount: '59' },
            { group: 'response_code: 500url: login.phpuser: Maryversion: v1.0.0', docCount: '35' },
            { group: 'response_code: 500url: login.phpuser: Paulversion: v1.0.0', docCount: '39' },
            { group: 'user: Peterurl: home.phpresponse_code: 200version: v1.0.0', docCount: '30' },
            { group: 'user: Peterurl: home.phpresponse_code: 404version: v1.0.0', docCount: '30' },
            { group: 'user: Peterurl: login.phpresponse_code: 200version: v1.0.0', docCount: '30' },
            { group: 'user: Peterurl: login.phpresponse_code: 404version: v1.0.0', docCount: '30' },
            { group: 'user: Peterurl: user.phpresponse_code: 200version: v1.0.0', docCount: '30' },
            { group: 'user: Peterurl: user.phpresponse_code: 404version: v1.0.0', docCount: '30' },
          ];
    }

    return [
      textField
        ? {
            group: 'message: an unexpected error occuredurl: home.phpresponse_code: 500',
            docCount: '634',
          }
        : {
            group: 'response_code: 500url: home.php',
            docCount: '792',
          },
      textField
        ? {
            group: 'message: an unexpected error occuredurl: login.phpresponse_code: 500',
            docCount: '632',
          }
        : {
            group: 'url: login.phpresponse_code: 500',
            docCount: '790',
          },
      {
        docCount: '636',
        group: 'user: Peterurl: home.php',
      },
      {
        docCount: '632',
        group: 'user: Peterurl: login.php',
      },
    ];
  }

  function getFilteredAnalysisGroupsTable() {
    if (gaps) {
      return textField
        ? [
            {
              group:
                'message: an unexpected error occuredurl: home.phpresponse_code: 500version: v1.0.0',
              docCount: '58',
            },
            {
              group:
                'message: an unexpected error occuredurl: login.phpresponse_code: 500version: v1.0.0',
              docCount: '58',
            },
            {
              group:
                'response_code: 200url: home.phpmessage: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '46',
            },
            {
              group:
                'response_code: 200url: login.phpmessage: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '35',
            },
            {
              group:
                'response_code: 404url: home.phpmessage: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '63',
            },
            {
              group:
                'response_code: 404url: login.phpmessage: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '40',
            },
            {
              group:
                'url: home.phpresponse_code: 500message: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '48',
            },
            {
              group:
                'url: user.phpresponse_code: 200message: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '40',
            },
            {
              group:
                'url: user.phpresponse_code: 404message: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '51',
            },
            {
              group:
                'url: user.phpresponse_code: 500message: Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200version: v1.0.0',
              docCount: '41',
            },
          ]
        : [
            { group: 'url: home.phpresponse_code: 200version: v1.0.0', docCount: '46' },
            { group: 'url: home.phpresponse_code: 404version: v1.0.0', docCount: '63' },
            { group: 'url: home.phpresponse_code: 500version: v1.0.0', docCount: '106' },
            { group: 'url: login.phpresponse_code: 200version: v1.0.0', docCount: '35' },
            { group: 'url: login.phpresponse_code: 404version: v1.0.0', docCount: '40' },
            { group: 'url: login.phpresponse_code: 500version: v1.0.0', docCount: '74' },
            { group: 'url: user.phpresponse_code: 200version: v1.0.0', docCount: '40' },
            { group: 'url: user.phpresponse_code: 404version: v1.0.0', docCount: '51' },
            { group: 'url: user.phpresponse_code: 500version: v1.0.0', docCount: '41' },
          ];
    }

    return textField
      ? [
          {
            group: '* url: home.phpmessage: an unexpected error occuredresponse_code: 500',
            docCount: '634',
          },
          {
            group: '* url: login.phpmessage: an unexpected error occuredresponse_code: 500',
            docCount: '632',
          },
        ]
      : [
          { group: '* url: home.phpresponse_code: 500', docCount: '792' },
          { group: '* url: login.phpresponse_code: 500', docCount: '790' },
        ];
  }

  function getAnalysisTable() {
    if (gaps) {
      return textField
        ? [
            {
              fieldName: 'message',
              fieldValue: 'Paul [11/19/2022, 9:00:34 AM] "GET /home.php HTTP/1.1" 200',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
            {
              fieldName: 'response_code',
              fieldValue: '500',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
            {
              fieldName: 'url',
              fieldValue: 'home.php',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
            {
              fieldName: 'user',
              fieldValue: 'Paul',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
            {
              fieldName: 'version',
              fieldValue: 'v1.0.0',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
          ]
        : [
            {
              fieldName: 'response_code',
              fieldValue: '500',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
            {
              fieldName: 'url',
              fieldValue: 'home.php',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
            {
              fieldName: 'user',
              fieldValue: 'Paul',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
            {
              fieldName: 'version',
              fieldValue: 'v1.0.0',
              logRate: 'Chart type:bar chart',
              pValue: '1.00',
              impact: '',
            },
          ];
    }

    return [
      ...(textField
        ? [
            {
              fieldName: 'message',
              fieldValue: 'an unexpected error occured',
              logRate: 'Chart type:bar chart',
              pValue: '0.00000100',
              impact: 'Medium',
            },
            {
              fieldName: 'response_code',
              fieldValue: '500',
              logRate: 'Chart type:bar chart',
              pValue: '3.61e-12',
              impact: 'High',
            },
          ]
        : []),
      {
        fieldName: 'url',
        fieldValue: 'home.php',
        impact: 'Low',
        logRate: 'Chart type:bar chart',
        pValue: '0.00974',
      },
      ...(textField
        ? []
        : [
            {
              fieldName: 'user',
              fieldValue: 'Peter',
              impact: 'High',
              logRate: 'Chart type:bar chart',
              pValue: '2.63e-21',
            },
          ]),
    ];
  }

  function getFieldSelectorPopover() {
    if (gaps) {
      return [...(textField ? ['message'] : []), 'response_code', 'url', 'user', 'version'];
    }
    return [...(textField ? ['message'] : []), 'response_code', 'url', 'user'];
  }

  function getSuiteTitle() {
    return `artificial logs with ${analysisType} and ${
      textField ? 'text field' : 'no text field'
    } and ${gaps ? 'gaps' : 'no gaps'}`;
  }

  function getDataGenerator(): LogRateAnalysisDataGenerator {
    return `artificial_logs_with_${analysisType}_${textField ? 'textfield' : 'notextfield'}_${
      gaps ? 'gaps' : 'nogaps'
    }`;
  }

  return {
    suiteTitle: getSuiteTitle(),
    analysisType,
    dataGenerator: getDataGenerator(),
    isSavedSearch: false,
    sourceIndexOrSavedSearch: getDataGenerator(),
    brushBaselineTargetTimestamp: gaps ? BASELINE_TS - DAY_MS / 2 : BASELINE_TS + DAY_MS / 2,
    brushDeviationTargetTimestamp: gaps ? DEVIATION_TS : DEVIATION_TS + DAY_MS / 2,
    brushIntervalFactor: gaps ? 1 : 10,
    chartClickCoordinates: [-200, 30],
    fieldSelectorSearch: 'user',
    fieldSelectorApplyAvailable: true,
    expected: {
      totalDocCountFormatted: gaps ? '9,482' : '8,400',
      analysisGroupsTable: getAnalysisGroupsTable(),
      filteredAnalysisGroupsTable: getFilteredAnalysisGroupsTable(),
      analysisTable: getAnalysisTable(),
      fieldSelectorPopover: getFieldSelectorPopover(),
    },
  };
};
