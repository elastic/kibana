/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis';

import type { TestData } from '../../types';

export const farequoteDataViewTestDataWithQuery: TestData = {
  suiteTitle: 'farequote with spike with query',
  analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
  autoRun: false,
  dataGenerator: 'farequote_with_spike',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'ft_farequote',
  brushDeviationTargetTimestamp: 1455033600000,
  brushIntervalFactor: 1,
  chartClickCoordinates: [0, 0],
  columnSelectorSearch: 'p-value',
  fieldSelectorSearch: 'airline',
  fieldSelectorApplyAvailable: true,
  query: 'NOT airline:("SWR" OR "ACA" OR "AWE" OR "BAW" OR "JAL" OR "JBU" OR "JZA" OR "KLM")',
  expected: {
    totalDocCountFormatted: '48,799',
    analysisGroupsTable: [
      {
        docCount: '297',
        group: '* airline: AAL',
      },
      {
        docCount: '100',
        group: '* custom_field.keyword: deviation* airline: UAL',
      },
    ],
    analysisTable: [
      {
        fieldName: 'airline',
        fieldValue: 'AAL',
        logRate: 'Chart type:bar chart',
        pValue: '1.18e-8',
        impact: 'High',
      },
    ],
    columnSelectorPopover: [
      'Log rate',
      'Doc count',
      'p-value',
      'Impact',
      'Baseline rate',
      'Deviation rate',
      'Log rate change',
      'Actions',
    ],
    fieldSelectorPopover: ['@version.keyword', 'airline', 'custom_field.keyword', 'type.keyword'],
    globalState: {
      refreshInterval: { pause: true, value: 60000 },
      time: { from: '2016-02-07T00:00:00.000Z', to: '2016-02-11T23:59:54.000Z' },
    },
    appState: {
      logRateAnalysis: {
        filters: [],
        searchQuery: {
          bool: {
            filter: [],
            must_not: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            term: {
                              airline: {
                                value: 'SWR',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            term: {
                              airline: {
                                value: 'ACA',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            term: {
                              airline: {
                                value: 'AWE',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            term: {
                              airline: {
                                value: 'BAW',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            term: {
                              airline: {
                                value: 'JAL',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            term: {
                              airline: {
                                value: 'JBU',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            term: {
                              airline: {
                                value: 'JZA',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            term: {
                              airline: {
                                value: 'KLM',
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        searchQueryLanguage: 'kuery',
        searchString:
          'NOT airline:("SWR" OR "ACA" OR "AWE" OR "BAW" OR "JAL" OR "JBU" OR "JZA" OR "KLM")',
        wp: {
          bMax: 1454940000000,
          bMin: 1454817600000,
          dMax: 1455040800000,
          dMin: 1455033600000,
        },
      },
    },
    prompt: 'change-point',
  },
};
