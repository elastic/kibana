/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  isLatestTransform,
  isPivotTransform,
  TransformPivotConfig,
} from '../../../../plugins/transform/common/types/transform';
import { getLatestTransformConfig } from './index';

interface TestData {
  type: 'pivot' | 'latest';
  suiteTitle: string;
  originalConfig: any;
  transformId: string;
  transformDescription: string;
  destinationIndex: string;
  expected: any;
}

function getTransformConfig(): TransformPivotConfig {
  const date = Date.now();
  return {
    id: `ec_cloning_1_${date}`,
    source: { index: ['ft_ecommerce'] },
    pivot: {
      group_by: { category: { terms: { field: 'category.keyword' } } },
      aggregations: { 'products.base_price.avg': { avg: { field: 'products.base_price' } } },
    },
    description:
      'ecommerce batch transform with avg(products.base_price) grouped by terms(category)',
    frequency: '3s',
    retention_policy: { time: { field: 'order_date', max_age: '1d' } },
    settings: {
      max_page_search_size: 250,
    },
    dest: { index: `user-ec_2_${date}` },
  };
}

function getTransformConfigWithRuntimeMappings(): TransformPivotConfig {
  const date = Date.now();

  return {
    id: `ec_cloning_runtime_${date}`,
    source: {
      index: ['ft_ecommerce'],
      runtime_mappings: {
        rt_gender_lower: {
          type: 'keyword',
          script: "emit(doc['customer_gender'].value.toLowerCase())",
        },
        rt_total_charge: {
          type: 'double',
          script: {
            source: "emit(doc['taxful_total_price'].value + 4.00)",
          },
        },
      },
    },
    pivot: {
      group_by: { rt_gender_lower: { terms: { field: 'rt_gender_lower' } } },
      aggregations: {
        'rt_total_charge.avg': { avg: { field: 'rt_total_charge' } },
        'rt_total_charge.min': { min: { field: 'rt_total_charge' } },
        'rt_total_charge.max': { max: { field: 'rt_total_charge' } },
      },
    },
    description: 'ecommerce batch transform grouped by terms(rt_gender_lower)',
    frequency: '3s',
    retention_policy: { time: { field: 'order_date', max_age: '3d' } },
    settings: {
      max_page_search_size: 250,
    },
    dest: { index: `user-ec_2_${date}` },
  };
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('cloning', function () {
    const transformConfigWithPivot = getTransformConfig();
    const transformConfigWithRuntimeMapping = getTransformConfigWithRuntimeMappings();
    const transformConfigWithLatest = getLatestTransformConfig('cloning');

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      await transform.api.createAndRunTransform(
        transformConfigWithPivot.id,
        transformConfigWithPivot
      );
      await transform.api.createAndRunTransform(
        transformConfigWithRuntimeMapping.id,
        transformConfigWithRuntimeMapping
      );
      await transform.api.createAndRunTransform(
        transformConfigWithLatest.id,
        transformConfigWithLatest
      );
      await transform.testResources.setKibanaTimeZoneToUTC();

      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      await transform.testResources.deleteIndexPatternByTitle(transformConfigWithPivot.dest.index);
      await transform.testResources.deleteIndexPatternByTitle(
        transformConfigWithRuntimeMapping.dest.index
      );

      await transform.testResources.deleteIndexPatternByTitle(transformConfigWithLatest.dest.index);
      await transform.api.deleteIndices(transformConfigWithPivot.dest.index);
      await transform.api.deleteIndices(transformConfigWithRuntimeMapping.dest.index);
      await transform.api.deleteIndices(transformConfigWithLatest.dest.index);
      await transform.api.cleanTransformIndices();
      await transform.testResources.deleteIndexPatternByTitle('ft_ecommerce');
    });

    const testDataList: TestData[] = [
      {
        type: 'pivot' as const,
        suiteTitle: 'clone transform',
        originalConfig: transformConfigWithPivot,
        transformId: `clone_${transformConfigWithPivot.id}`,
        transformDescription: `a cloned transform`,
        get destinationIndex(): string {
          return `user-${this.transformId}`;
        },
        expected: {
          runtimeMappingsEditorValueArr: [''],
          aggs: {
            index: 0,
            label: 'products.base_price.avg',
          },
          indexPreview: {
            columns: 10,
            rows: 5,
          },
          groupBy: {
            index: 0,
            label: 'category',
          },
          transformPreview: {
            column: 0,
            values: [
              `Men's Accessories`,
              `Men's Clothing`,
              `Men's Shoes`,
              `Women's Accessories`,
              `Women's Clothing`,
            ],
          },
          retentionPolicySwitchEnabled: true,
          retentionPolicyField: 'order_date',
          retentionPolicyMaxAge: '1d',
        },
      },
      {
        type: 'pivot' as const,
        suiteTitle: 'clone transform with runtime mappings',
        originalConfig: transformConfigWithRuntimeMapping,
        transformId: `clone_${transformConfigWithRuntimeMapping.id}`,
        transformDescription: `a cloned transform with runtime mappings`,
        get destinationIndex(): string {
          return `user-${this.transformId}`;
        },
        expected: {
          runtimeMappingsEditorValueArr: ['{', '  "rt_gender_lower": {', '    "type": "keyword",'],
          aggs: {
            index: 0,
            label: 'rt_total_charge.avg',
          },
          indexPreview: {
            columns: 10,
            rows: 5,
          },
          groupBy: {
            index: 0,
            label: 'rt_gender_lower',
          },
          transformPreview: {
            column: 0,
            values: [`female`, `male`],
          },
          retentionPolicySwitchEnabled: true,
          retentionPolicyField: 'order_date',
          retentionPolicyMaxAge: '3d',
        },
      },
      {
        type: 'latest' as const,
        suiteTitle: 'clone transform with latest function',
        originalConfig: transformConfigWithLatest,
        transformId: `clone_${transformConfigWithLatest.id}`,
        transformDescription: `a cloned transform`,
        get destinationIndex(): string {
          return `user-${this.transformId}`;
        },
        expected: {
          indexPreview: {
            columns: 10,
            rows: 5,
          },
          transformPreview: {
            column: 0,
            values: [
              'July 12th 2019, 23:06:43',
              'July 12th 2019, 23:31:12',
              'July 12th 2019, 23:45:36',
            ],
          },
          retentionPolicySwitchEnabled: false,
        },
      },
    ];

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        after(async () => {
          await transform.api.deleteIndices(testData.destinationIndex);
          await transform.testResources.deleteIndexPatternByTitle(testData.destinationIndex);
        });

        it('opens the existing transform in the wizard', async () => {
          await transform.testExecution.logTestStep('should load the home page');
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep('should display the transforms table');
          await transform.management.assertTransformsTableExists();

          await transform.testExecution.logTestStep(
            'should display the original transform in the transform list'
          );
          await transform.table.refreshTransformList();
          await transform.table.filterWithSearchString(testData.originalConfig.id, 1);

          await transform.testExecution.logTestStep('should show the actions popover');
          await transform.table.assertTransformRowActions(testData.originalConfig.id, false);

          await transform.testExecution.logTestStep('should display the define pivot step');
          await transform.table.clickTransformRowAction(testData.originalConfig.id, 'Clone');
          await transform.wizard.assertSelectedTransformFunction(testData.type);
          await transform.wizard.assertDefineStepActive();
        });

        it('navigates through the wizard, checks and sets all needed fields', async () => {
          await transform.testExecution.logTestStep('should have runtime mapping editor');
          await transform.wizard.assertRuntimeMappingsEditorSwitchExists();
          await transform.wizard.assertRuntimeMappingsEditorSwitchCheckState(false);

          if (testData.expected.runtimeMappingsEditorValueArr) {
            await transform.wizard.toggleRuntimeMappingsEditorSwitch(true);
            await transform.wizard.assertRuntimeMappingsEditorExists();
            await transform.wizard.assertRuntimeMappingsEditorContent(
              testData.expected.runtimeMappingsEditorValueArr
            );
          }

          await transform.testExecution.logTestStep('should load the index preview');
          await transform.wizard.assertIndexPreviewLoaded();

          await transform.testExecution.logTestStep('should show the index preview');
          await transform.wizard.assertIndexPreview(
            testData.expected.indexPreview.columns,
            testData.expected.indexPreview.rows
          );

          await transform.testExecution.logTestStep('should display the query input');
          await transform.wizard.assertQueryInputExists();
          await transform.wizard.assertQueryValue('');

          // assert define step form
          if (isPivotTransform(testData.originalConfig)) {
            await transform.testExecution.logTestStep(
              'should show the pre-filled group-by configuration'
            );
            await transform.wizard.assertGroupByEntryExists(
              testData.expected.groupBy.index,
              testData.expected.groupBy.label
            );

            await transform.testExecution.logTestStep(
              'should show the pre-filled aggs configuration'
            );
            await transform.wizard.assertAggregationEntryExists(
              testData.expected.aggs.index,
              testData.expected.aggs.label
            );
          } else if (isLatestTransform(testData.originalConfig)) {
            await transform.testExecution.logTestStep('should show pre-filler unique keys');
            await transform.wizard.assertUniqueKeysInputValue(
              testData.originalConfig.latest.unique_key
            );
            await transform.testExecution.logTestStep('should show pre-filler sort field');
            await transform.wizard.assertSortFieldInputValue(testData.originalConfig.latest.sort);
          }

          await transform.testExecution.logTestStep('should show the pivot preview');
          await transform.wizard.assertPivotPreviewChartHistogramButtonMissing();
          await transform.wizard.assertPivotPreviewColumnValues(
            testData.expected.transformPreview.column,
            testData.expected.transformPreview.values
          );

          // assert details step form
          await transform.testExecution.logTestStep('should load the details step');
          await transform.wizard.advanceToDetailsStep();

          await transform.testExecution.logTestStep('should input the transform id');
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.assertTransformIdValue('');
          await transform.wizard.setTransformId(testData.transformId);

          await transform.testExecution.logTestStep('should input the transform description');
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.assertTransformDescriptionValue(
            testData.originalConfig.description!
          );
          await transform.wizard.setTransformDescription(testData.transformDescription);

          await transform.testExecution.logTestStep('should input the destination index');
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.assertDestinationIndexValue('');
          await transform.wizard.setDestinationIndex(testData.destinationIndex);

          await transform.testExecution.logTestStep('should display the create data view switch');
          await transform.wizard.assertCreateDataViewSwitchExists();
          await transform.wizard.assertCreateDataViewSwitchCheckState(true);

          await transform.testExecution.logTestStep('should display the continuous mode switch');
          await transform.wizard.assertContinuousModeSwitchExists();
          await transform.wizard.assertContinuousModeSwitchCheckState(false);

          await transform.testExecution.logTestStep(
            'should display the retention policy settings with pre-filled configuration'
          );
          await transform.wizard.assertRetentionPolicySwitchExists();
          await transform.wizard.assertRetentionPolicySwitchCheckState(
            testData.expected.retentionPolicySwitchEnabled
          );
          if (testData.expected.retentionPolicySwitchEnabled) {
            await transform.wizard.assertRetentionPolicyFieldSelectExists();
            await transform.wizard.assertRetentionPolicyFieldSelectValue(
              testData.expected.retentionPolicyField
            );
            await transform.wizard.assertRetentionPolicyMaxAgeInputExists();
            await transform.wizard.assertRetentionsPolicyMaxAgeValue(
              testData.expected.retentionPolicyMaxAge
            );
          }

          await transform.testExecution.logTestStep(
            'should display the advanced settings and show pre-filled configuration'
          );
          await transform.wizard.openTransformAdvancedSettingsAccordion();
          await transform.wizard.assertTransformFrequencyValue(testData.originalConfig.frequency!);
          await transform.wizard.assertTransformMaxPageSearchSizeValue(
            testData.originalConfig.settings!.max_page_search_size!
          );

          await transform.testExecution.logTestStep('should load the create step');
          await transform.wizard.advanceToCreateStep();

          await transform.testExecution.logTestStep('should display the create and start button');
          await transform.wizard.assertCreateAndStartButtonExists();
          await transform.wizard.assertCreateAndStartButtonEnabled(true);

          await transform.testExecution.logTestStep('should display the create button');
          await transform.wizard.assertCreateButtonExists();
          await transform.wizard.assertCreateButtonEnabled(true);

          await transform.testExecution.logTestStep('should display the copy to clipboard button');
          await transform.wizard.assertCopyToClipboardButtonExists();
          await transform.wizard.assertCopyToClipboardButtonEnabled(true);
        });

        it('runs the clone transform and displays it correctly in the job list', async () => {
          await transform.testExecution.logTestStep('should create the transform');
          await transform.wizard.createTransform();

          await transform.testExecution.logTestStep(
            'should start the transform and finish processing'
          );
          await transform.wizard.startTransform();
          await transform.wizard.waitForProgressBarComplete();

          await transform.testExecution.logTestStep('should return to the management page');
          await transform.wizard.returnToManagement();

          await transform.testExecution.logTestStep('should display the transforms table');
          await transform.management.assertTransformsTableExists();

          await transform.testExecution.logTestStep(
            'should display the created transform in the transform list'
          );
          await transform.table.refreshTransformList();
          await transform.table.filterWithSearchString(testData.transformId, 1);
        });
      });
    }
  });
}
