/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../../legacy/plugins/ml/common/constants/field_types';
import { FieldVisConfig } from '../../../../../legacy/plugins/ml/public/application/datavisualizer/index_based/common';

function getFieldTypes(cards: FieldVisConfig[]) {
  const fieldTypes: ML_JOB_FIELD_TYPES[] = [];
  cards.forEach(card => {
    const fieldType = card.type;
    if (fieldTypes.includes(fieldType) === false) {
      fieldTypes.push(fieldType);
    }
  });

  return fieldTypes.sort();
}

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const testDataList = [
    {
      suiteTitle: 'with full farequote index',
      sourceIndexOrSavedSearch: 'farequote',
      metricFieldsFilter: 'document',
      nonMetricFieldsFilter: 'airline',
      nonMetricFieldsTypeFilter: 'keyword',
      expected: {
        totalDocCount: 86274,
        fieldsPanelCount: 2, // Metrics panel and Fields panel
        metricCards: [
          {
            type: ML_JOB_FIELD_TYPES.NUMBER, // document count card
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
          {
            fieldName: 'responsetime',
            type: ML_JOB_FIELD_TYPES.NUMBER,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
        ],
        nonMetricCards: [
          {
            fieldName: '@timestamp',
            type: ML_JOB_FIELD_TYPES.DATE,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
          {
            fieldName: '@version',
            type: ML_JOB_FIELD_TYPES.TEXT,
            existsInDocs: true,
            aggregatable: false,
            loading: false,
          },
          {
            fieldName: '@version.keyword',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
          {
            fieldName: 'airline',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
          {
            fieldName: 'type',
            type: ML_JOB_FIELD_TYPES.TEXT,
            existsInDocs: true,
            aggregatable: false,
            loading: false,
          },
          {
            fieldName: 'type.keyword',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
        ],
        nonMetricFieldsTypeFilterCardCount: 3,
        metricFieldsFilterCardCount: 1,
        nonMetricFieldsFilterCardCount: 1,
      },
    },
    {
      suiteTitle: 'with lucene query on farequote index',
      sourceIndexOrSavedSearch: 'farequote_lucene',
      metricFieldsFilter: 'responsetime',
      nonMetricFieldsFilter: 'version',
      nonMetricFieldsTypeFilter: 'keyword',
      expected: {
        totalDocCount: 34416,
        fieldsPanelCount: 2, // Metrics panel and Fields panel
        metricCards: [
          {
            type: ML_JOB_FIELD_TYPES.NUMBER, // document count card
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
          {
            fieldName: 'responsetime',
            type: ML_JOB_FIELD_TYPES.NUMBER,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
        ],
        nonMetricCards: [
          {
            fieldName: '@timestamp',
            type: ML_JOB_FIELD_TYPES.DATE,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
          {
            fieldName: '@version',
            type: ML_JOB_FIELD_TYPES.TEXT,
            existsInDocs: true,
            aggregatable: false,
            loading: false,
          },
          {
            fieldName: '@version.keyword',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
          {
            fieldName: 'airline',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
          {
            fieldName: 'type',
            type: ML_JOB_FIELD_TYPES.TEXT,
            existsInDocs: true,
            aggregatable: false,
            loading: false,
          },
          {
            fieldName: 'type.keyword',
            type: ML_JOB_FIELD_TYPES.KEYWORD,
            existsInDocs: true,
            aggregatable: true,
            loading: false,
          },
        ],
        nonMetricFieldsTypeFilterCardCount: 3,
        metricFieldsFilterCardCount: 2,
        nonMetricFieldsFilterCardCount: 1,
      },
    },
  ];

  describe('index based', function() {
    this.tags(['smoke', 'mlqa']);
    before(async () => {
      await esArchiver.load('ml/farequote');
    });

    after(async () => {
      await esArchiver.unload('ml/farequote');
    });

    // TODO - add tests for
    //  - validating metrics displayed inside the cards
    //  - selecting a document sample size
    //  - clicking on the link to the Advanced job wizard
    //  - a test suite using a KQL based saved search
    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function() {
        it('loads the data visualizer selector page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataVisualizer();
        });

        it('loads the saved search selection page', async () => {
          await ml.dataVisualizer.navigateToIndexPatternSelection();
        });

        it('loads the index data visualizer page', async () => {
          await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(
            testData.sourceIndexOrSavedSearch
          );
        });

        it('displays the time range step', async () => {
          await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();
        });

        it('loads data for full time range', async () => {
          await ml.dataVisualizerIndexBased.clickUseFullDataButton(testData.expected.totalDocCount);
        });

        it('displays the panels of fields', async () => {
          await ml.dataVisualizerIndexBased.assertFieldsPanelsExist(
            testData.expected.fieldsPanelCount
          );
        });

        if (testData.expected.metricCards && testData.expected.metricCards.length > 0) {
          it('displays the Metrics panel', async () => {
            await ml.dataVisualizerIndexBased.assertFieldsPanelForTypesExist([
              ML_JOB_FIELD_TYPES.NUMBER,
            ]); // document_count not exposed as a type in the panel
          });

          it('displays the expected metric field cards', async () => {
            for (const fieldCard of testData.expected.metricCards) {
              await ml.dataVisualizerIndexBased.assertCardExists(
                fieldCard.type,
                fieldCard.fieldName
              );
            }
          });

          it('filters metric fields cards with search', async () => {
            await ml.dataVisualizerIndexBased.filterFieldsPanelWithSearchString(
              ['number'],
              testData.metricFieldsFilter,
              testData.expected.metricFieldsFilterCardCount
            );
          });
        }

        if (testData.expected.nonMetricCards && testData.expected.nonMetricCards.length > 0) {
          it('displays the non-metric Fields panel', async () => {
            await ml.dataVisualizerIndexBased.assertFieldsPanelForTypesExist(
              getFieldTypes(testData.expected.nonMetricCards)
            );
          });

          it('displays the expected non-metric field cards', async () => {
            for (const fieldCard of testData.expected.nonMetricCards) {
              await ml.dataVisualizerIndexBased.assertCardExists(
                fieldCard.type,
                fieldCard.fieldName
              );
            }
          });

          it('sets the non metric field types input', async () => {
            const fieldTypes: ML_JOB_FIELD_TYPES[] = getFieldTypes(
              testData.expected.nonMetricCards
            );
            await ml.dataVisualizerIndexBased.assertFieldsPanelTypeInputExists(fieldTypes);
            await ml.dataVisualizerIndexBased.setFieldsPanelTypeInputValue(
              fieldTypes,
              testData.nonMetricFieldsTypeFilter,
              testData.expected.nonMetricFieldsTypeFilterCardCount
            );
          });

          it('filters non-metric fields cards with search', async () => {
            await ml.dataVisualizerIndexBased.filterFieldsPanelWithSearchString(
              getFieldTypes(testData.expected.nonMetricCards),
              testData.nonMetricFieldsFilter,
              testData.expected.nonMetricFieldsFilterCardCount
            );
          });
        }
      });
    }
  });
}
