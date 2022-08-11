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

  describe('resetting', function () {
    const PREFIX = 'resetting';

    const testDataList = [
      {
        suiteTitle: 'batch transform with pivot configuration',
        originalConfig: getPivotTransformConfig(PREFIX, false),
        expected: {
          messageText: 'reset transform.',
          row: {
            status: TRANSFORM_STATE.STOPPED,
            type: 'pivot',
            mode: 'batch',
            progress: 100,
          },
        },
      },
      {
        suiteTitle: 'continuous transform with pivot configuration',
        originalConfig: getPivotTransformConfig(PREFIX, true),
        expected: {
          messageText: 'reset transform.',
          row: {
            status: TRANSFORM_STATE.STOPPED,
            type: 'pivot',
            mode: 'continuous',
            progress: undefined,
          },
        },
      },
      {
        suiteTitle: 'batch transform with latest configuration',
        originalConfig: getLatestTransformConfig(PREFIX),
        transformDescription: 'updated description',
        transformDocsPerSecond: '1000',
        transformFrequency: '10m',
        expected: {
          messageText: 'reset transform.',
          row: {
            status: TRANSFORM_STATE.STOPPED,
            type: 'latest',
            mode: 'batch',
            progress: 100,
          },
        },
      },
    ];

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');

      for (const testData of testDataList) {
        await transform.api.createAndRunTransform(
          testData.originalConfig.id,
          testData.originalConfig
        );
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
      describe(`${testData.suiteTitle}`, function () {
        it('reset transform', async () => {
          await transform.testExecution.logTestStep('should load the home page');
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep('should display the transforms table');
          await transform.management.assertTransformsTableExists();

          if (testData.expected.row.mode === 'continuous') {
            await transform.testExecution.logTestStep('should have the reset action disabled');
            await transform.table.assertTransformRowActionEnabled(
              testData.originalConfig.id,
              'Reset',
              false
            );

            await transform.testExecution.logTestStep('should stop the transform');
            await transform.table.clickTransformRowAction(testData.originalConfig.id, 'Stop');
          }

          await transform.testExecution.logTestStep('should display the stopped transform');
          await transform.table.assertTransformRowFields(testData.originalConfig.id, {
            id: testData.originalConfig.id,
            description: testData.originalConfig.description,
            type: testData.expected.row.type,
            status: testData.expected.row.status,
            mode: testData.expected.row.mode,
            progress: testData.expected.row.progress,
          });

          await transform.testExecution.logTestStep('should show the reset modal');
          await transform.table.assertTransformRowActionEnabled(
            testData.originalConfig.id,
            'Reset',
            true
          );
          await transform.table.clickTransformRowAction(testData.originalConfig.id, 'Reset');
          await transform.table.assertTransformResetModalExists();

          await transform.testExecution.logTestStep('should reset the transform');
          await transform.table.confirmResetTransform();

          await transform.testExecution.logTestStep(
            'should display the messages tab and include a reset message'
          );
          await transform.table.refreshTransformList();
          await transform.table.filterWithSearchString(testData.originalConfig.id, 1);
          await transform.table.assertTransformExpandedRowMessages(testData.expected.messageText);
        });
      });
    }
  });
}
