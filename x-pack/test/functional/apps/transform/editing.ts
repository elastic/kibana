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

  describe('editing', function () {
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

    const testData = {
      suiteTitle: 'edit transform',
      transformDescription: 'updated description',
      transformDocsPerSecond: '1000',
      transformFrequency: '10m',
      expected: {
        messageText: 'updated transform.',
        row: {
          status: 'stopped',
          mode: 'batch',
          progress: '100',
        },
      },
    };

    describe(`${testData.suiteTitle}`, function () {
      it('opens the edit flyout for an existing transform', async () => {
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

        await transform.testExecution.logTestStep('should show the edit flyout');
        await transform.table.clickTransformRowAction('Edit');
        await transform.editFlyout.assertTransformEditFlyoutExists();
      });

      it('navigates through the edit flyout and sets all needed fields', async () => {
        await transform.testExecution.logTestStep('should update the transform description');
        await transform.editFlyout.assertTransformEditFlyoutInputExists('Description');
        await transform.editFlyout.assertTransformEditFlyoutInputValue(
          'Description',
          transformConfig?.description ?? ''
        );
        await transform.editFlyout.setTransformEditFlyoutInputValue(
          'Description',
          testData.transformDescription
        );

        await transform.testExecution.logTestStep(
          'should update the transform documents per second'
        );
        await transform.editFlyout.assertTransformEditFlyoutInputExists('DocsPerSecond');
        await transform.editFlyout.assertTransformEditFlyoutInputValue('DocsPerSecond', '');
        await transform.editFlyout.setTransformEditFlyoutInputValue(
          'DocsPerSecond',
          testData.transformDocsPerSecond
        );

        await transform.testExecution.logTestStep('should update the transform frequency');
        await transform.editFlyout.assertTransformEditFlyoutInputExists('Frequency');
        await transform.editFlyout.assertTransformEditFlyoutInputValue('Frequency', '');
        await transform.editFlyout.setTransformEditFlyoutInputValue(
          'Frequency',
          testData.transformFrequency
        );
      });

      it('updates the transform and displays it correctly in the job list', async () => {
        await transform.testExecution.logTestStep('should update the transform');
        await transform.editFlyout.updateTransform();

        await transform.testExecution.logTestStep('should display the transforms table');
        await transform.management.assertTransformsTableExists();

        await transform.testExecution.logTestStep(
          'should display the updated transform in the transform list'
        );
        await transform.table.refreshTransformList();
        await transform.table.filterWithSearchString(transformConfig.id);
        const rows = await transform.table.parseTransformTable();
        expect(rows.filter((row) => row.id === transformConfig.id)).to.have.length(1);

        await transform.testExecution.logTestStep(
          'should display the updated transform in the transform list row cells'
        );
        await transform.table.assertTransformRowFields(transformConfig.id, {
          id: transformConfig.id,
          description: testData.transformDescription,
          status: testData.expected.row.status,
          mode: testData.expected.row.mode,
          progress: testData.expected.row.progress,
        });

        await transform.testExecution.logTestStep(
          'should display the messages tab and include an update message'
        );
        await transform.table.assertTransformExpandedRowMessages(testData.expected.messageText);
      });
    });
  });
}
