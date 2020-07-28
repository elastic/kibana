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

      it('should show the edit flyout', async () => {
        await transform.table.clickTransformRowAction('Edit');
        await transform.editFlyout.assertTransformEditFlyoutExists();
      });

      it('should update the transform description', async () => {
        await transform.editFlyout.assertTransformEditFlyoutInputExists('Description');
        await transform.editFlyout.assertTransformEditFlyoutInputValue(
          'Description',
          transformConfig?.description ?? ''
        );
        await transform.editFlyout.setTransformEditFlyoutInputValue(
          'Description',
          testData.transformDescription
        );
      });

      it('should update the transform documents per second', async () => {
        await transform.editFlyout.assertTransformEditFlyoutInputExists('DocsPerSecond');
        await transform.editFlyout.assertTransformEditFlyoutInputValue('DocsPerSecond', '');
        await transform.editFlyout.setTransformEditFlyoutInputValue(
          'DocsPerSecond',
          testData.transformDocsPerSecond
        );
      });

      it('should update the transform frequency', async () => {
        await transform.editFlyout.assertTransformEditFlyoutInputExists('Frequency');
        await transform.editFlyout.assertTransformEditFlyoutInputValue('Frequency', '');
        await transform.editFlyout.setTransformEditFlyoutInputValue(
          'Frequency',
          testData.transformFrequency
        );
      });

      it('should update the transform', async () => {
        await transform.editFlyout.updateTransform();
      });

      it('should display the transforms table', async () => {
        await transform.management.assertTransformsTableExists();
      });

      it('should display the updated transform in the transform list', async () => {
        await transform.table.refreshTransformList();
        await transform.table.filterWithSearchString(transformConfig.id);
        const rows = await transform.table.parseTransformTable();
        expect(rows.filter((row) => row.id === transformConfig.id)).to.have.length(1);
      });

      it('should display the updated transform in the transform list row cells', async () => {
        await transform.table.assertTransformRowFields(transformConfig.id, {
          id: transformConfig.id,
          description: testData.transformDescription,
          status: testData.expected.row.status,
          mode: testData.expected.row.mode,
          progress: testData.expected.row.progress,
        });
      });

      it('should display the messages tab and include an update message', async () => {
        await transform.table.assertTransformExpandedRowMessages(testData.expected.messageText);
      });
    });
  });
}
