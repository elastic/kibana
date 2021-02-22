/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPivotConfig } from '../../../../plugins/transform/common/types/transform';
import { TRANSFORM_STATE } from '../../../../plugins/transform/common/constants';

import { FtrProviderContext } from '../../ftr_provider_context';

function getTransformConfig(continuous?: boolean): TransformPivotConfig {
  const date = Date.now();
  return {
    id: `ec_deleting_${date}_${continuous ? 'continuous' : 'batch'}`,
    source: { index: ['ft_ecommerce'] },
    pivot: {
      group_by: { category: { terms: { field: 'category.keyword' } } },
      aggregations: { 'products.base_price.avg': { avg: { field: 'products.base_price' } } },
    },
    description:
      'ecommerce batch transform with avg(products.base_price) grouped by terms(category.keyword)',
    dest: { index: `user-ec_2_${date}` },
    ...(continuous ? { sync: { time: { field: 'order_date', delay: '60s' } } } : {}),
  };
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('deleting', function () {
    const transformConfigWithPivot = getTransformConfig(false);
    // const transformConfigWithLatest = getLatestTransformConfig();

    const testDataList = [
      // {
      //   suiteTitle: 'transform with pivot configuration',
      //   originalConfig: transformConfigWithPivot,
      //   expected: {
      //     row: {
      //       status: TRANSFORM_STATE.STOPPED,
      //       mode: 'batch',
      //       progress: 100,
      //     },
      //   },
      // },
      {
        suiteTitle: 'continuous transform with pivot configuration',
        originalConfig: getTransformConfig(true),
        expected: {
          row: {
            status: TRANSFORM_STATE.STARTED,
            mode: 'continuous',
            progress: undefined,
          },
        },
      },
      // TODO enable tests when https://github.com/elastic/elasticsearch/issues/67148 is resolved
      // {
      //   suiteTitle: 'delete transform with latest configuration',
      //   originalConfig: transformConfigWithLatest,
      //   transformDescription: 'updated description',
      //   transformDocsPerSecond: '1000',
      //   transformFrequency: '10m',
      //   expected: {
      //     messageText: 'updated transform.',
      //     row: {
      //       status: TRANSFORM_STATE.STOPPED,
      //       mode: 'batch',
      //       progress: '100',
      //     },
      //   },
      // },
    ];

    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
      await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');

      for (const testData of testDataList) {
        await transform.api.createAndRunTransform(
          testData.originalConfig.id,
          testData.originalConfig
        );
      }
      // await transform.api.createAndRunTransform(
      //   transformConfigWithLatest.id,
      //   transformConfigWithLatest
      // );

      await transform.testResources.setKibanaTimeZoneToUTC();
      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      await transform.testResources.deleteIndexPatternByTitle(transformConfigWithPivot.dest.index);
      await transform.api.deleteIndices(transformConfigWithPivot.dest.index);
      // await transform.testResources.deleteIndexPatternByTitle(transformConfigWithLatest.dest.index);
      // await transform.api.deleteIndices(transformConfigWithLatest.dest.index);
      await transform.api.cleanTransformIndices();
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        it('delete transform', async () => {
          await transform.testExecution.logTestStep('should load the home page');
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep('should display the transforms table');
          await transform.management.assertTransformsTableExists();

          await transform.testExecution.logTestStep(
            'should display the original transform in the transform list'
          );
          await transform.table.refreshTransformList();

          if (testData.expected.row.mode === 'continuous') {
            // await transform.testExecution.logTestStep('should have the delete action disabled');
            // await transform.table.assertTransformRowDeleteActionEnabled(false);

            await transform.testExecution.logTestStep('should stop the transform');
            await transform.table.clickTransformRowActionWithRetry('Stop');
            await transform.testExecution.logTestStep('should display the stopped transform');
            await transform.table.assertTransformRowFields(testData.originalConfig.id, {
              id: testData.originalConfig.id,
              description: testData.originalConfig.description,
              status: testData.expected.row.status,
              mode: testData.expected.row.mode,
              progress: testData.expected.row.progress,
            });
          }

          await transform.testExecution.logTestStep('should show the delete modal');
          await transform.table.assertTransformRowDeleteActionEnabled(true);
          await transform.table.clickTransformRowActionWithRetry('Delete');
          await transform.table.assertTransformDeleteModalExists();

          await transform.testExecution.logTestStep('should delete the transform');
          await transform.table.clickDeleteTransform(testData.originalConfig.id);
        });
      });
    }
  });
}
