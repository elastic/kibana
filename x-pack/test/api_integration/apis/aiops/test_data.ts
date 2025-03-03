/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// We're using the mocks for jest unit tests as expected data in the integration tests here.
// This makes sure should the assertions for the integration tests need to be updated,
// that also the jest unit tests use mocks that are not outdated.
import { significantTerms as artificialLogSignificantTerms } from '@kbn/aiops-test-utils/artificial_logs/significant_terms';
import { significantLogPatterns as artificialLogSignificantLogPatterns } from '@kbn/aiops-test-utils/artificial_logs/significant_log_patterns';
import { finalSignificantItemGroups as artificialLogsSignificantItemGroups } from '@kbn/aiops-test-utils/artificial_logs/final_significant_item_groups';
import { finalSignificantItemGroupsTextfield as artificialLogsSignificantItemGroupsTextfield } from '@kbn/aiops-test-utils/artificial_logs/final_significant_item_groups_textfield';
import { topTerms } from '@kbn/aiops-test-utils/artificial_logs/top_terms';
import { topTermsGroups } from '@kbn/aiops-test-utils/artificial_logs/top_terms_groups';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';
import {
  frequentItemSetsLargeArraysGroups,
  frequentItemSetsLargeArraysSignificantItems,
} from '@kbn/aiops-test-utils/frequent_item_sets_large_arrays';

import type { TestData } from './types';

export const API_VERSIONS: ApiVersion[] = ['2', '3'];
export const API_VERSIONS_FIELD_CANDIDATES: ApiVersion[] = ['3'];

const expectedEcommerceFieldCandidates = [
  'category.keyword',
  'currency',
  'customer_first_name.keyword',
  'customer_full_name.keyword',
  'customer_gender',
  'customer_id',
  'customer_last_name.keyword',
  'customer_phone',
  'day_of_week',
  'email',
  'geoip.city_name',
  'geoip.continent_name',
  'geoip.country_iso_code',
  'geoip.region_name',
  'manufacturer.keyword',
  'order_id',
  'products._id.keyword',
  'products.category.keyword',
  'products.manufacturer.keyword',
  'products.product_name.keyword',
  'products.sku',
  'sku',
  'type',
  'user',
];

const expectedArtificialLogsFieldCandidates = {
  isECS: false,
  keywordFieldCandidates: ['response_code', 'url', 'user', 'version'],
  selectedKeywordFieldCandidates: ['response_code', 'url', 'user', 'version'],
  selectedTextFieldCandidates: [],
  textFieldCandidates: [],
};

const expectedArtificialLogsFieldCandidatesWithTextfield = {
  ...expectedArtificialLogsFieldCandidates,
  selectedTextFieldCandidates: ['message'],
  textFieldCandidates: ['message'],
};

