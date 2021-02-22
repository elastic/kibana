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
    id: `ec_starting_${date}_${continuous ? 'continuous' : 'batch'}`,
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

  describe('starting', function () {
    const testDataList = [
      {
        suiteTitle: 'continuous transform with pivot configuration',
        originalConfig: getTransformConfig(true),
        mode: 'continuous',
        expected: {
          mode: TRANSFORM_STATE.INDEXING,
        },
      },
    ];

    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
      await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');

      for (const testData of testDataList) {
        await transform.api.createTransform(testData.originalConfig.id, testData.originalConfig);
      }
      await transform.testResources.setKibanaTimeZoneToUTC();
      await transform.securityUI.loginAsTransformPowerUser();
    });

    after(async () => {
      for (const testData of testDataList) {
        await transform.testResources.deleteIndexPatternByTitle(testData.originalConfig.dest.index);
        await transform.api.deleteIndices(testData.originalConfig.dest.index);
      }

      await transform.api.cleanTransformIndices();
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        it('start transform', async () => {
          await transform.testExecution.logTestStep('should load the home page');
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep('should display the transforms table');
          await transform.management.assertTransformsTableExists();

          await transform.testExecution.logTestStep(
            'should display the original transform in the transform list'
          );
          await transform.table.filterWithSearchString(testData.originalConfig.id, 1);

          await transform.testExecution.logTestStep('should start the transform');
          await transform.table.assertTransformRowActionEnabled('Start', true);
          await transform.table.clickTransformRowActionWithRetry('Start');
          await transform.table.confirmStartTransform();
          await transform.table.clearSearchString(testDataList.length);

          await transform.testExecution.logTestStep('should display the started transform');
          await transform.table.assertTransformRowStatusNotEql(
            testData.originalConfig.id,
            TRANSFORM_STATE.STOPPED
          );
        });
      });
    }
  });
}
