/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../../plugins/ml/common/constants/field_types';
import { TestData, MetricFieldVisConfig } from './types';

const SHOW_FIELD_STATISTICS = 'discover:showFieldStatistics';
const farequoteIndexPatternTestData: TestData = {
  suiteTitle: 'farequote index pattern',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'ft_farequote',
  fieldNameFilters: ['airline', '@timestamp'],
  fieldTypeFilters: [ML_JOB_FIELD_TYPES.KEYWORD],
  sampleSizeValidations: [
    { size: 1000, expected: { field: 'airline', docCountFormatted: '1000 (100%)' } },
    { size: 5000, expected: { field: '@timestamp', docCountFormatted: '5000 (100%)' } },
  ],
  expected: {
    totalDocCountFormatted: '86,274',
    metricFields: [
      {
        fieldName: 'responsetime',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 10,
        viewableInLens: true,
      },
    ],
    nonMetricFields: [
      {
        fieldName: '@timestamp',
        type: ML_JOB_FIELD_TYPES.DATE,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        exampleCount: 2,
        viewableInLens: true,
      },
      {
        fieldName: '@version',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: '@version.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'airline',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 10,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'type',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: 'type.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
    ],
    emptyFields: ['sourcetype'],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
    fieldNameFiltersResultCount: 2,
    fieldTypeFiltersResultCount: 3,
  },
};

const farequoteKQLSearchTestData: TestData = {
  suiteTitle: 'KQL saved search',
  isSavedSearch: true,
  sourceIndexOrSavedSearch: 'ft_farequote_kuery',
  fieldNameFilters: ['@version'],
  fieldTypeFilters: [ML_JOB_FIELD_TYPES.DATE, ML_JOB_FIELD_TYPES.TEXT],
  sampleSizeValidations: [
    { size: 1000, expected: { field: 'airline', docCountFormatted: '1000 (100%)' } },
    { size: 5000, expected: { field: '@timestamp', docCountFormatted: '5000 (100%)' } },
  ],
  expected: {
    totalDocCountFormatted: '34,415',
    metricFields: [
      {
        fieldName: 'responsetime',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 10,
        viewableInLens: true,
      },
    ],
    nonMetricFields: [
      {
        fieldName: '@timestamp',
        type: ML_JOB_FIELD_TYPES.DATE,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        exampleCount: 2,
        viewableInLens: true,
      },
      {
        fieldName: '@version',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: '@version.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'airline',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 5,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'type',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: 'type.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
    ],
    emptyFields: ['sourcetype'],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
    fieldNameFiltersResultCount: 1,
    fieldTypeFiltersResultCount: 3,
  },
};

const farequoteKQLFiltersSearchTestData: TestData = {
  suiteTitle: 'KQL saved search and filters',
  isSavedSearch: true,
  sourceIndexOrSavedSearch: 'ft_farequote_filter_and_kuery',
  fieldNameFilters: ['@version'],
  fieldTypeFilters: [ML_JOB_FIELD_TYPES.DATE, ML_JOB_FIELD_TYPES.TEXT],
  sampleSizeValidations: [
    { size: 1000, expected: { field: 'airline', docCountFormatted: '1000 (100%)' } },
    { size: 5000, expected: { field: '@timestamp', docCountFormatted: '5000 (100%)' } },
  ],
  expected: {
    totalDocCountFormatted: '5,674',
    metricFields: [
      {
        fieldName: 'responsetime',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 10,
        viewableInLens: true,
      },
    ],
    nonMetricFields: [
      {
        fieldName: '@timestamp',
        type: ML_JOB_FIELD_TYPES.DATE,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        exampleCount: 2,
        viewableInLens: true,
      },
      {
        fieldName: '@version',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: '@version.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'airline',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        exampleContent: ['ASA'],
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'type',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: 'type.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
    ],
    emptyFields: ['sourcetype'],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
    fieldNameFiltersResultCount: 1,
    fieldTypeFiltersResultCount: 3,
  },
};

const farequoteLuceneSearchTestData: TestData = {
  suiteTitle: 'lucene saved search',
  isSavedSearch: true,
  sourceIndexOrSavedSearch: 'ft_farequote_lucene',
  fieldNameFilters: ['@version.keyword', 'type'],
  fieldTypeFilters: [ML_JOB_FIELD_TYPES.NUMBER],
  sampleSizeValidations: [
    { size: 1000, expected: { field: 'airline', docCountFormatted: '1000 (100%)' } },
    { size: 5000, expected: { field: '@timestamp', docCountFormatted: '5000 (100%)' } },
  ],
  expected: {
    totalDocCountFormatted: '34,416',
    metricFields: [
      {
        fieldName: 'responsetime',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 10,
        viewableInLens: true,
      },
    ],
    nonMetricFields: [
      {
        fieldName: '@timestamp',
        type: ML_JOB_FIELD_TYPES.DATE,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        exampleCount: 2,
        viewableInLens: true,
      },
      {
        fieldName: '@version',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: '@version.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'airline',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 5,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'type',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: 'type.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
    ],
    emptyFields: ['sourcetype'],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
    fieldNameFiltersResultCount: 2,
    fieldTypeFiltersResultCount: 1,
  },
};

const farequoteLuceneFiltersSearchTestData: TestData = {
  suiteTitle: 'lucene saved search and filter',
  isSavedSearch: true,
  sourceIndexOrSavedSearch: 'ft_farequote_filter_and_lucene',
  fieldNameFilters: ['@version.keyword', 'type'],
  fieldTypeFilters: [ML_JOB_FIELD_TYPES.NUMBER],
  sampleSizeValidations: [
    { size: 1000, expected: { field: 'airline', docCountFormatted: '1000 (100%)' } },
    { size: 5000, expected: { field: '@timestamp', docCountFormatted: '5000 (100%)' } },
  ],
  expected: {
    totalDocCountFormatted: '5,673',
    metricFields: [
      {
        fieldName: 'responsetime',
        type: ML_JOB_FIELD_TYPES.NUMBER,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        statsMaxDecimalPlaces: 3,
        topValuesCount: 10,
        viewableInLens: true,
      },
    ],
    nonMetricFields: [
      {
        fieldName: '@timestamp',
        type: ML_JOB_FIELD_TYPES.DATE,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '5000 (100%)',
        exampleCount: 2,
        viewableInLens: true,
      },
      {
        fieldName: '@version',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: '@version.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'airline',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        exampleContent: ['ASA'],
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
      {
        fieldName: 'type',
        type: ML_JOB_FIELD_TYPES.TEXT,
        existsInDocs: true,
        aggregatable: false,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '',
        viewableInLens: false,
      },
      {
        fieldName: 'type.keyword',
        type: ML_JOB_FIELD_TYPES.KEYWORD,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        exampleCount: 1,
        docCountFormatted: '5000 (100%)',
        viewableInLens: true,
      },
    ],
    emptyFields: ['sourcetype'],
    visibleMetricFieldsCount: 1,
    totalMetricFieldsCount: 1,
    populatedFieldsCount: 7,
    totalFieldsCount: 8,
    fieldNameFiltersResultCount: 2,
    fieldTypeFiltersResultCount: 1,
  },
};

const sampleLogTestData: TestData = {
  suiteTitle: 'geo point field',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'ft_module_sample_logs',
  fieldNameFilters: ['geo.coordinates'],
  fieldTypeFilters: [ML_JOB_FIELD_TYPES.GEO_POINT],
  rowsPerPage: 50,
  expected: {
    totalDocCountFormatted: '408',
    metricFields: [],
    // only testing the geo_point fields
    nonMetricFields: [
      {
        fieldName: 'geo.coordinates',
        type: ML_JOB_FIELD_TYPES.GEO_POINT,
        existsInDocs: true,
        aggregatable: true,
        loading: false,
        docCountFormatted: '408 (100%)',
        exampleCount: 10,
        viewableInLens: false,
      },
    ],
    emptyFields: [],
    visibleMetricFieldsCount: 4,
    totalMetricFieldsCount: 5,
    populatedFieldsCount: 35,
    totalFieldsCount: 36,
    fieldNameFiltersResultCount: 1,
    fieldTypeFiltersResultCount: 1,
  },
  sampleSizeValidations: [
    { size: 1000, expected: { field: 'geo.coordinates', docCountFormatted: '408 (100%)' } },
    { size: 5000, expected: { field: '@timestamp', docCountFormatted: '408 (100%)' } },
  ],
};

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'settings']);
  const ml = getService('ml');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');

  /** Discover page helpers **/
  const assertHitCount = async (expectedHitCount: string) => {
    await retry.tryForTime(2 * 1000, async () => {
      // Close side bar to ensure Discover hit count shows
      // edge case for when browser width is small
      await PageObjects.discover.closeSidebar();
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.eql(
        expectedHitCount,
        `Expected Discover hit count to be ${expectedHitCount} but got ${hitCount}.`
      );
    });
  };

  const assertViewModeToggleNotExists = async () => {
    await retry.tryForTime(2 * 1000, async () => {
      await testSubjects.missingOrFail('dscViewModeToggle');
    });
  };

  const assertViewModeToggleExists = async () => {
    await retry.tryForTime(2 * 1000, async () => {
      await testSubjects.existOrFail('dscViewModeToggle');
    });
  };

  const assertFieldStatsTableNotExists = async () => {
    await testSubjects.missingOrFail('dscFieldStatsEmbeddedContent');
  };

  const clickViewModeFieldStatsButton = async () => {
    await retry.tryForTime(2 * 1000, async () => {
      await testSubjects.existOrFail('dscViewModeFieldStatsButton');
      await testSubjects.clickWhenNotDisabled('dscViewModeFieldStatsButton');
      await testSubjects.existOrFail('dscFieldStatsEmbeddedContent');
    });
  };

  const selectIndexPattern = async (indexPattern: string) => {
    await retry.tryForTime(2 * 1000, async () => {
      await PageObjects.discover.selectIndexPattern(indexPattern);
      const indexPatternTitle = await testSubjects.getVisibleText('indexPattern-switch-link');
      expect(indexPatternTitle).to.be(indexPattern);
    });
  };

  const clearAdvancedSetting = async (propertyName: string) => {
    await retry.tryForTime(2 * 1000, async () => {
      await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
        shouldUseHashForSubUrl: false,
      });
      if ((await PageObjects.settings.getAdvancedSettingCheckbox(propertyName)) === 'true') {
        await PageObjects.settings.clearAdvancedSettings(propertyName);
      }
    });
  };

  const setAdvancedSettingCheckbox = async (propertyName: string, checkedState: boolean) => {
    await retry.tryForTime(2 * 1000, async () => {
      await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
        shouldUseHashForSubUrl: false,
      });
      await testSubjects.click('settings');
      await toasts.dismissAllToasts();
      await PageObjects.settings.toggleAdvancedSettingCheckbox(propertyName, checkedState);
    });
  };

  function runTestsWhenDisabled(testData: TestData) {
    it('should not show view mode toggle or Field stats table', async function () {
      await PageObjects.common.navigateToApp('discover');
      if (testData.isSavedSearch) {
        await retry.tryForTime(2 * 1000, async () => {
          await PageObjects.discover.loadSavedSearch(testData.sourceIndexOrSavedSearch);
        });
      } else {
        await selectIndexPattern(testData.sourceIndexOrSavedSearch);
      }

      await PageObjects.timePicker.setAbsoluteRange(
        'Jan 1, 2016 @ 00:00:00.000',
        'Nov 1, 2020 @ 00:00:00.000'
      );

      await assertViewModeToggleNotExists();
      await assertFieldStatsTableNotExists();
    });
  }

  function runTests(testData: TestData) {
    describe(`with ${testData.suiteTitle}`, function () {
      it(`displays the 'Field statistics' table content correctly`, async function () {
        await PageObjects.common.navigateToApp('discover');
        if (testData.isSavedSearch) {
          await retry.tryForTime(2 * 1000, async () => {
            await PageObjects.discover.loadSavedSearch(testData.sourceIndexOrSavedSearch);
          });
        } else {
          await selectIndexPattern(testData.sourceIndexOrSavedSearch);
        }
        await PageObjects.timePicker.setAbsoluteRange(
          'Jan 1, 2016 @ 00:00:00.000',
          'Nov 1, 2020 @ 00:00:00.000'
        );

        await assertHitCount(testData.expected.totalDocCountFormatted);
        await assertViewModeToggleExists();
        await clickViewModeFieldStatsButton();
        await ml.testExecution.logTestStep(
          'displays details for metric fields and non-metric fields correctly'
        );
        for (const fieldRow of testData.expected.metricFields as Array<
          Required<MetricFieldVisConfig>
        >) {
          await ml.dataVisualizerTable.assertNumberFieldContents(
            fieldRow.fieldName,
            fieldRow.docCountFormatted,
            fieldRow.topValuesCount,
            fieldRow.viewableInLens
          );
        }

        for (const fieldRow of testData.expected.nonMetricFields!) {
          await ml.dataVisualizerTable.assertNonMetricFieldContents(
            fieldRow.type,
            fieldRow.fieldName!,
            fieldRow.docCountFormatted,
            fieldRow.exampleCount,
            fieldRow.viewableInLens,
            false,
            fieldRow.exampleContent
          );
        }
      });
    });
  }

  describe('field statistics in Discover', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/module_sample_logs');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createIndexPatternIfNeeded('ft_module_sample_logs', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded();
      await ml.testResources.createSavedSearchFarequoteLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndKueryIfNeeded();
    });

    after(async function () {
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_logs');

      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_module_sample_logs');
      await ml.testResources.deleteSavedSearches();
      await clearAdvancedSetting(SHOW_FIELD_STATISTICS);
    });

    describe('when enabled', function () {
      before(async function () {
        await setAdvancedSettingCheckbox(SHOW_FIELD_STATISTICS, true);
      });

      after(async function () {
        await clearAdvancedSetting(SHOW_FIELD_STATISTICS);
      });

      runTests(farequoteIndexPatternTestData);
      runTests(farequoteKQLSearchTestData);
      runTests(farequoteLuceneSearchTestData);
      runTests(farequoteKQLFiltersSearchTestData);
      runTests(farequoteLuceneFiltersSearchTestData);
      runTests(sampleLogTestData);
    });

    describe('when disabled', function () {
      before(async function () {
        // Ensure that the setting is set to default state which is false
        await setAdvancedSettingCheckbox(SHOW_FIELD_STATISTICS, false);
      });

      runTestsWhenDisabled(farequoteIndexPatternTestData);
      runTestsWhenDisabled(farequoteKQLSearchTestData);
    });
  });
}
