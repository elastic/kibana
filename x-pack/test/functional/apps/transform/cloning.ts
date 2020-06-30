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

        it('should load the home page', async () => {
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();
        });

        it('should display the transforms table', async () => {
          await transform.management.assertTransformsTableExists();
        });

        it('should display the original transform in the transform list', async () => {
          await transform.table.refreshTransformList();
          await transform.table.filterWithSearchString(transformConfig.id);
          const rows = await transform.table.parseTransformTable();
          expect(rows.filter((row) => row.id === transformConfig.id)).to.have.length(1);
        });

        it('should show the actions popover', async () => {
          await transform.table.assertTransformRowActions(false);
        });

        it('should display the define pivot step', async () => {
          await transform.table.clickTransformRowAction('Clone');
          await transform.wizard.assertDefineStepActive();
        });

        it('should load the index preview', async () => {
          await transform.wizard.assertIndexPreviewLoaded();
        });

        it('should show the index preview', async () => {
          await transform.wizard.assertIndexPreview(
            testData.expected.indexPreview.columns,
            testData.expected.indexPreview.rows
          );
        });

        it('should display the query input', async () => {
          await transform.wizard.assertQueryInputExists();
          await transform.wizard.assertQueryValue('');
        });

        it('should show the pre-filled group-by configuration', async () => {
          await transform.wizard.assertGroupByEntryExists(
            testData.expected.groupBy.index,
            testData.expected.groupBy.label
          );
        });

        it('should show the pre-filled aggs configuration', async () => {
          await transform.wizard.assertAggregationEntryExists(
            testData.expected.aggs.index,
            testData.expected.aggs.label
          );
        });

        it('should show the pivot preview', async () => {
          await transform.wizard.assertPivotPreviewChartHistogramButtonMissing();
          await transform.wizard.assertPivotPreviewColumnValues(
            testData.expected.pivotPreview.column,
            testData.expected.pivotPreview.values
          );
        });

        it('should load the details step', async () => {
          await transform.wizard.advanceToDetailsStep();
        });

        it('should input the transform id', async () => {
          await transform.wizard.assertTransformIdInputExists();
          await transform.wizard.assertTransformIdValue('');
          await transform.wizard.setTransformId(testData.transformId);
        });

        it('should input the transform description', async () => {
          await transform.wizard.assertTransformDescriptionInputExists();
          await transform.wizard.assertTransformDescriptionValue('');
          await transform.wizard.setTransformDescription(testData.transformDescription);
        });

        it('should input the destination index', async () => {
          await transform.wizard.assertDestinationIndexInputExists();
          await transform.wizard.assertDestinationIndexValue('');
          await transform.wizard.setDestinationIndex(testData.destinationIndex);
        });

        it('should display the create index pattern switch', async () => {
          await transform.wizard.assertCreateIndexPatternSwitchExists();
          await transform.wizard.assertCreateIndexPatternSwitchCheckState(true);
        });

        it('should display the continuous mode switch', async () => {
          await transform.wizard.assertContinuousModeSwitchExists();
          await transform.wizard.assertContinuousModeSwitchCheckState(false);
        });

        it('should load the create step', async () => {
          await transform.wizard.advanceToCreateStep();
        });

        it('should display the create and start button', async () => {
          await transform.wizard.assertCreateAndStartButtonExists();
          await transform.wizard.assertCreateAndStartButtonEnabled(true);
        });

        it('should display the create button', async () => {
          await transform.wizard.assertCreateButtonExists();
          await transform.wizard.assertCreateButtonEnabled(true);
        });

        it('should display the copy to clipboard button', async () => {
          await transform.wizard.assertCopyToClipboardButtonExists();
          await transform.wizard.assertCopyToClipboardButtonEnabled(true);
        });

        it('should create the transform', async () => {
          await transform.wizard.createTransform();
        });

        it('should start the transform and finish processing', async () => {
          await transform.wizard.startTransform();
          await transform.wizard.waitForProgressBarComplete();
        });

        it('should return to the management page', async () => {
          await transform.wizard.returnToManagement();
        });

        it('should display the transforms table', async () => {
          await transform.management.assertTransformsTableExists();
        });

        it('should display the created transform in the transform list', async () => {
          await transform.table.refreshTransformList();
          await transform.table.filterWithSearchString(testData.transformId);
          const rows = await transform.table.parseTransformTable();
          expect(rows.filter((row) => row.id === testData.transformId)).to.have.length(1);
        });
      });
    }
  });
}
