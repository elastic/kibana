/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORM_STATE } from '@kbn/transform-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getLatestTransformConfig, getPivotTransformConfig } from '.';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('starting', function () {
    const PREFIX = 'starting';
    const testDataList = [
      {
        suiteTitle: 'batch transform with pivot configuration',
        originalConfig: getPivotTransformConfig(PREFIX, false),
        mode: 'batch',
      },
      {
        suiteTitle: 'continuous transform with pivot configuration',
        originalConfig: getPivotTransformConfig(PREFIX, true),
        mode: 'continuous',
      },
      {
        suiteTitle: 'batch transform with latest configuration',
        originalConfig: getLatestTransformConfig(PREFIX, false),
        mode: 'batch',
      },
      {
        suiteTitle: 'continuous transform with latest configuration',
        originalConfig: getLatestTransformConfig(PREFIX, true),
        mode: 'continuous',
      },
    ];

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
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
      await transform.testResources.deleteIndexPatternByTitle('ft_ecommerce');
    });

    for (const testData of testDataList) {
      const transformId = testData.originalConfig.id;

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
          await transform.table.filterWithSearchString(transformId, 1);

          await transform.testExecution.logTestStep('should start the transform');
          await transform.table.assertTransformRowActionEnabled(transformId, 'Start', true);
          await transform.table.clickTransformRowAction(transformId, 'Start');
          await transform.table.confirmStartTransform();
          await transform.table.clearSearchString(testDataList.length);

          if (testData.mode === 'continuous') {
            await transform.testExecution.logTestStep('should display the started transform');
            await transform.table.assertTransformRowStatusNotEql(
              testData.originalConfig.id,
              TRANSFORM_STATE.STOPPED
            );
          } else {
            await transform.table.assertTransformRowProgressGreaterThan(transformId, 0);
          }

          await transform.table.assertTransformRowStatusNotEql(
            testData.originalConfig.id,
            TRANSFORM_STATE.FAILED
          );
          await transform.table.assertTransformRowStatusNotEql(
            testData.originalConfig.id,
            TRANSFORM_STATE.ABORTING
          );
        });
      });
    }
  });
}
