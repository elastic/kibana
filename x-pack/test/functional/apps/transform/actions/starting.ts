/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRANSFORM_STATE,
  TRANSFORM_HEALTH,
  TRANSFORM_HEALTH_LABEL,
  TRANSFORM_HEALTH_DESCRIPTION,
} from '@kbn/transform-plugin/common/constants';
import {
  TransformLatestConfig,
  TransformPivotConfig,
} from '@kbn/transform-plugin/common/types/transform';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getLatestTransformConfig, getPivotTransformConfig } from '../helpers';

interface TestDataPivot {
  suiteTitle: string;
  originalConfig: TransformPivotConfig;
  mode: 'batch' | 'continuous';
  type: 'pivot';
  expected: {
    healthDescription: string;
    healthLabel: string;
    healthStatus: string;
  };
}

interface TestDataLatest {
  suiteTitle: string;
  originalConfig: TransformLatestConfig;
  mode: 'batch' | 'continuous';
  type: 'latest';
  expected: {
    healthDescription: string;
    healthLabel: string;
    healthStatus: string;
  };
}

type TestData = TestDataPivot | TestDataLatest;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('starting', function () {
    const PREFIX = 'starting';
    const testDataList: TestData[] = [
      {
        suiteTitle: 'batch transform with pivot configuration',
        originalConfig: getPivotTransformConfig(PREFIX, false),
        mode: 'batch',
        type: 'pivot',
        expected: {
          healthDescription: TRANSFORM_HEALTH_DESCRIPTION.green,
          healthLabel: TRANSFORM_HEALTH_LABEL.green,
          healthStatus: TRANSFORM_HEALTH.green,
        },
      },
      {
        suiteTitle: 'continuous transform with pivot configuration',
        originalConfig: getPivotTransformConfig(PREFIX, true),
        mode: 'continuous',
        type: 'pivot',
        expected: {
          healthDescription: TRANSFORM_HEALTH_DESCRIPTION.green,
          healthLabel: TRANSFORM_HEALTH_LABEL.green,
          healthStatus: TRANSFORM_HEALTH.green,
        },
      },
      {
        suiteTitle: 'non healthy continuous transform with pivot configuration',
        originalConfig: getPivotTransformConfig(PREFIX, true, true),
        mode: 'continuous',
        type: 'pivot',
        expected: {
          healthDescription: TRANSFORM_HEALTH_DESCRIPTION.yellow,
          healthLabel: TRANSFORM_HEALTH_LABEL.yellow,
          healthStatus: TRANSFORM_HEALTH.yellow,
        },
      },
      {
        suiteTitle: 'batch transform with latest configuration',
        originalConfig: getLatestTransformConfig(PREFIX, false),
        mode: 'batch',
        type: 'latest',
        expected: {
          healthDescription: TRANSFORM_HEALTH_DESCRIPTION.green,
          healthLabel: TRANSFORM_HEALTH_LABEL.green,
          healthStatus: TRANSFORM_HEALTH.green,
        },
      },
      {
        suiteTitle: 'continuous transform with latest configuration',
        originalConfig: getLatestTransformConfig(PREFIX, true),
        mode: 'continuous',
        type: 'latest',
        expected: {
          healthDescription: TRANSFORM_HEALTH_DESCRIPTION.green,
          healthLabel: TRANSFORM_HEALTH_LABEL.green,
          healthStatus: TRANSFORM_HEALTH.green,
        },
      },
    ];

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');

      for (const testData of testDataList) {
        if (
          testData.expected.healthStatus === TRANSFORM_HEALTH.yellow &&
          testData.type === 'pivot'
        ) {
          testData.originalConfig.pivot.aggregations['products.base_price.fail'] = {
            avg: {
              script: {
                source: "def a = doc['non_existing'].value",
              },
            },
          };
        }
        await transform.api.createTransform(testData.originalConfig.id, testData.originalConfig, {
          deferValidation: testData.expected.healthStatus === TRANSFORM_HEALTH.yellow,
        });
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

          await transform.table.assertTransformExpandedRowHealth(
            testData.expected.healthDescription,
            testData.expected.healthStatus !== TRANSFORM_HEALTH.green
          );

          await transform.table.clearSearchString(testDataList.length);

          if (testData.mode === 'continuous') {
            await transform.testExecution.logTestStep('should display the started transform');
            await transform.table.assertTransformRowStatusNotEql(
              testData.originalConfig.id,
              TRANSFORM_STATE.STOPPED
            );
          } else if (testData.mode === 'batch') {
            await transform.testExecution.logTestStep('should display a healthy status');
            await transform.table.assertTransformRowProgressGreaterThan(transformId, 0);
          }

          await transform.table.assertTransformRowHealth(
            testData.originalConfig.id,
            testData.expected.healthLabel
          );

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