export const getLogRateAnalysisTestData = <T extends ApiVersion>(): Array<TestData<T>> => [
  {
    testName: 'ecommerce',
    esArchive: 'x-pack/test/functional/es_archives/ml/ecommerce',
    requestBody: {
      baselineMax: 1687949483292,
      baselineMin: 1687184547006,
      deviationMax: 1688484938692,
      deviationMin: 1688217210992,
      end: 2273714047000,
      index: 'ft_ecommerce',
      searchQuery: '{"match_all":{}}',
      start: 0,
      timeFieldName: 'order_date',
      grouping: true,
    } as AiopsLogRateAnalysisSchema<T>,
    expected: {
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      significantItems: [
        {
          key: 'day_of_week:Thursday',
          type: 'keyword',
          fieldName: 'day_of_week',
          fieldValue: 'Thursday',
          doc_count: 157,
          bg_count: 224,
          total_doc_count: 480,
          total_bg_count: 1328,
          score: 20.366950718358762,
          pValue: 1.428057484826135e-9,
          normalizedScore: 0.7661649691018979,
        },
        {
          key: 'day_of_week:Wednesday',
          type: 'keyword',
          fieldName: 'day_of_week',
          fieldValue: 'Wednesday',
          doc_count: 145,
          bg_count: 142,
          total_doc_count: 480,
          total_bg_count: 1328,
          score: 36.31595998561873,
          pValue: 1.6911377077437753e-16,
          normalizedScore: 0.8055203624020835,
        },
      ],
      groups: [],
      histogramActionsLength: 1,
      histogramLength: 20,
      fieldCandidates: {
        isECS: false,
        keywordFieldCandidates: expectedEcommerceFieldCandidates,
        selectedKeywordFieldCandidates: expectedEcommerceFieldCandidates,
        selectedTextFieldCandidates: [],
        textFieldCandidates: [],
      },
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
    } as AiopsLogRateAnalysisSchema<T>,
    expected: {
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      significantItems: artificialLogSignificantTerms,
      groups: artificialLogsSignificantItemGroups,
      histogramActionsLength: 1,
      histogramLength: 20,
      fieldCandidates: expectedArtificialLogsFieldCandidates,
    },
  },
  {
    testName: 'artificial_logs_with_spike_zerodocsfallback',
    dataGenerator: 'artificial_logs_with_spike_zerodocsfallback',
    requestBody: {
      start: 1668760018793,
      end: 1668931954793,
      searchQuery: '{"match_all":{}}',
      timeFieldName: '@timestamp',
      index: 'artificial_logs_with_spike_zerodocsfallback',
      baselineMin: 0,
      baselineMax: 10,
      deviationMin: 1668855600000,
      deviationMax: 1668924000000,
      grouping: true,
    } as AiopsLogRateAnalysisSchema<T>,
    expected: {
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      significantItems: topTerms,
      groups: topTermsGroups,
      histogramActionsLength: 1,
      histogramLength: 20,
      fieldCandidates: expectedArtificialLogsFieldCandidates,
    },
  },
  {
    testName: 'artificial_logs_with_dip_zerodocsfallback',
    dataGenerator: 'artificial_logs_with_dip_zerodocsfallback',
    requestBody: {
      start: 0,
      end: 1768855600010,
      searchQuery: '{"match_all":{}}',
      timeFieldName: '@timestamp',
      index: 'artificial_logs_with_dip_zerodocsfallback',
      baselineMin: 1768855600000,
      baselineMax: 1768855600010,
      deviationMin: 1668855600000,
      deviationMax: 1668924000000,
      grouping: true,
    } as AiopsLogRateAnalysisSchema<T>,
    expected: {
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      significantItems: topTerms,
      groups: topTermsGroups,
      histogramActionsLength: 1,
      histogramLength: 20,
      fieldCandidates: expectedArtificialLogsFieldCandidates,
    },
  },
  {
    testName: 'artificial_logs_with_spike_textfield',
    dataGenerator: 'artificial_logs_with_spike_textfield',
    requestBody: {
      start: 1668760018793,
      end: 1668931954793,
      searchQuery: '{"match_all":{}}',
      timeFieldName: '@timestamp',
      index: 'artificial_logs_with_spike_textfield',
      baselineMin: 1668769200000,
      baselineMax: 1668837600000,
      deviationMin: 1668855600000,
      deviationMax: 1668924000000,
      grouping: true,
    } as AiopsLogRateAnalysisSchema<T>,
    expected: {
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      significantItems: [...artificialLogSignificantTerms, ...artificialLogSignificantLogPatterns],
      groups: artificialLogsSignificantItemGroupsTextfield,
      histogramActionsLength: 2,
      histogramLength: 20,
      fieldCandidates: expectedArtificialLogsFieldCandidatesWithTextfield,
    },
  },
  {
    testName: 'artificial_logs_with_dip',
    dataGenerator: 'artificial_logs_with_dip',
    requestBody: {
      start: 1668760018793,
      end: 1668931954793,
      searchQuery: '{"match_all":{}}',
      timeFieldName: '@timestamp',
      index: 'artificial_logs_with_dip',
      baselineMin: 1668855600000,
      baselineMax: 1668924000000,
      deviationMin: 1668769200000,
      deviationMax: 1668837600000,
      grouping: true,
    } as AiopsLogRateAnalysisSchema<T>,
    expected: {
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      significantItems: artificialLogSignificantTerms,
      groups: artificialLogsSignificantItemGroups,
      histogramActionsLength: 1,
      histogramLength: 20,
      fieldCandidates: expectedArtificialLogsFieldCandidates,
    },
  },
  {
    testName: 'artificial_logs_with_dip_textfield',
    dataGenerator: 'artificial_logs_with_dip_textfield',
    requestBody: {
      start: 1668760018793,
      end: 1668931954793,
      searchQuery: '{"match_all":{}}',
      timeFieldName: '@timestamp',
      index: 'artificial_logs_with_dip_textfield',
      baselineMin: 1668855600000,
      baselineMax: 1668924000000,
      deviationMin: 1668769200000,
      deviationMax: 1668837600000,
      grouping: true,
    } as AiopsLogRateAnalysisSchema<T>,
    expected: {
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      significantItems: [...artificialLogSignificantTerms, ...artificialLogSignificantLogPatterns],
      groups: artificialLogsSignificantItemGroupsTextfield,
      histogramActionsLength: 2,
      histogramLength: 20,
      fieldCandidates: expectedArtificialLogsFieldCandidatesWithTextfield,
    },
  },
  {
    testName: 'large_arrays',
    dataGenerator: 'large_arrays',
    requestBody: {
      start: 1561995338700,
      end: 1562427338700,
      searchQuery: '{"match_all":{}}',
      timeFieldName: '@timestamp',
      index: 'large_arrays',
      baselineMax: 1562184000000,
      baselineMin: 1562061600000,
      deviationMax: 1562277600000,
      deviationMin: 1562227200000,
      grouping: true,
    } as AiopsLogRateAnalysisSchema<T>,
    expected: {
      noIndexChunksLength: 4,
      noIndexActionsLength: 3,
      groups: frequentItemSetsLargeArraysGroups,
      significantItems: frequentItemSetsLargeArraysSignificantItems,
      histogramActionsLength: 2,
      histogramLength: 20,
      fieldCandidates: {
        isECS: false,
        keywordFieldCandidates: ['items'],
        selectedKeywordFieldCandidates: ['items'],
        selectedTextFieldCandidates: [],
        textFieldCandidates: [],
      },
    },
  },
];
