/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRANSFORM_HEALTH,
  TRANSFORM_HEALTH_LABEL,
  TRANSFORM_HEALTH_DESCRIPTION,
} from '@kbn/transform-plugin/common/constants';
import {
  TransformLatestConfig,
  TransformPivotConfig,
} from '@kbn/transform-plugin/common/types/transform';
import { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getLatestTransformConfig, getPivotTransformConfig } from '../helpers';
import { USER } from '../../../services/transform/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../services/ml/common_api';

interface TestDataPivot {
  suiteTitle: string;
  originalConfig: TransformPivotConfig;
  mode: 'batch' | 'continuous';
  type: 'pivot';
  expected: {
    healthDescription: string;
    healthLabel: string;
    healthStatus: string;
    reauthorizeEnabled: boolean;
    originalStatus: string;
  };
  created_by_user: USER;
  current_user: USER;
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
    reauthorizeEnabled: boolean;
    originalStatus: string;
  };
  created_by_user: USER;
  current_user: USER;
}

type TestData = TestDataPivot | TestDataLatest;

function generateHeaders(apiKey: SecurityCreateApiKeyResponse) {
  return {
    ...COMMON_REQUEST_HEADERS,
    'es-secondary-authorization': `ApiKey ${apiKey.encoded}`,
  };
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  const apiKeysForTransformUsers = new Map<USER, SecurityCreateApiKeyResponse>();

  describe('reauthorizing', function () {
    const PREFIX = 'reauthorizing';
    const testDataList: TestData[] = [
      {
        suiteTitle: 'continuous pivot transform (created by viewer, viewed by viewer)',
        originalConfig: getPivotTransformConfig(`${PREFIX}-${USER.TRANSFORM_VIEWER}-1`, true),
        mode: 'continuous',
        type: 'pivot',
        expected: {
          healthDescription: TRANSFORM_HEALTH_DESCRIPTION.green,
          healthLabel: TRANSFORM_HEALTH_LABEL.green,
          healthStatus: TRANSFORM_HEALTH.green,
          originalStatus: 'stopped',
          reauthorizeEnabled: false,
        },
        created_by_user: USER.TRANSFORM_VIEWER,
        current_user: USER.TRANSFORM_VIEWER,
      },
      {
        suiteTitle: 'continuous pivot transform (created by viewer, authorized by poweruser)',
        originalConfig: getPivotTransformConfig(`${PREFIX}-${USER.TRANSFORM_VIEWER}-2`, true),
        mode: 'continuous',
        type: 'pivot',
        expected: {
          healthDescription: TRANSFORM_HEALTH_DESCRIPTION.green,
          healthLabel: TRANSFORM_HEALTH_LABEL.green,
          healthStatus: TRANSFORM_HEALTH.green,
          originalStatus: 'stopped',
          reauthorizeEnabled: false,
        },
        created_by_user: USER.TRANSFORM_VIEWER,
        current_user: USER.TRANSFORM_POWERUSER,
      },
      {
        suiteTitle: 'continuous latest transform (created by poweruser, viewed by viewer)',
        originalConfig: getLatestTransformConfig(`${PREFIX}-${USER.TRANSFORM_POWERUSER}-1`, true),
        mode: 'continuous',
        type: 'latest',
        expected: {
          healthDescription: TRANSFORM_HEALTH_DESCRIPTION.green,
          healthLabel: TRANSFORM_HEALTH_LABEL.green,
          healthStatus: TRANSFORM_HEALTH.green,
          originalStatus: 'started',

          reauthorizeEnabled: false,
        },
        created_by_user: USER.TRANSFORM_POWERUSER,
        current_user: USER.TRANSFORM_VIEWER,
      },
    ];

    before(async () => {
      const apiKeyForTransformUsers =
        await transform.securityCommon.createApiKeyForTransformUsers();

      apiKeyForTransformUsers.forEach(({ user, apiKey }) =>
        apiKeysForTransformUsers.set(user.name as USER, apiKey)
      );

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
          deferValidation: true,
          headers: generateHeaders(apiKeysForTransformUsers.get(testData.created_by_user)!),
        });
        await transform.api.startTransform(testData.originalConfig.id, false);
      }
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await transform.securityCommon.clearAllTransformApiKeys();

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
        it('reauthorize transform', async () => {
          await transform.securityUI.loginAs(testData.current_user);

          await transform.testExecution.logTestStep('should load the home page');
          await transform.navigation.navigateTo();
          await transform.management.assertTransformListPageExists();

          await transform.testExecution.logTestStep('should display the transforms table');
          await transform.management.assertTransformsTableExists();

          await transform.testExecution.logTestStep('should display the transforms table');
          await transform.management.assertTransformsReauthorizeCalloutExists();

          await transform.testExecution.logTestStep(
            'should display the original transform in the transform list'
          );
          await transform.table.filterWithSearchString(transformId, 1);
          await transform.table.assertTransformRowFields(transformId, {
            status: testData.expected.originalStatus,
          });

          if (testData.expected.reauthorizeEnabled) {
            await transform.testExecution.logTestStep('should reauthorize the transform');
            await transform.table.assertTransformRowActionEnabled(
              transformId,
              'Reauthorize',
              testData.expected.reauthorizeEnabled
            );
            await transform.table.clickTransformRowAction(transformId, 'Reauthorize');
            await transform.table.confirmReauthorizeTransform();

            await transform.table.assertTransformExpandedRowHealth(
              testData.expected.healthDescription,
              testData.expected.healthStatus !== TRANSFORM_HEALTH.green
            );
          }

          await transform.table.clearSearchString(testDataList.length);
        });
      });
    }
  });
}
