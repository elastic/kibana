/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { TransformPivotConfig } from '../../../../plugins/transform/public/app/common';

function getTransformConfig(): TransformPivotConfig {
  const date = Date.now();
  return {
    id: `ec_2_${date}`,
    source: { index: ['ft_ecommerce'] },
    pivot: {
      group_by: { category: { terms: { field: 'category.keyword' } } },
      aggregations: { 'products.base_price.avg': { avg: { field: 'products.base_price' } } },
    },
    description:
      'ecommerce batch transform with avg(products.base_price) grouped by terms(category.keyword)',
    dest: { index: `user-ec_2_${date}` },
  };
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('cloning', function () {
    const transformConfig = getTransformConfig();

    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
      await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      await transform.api.createAndRunTransform(transformConfig);
      await transform.testResources.setKibanaTimeZoneToUTC();

      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      await transform.testResources.deleteIndexPatternByTitle(transformConfig.dest.index);
      await transform.api.deleteIndices(transformConfig.dest.index);
      await transform.api.cleanTransformIndices();
    });

    const testDataList = [
      {
        suiteTitle: 'clone transform',
        transformId: `clone_${transformConfig.id}`,
        transformDescription: `a cloned transform`,
        get destinationIndex(): string {
          return `user-${this.transformId}`;
        },
        expected: {
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
          pivotPreview: {
            column: 0,
            values: [
              `Men's Accessories`,
              `Men's Clothing`,
              `Men's Shoes`,
              `Women's Accessories`,
              `Women's Clothing`,
            ],
          },
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
          await transform.table.filterWithSearchString(transformConfig.id);
          const rows = await transform.table.parseTransformTable();
          expect(rows.filter((row) => row.id === transformConfig.id)).to.have.length(1);

          await transform.testExecution.logTestStep('should show the actions popover');
          await transform.table.assertTransformRowActions(false);

          await transform.testExecution.logTestStep('should display the define pivot step');
          await transform.table.clickTransformRowAction('Clone');
          await transform.wizard.assertDefineStepActive();
        });

        it('navigates through the wizard, checks and sets all needed fields', async () => {
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

          await transform.testExecution.logTestStep('should show the pivot preview');
          await transform.wizard.assertPivotPreviewChartHistogramButtonMissing();
          await transform.wizard.assertPivotPreviewColumnValues(
            testData.expected.pivotPreview.column,
            testData.expected.pivotPreview.values
          );

          await transform.testExecution.logTestStep('should load the details step');
          await transform.wizard.advanceToDetailsStep();

          await transform.testExecution.logTestStep('should input the transform id');
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.assertTransformIdValue('');
          await transform.wizard.setTransformId(testData.transformId);

          await transform.testExecution.logTestStep('should input the transform description');
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.assertTransformDescriptionValue('');
          await transform.wizard.setTransformDescription(testData.transformDescription);

          await transform.testExecution.logTestStep('should input the destination index');
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.assertDestinationIndexValue('');
          await transform.wizard.setDestinationIndex(testData.destinationIndex);

          await transform.testExecution.logTestStep(
            'should display the create index pattern switch'
          );
          await transform.wizard.assertCreateIndexPatternSwitchExists();
          await transform.wizard.assertCreateIndexPatternSwitchCheckState(true);

          await transform.testExecution.logTestStep('should display the continuous mode switch');
          await transform.wizard.assertContinuousModeSwitchExists();
          await transform.wizard.assertContinuousModeSwitchCheckState(false);

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
          await transform.table.filterWithSearchString(testData.transformId);
          const rows = await transform.table.parseTransformTable();
          expect(rows.filter((row) => row.id === testData.transformId)).to.have.length(1);
        });
      });
    }
  });
}
