/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORM_HEALTH_LABEL, TRANSFORM_STATE } from '@kbn/transform-plugin/common/constants';
import type {
  TransformLatestConfig,
  TransformPivotConfig,
} from '@kbn/transform-plugin/common/types/transform';
import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { getLatestTransformConfig, getPivotTransformConfig } from '../helpers';
import { USER } from '../../../services/transform/security_common';
import { getCommonRequestHeader } from '../../../services/ml/common_api';

interface TestDataPivot {
  suiteTitle: string;
  originalConfig: TransformPivotConfig;
  mode: 'batch' | 'continuous';
  type: 'pivot';
  expected: {
    originalState: object;
    reauthorizeEnabled: boolean;
    reauthorizedState: object;
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
    originalState: object;
    reauthorizeEnabled: boolean;
    reauthorizedState: object;
  };
  created_by_user: USER;
  current_user: USER;
}

type TestData = TestDataPivot | TestDataLatest;

function generateHeaders(apiKey: SecurityCreateApiKeyResponse, version?: string) {
  return {
    ...getCommonRequestHeader(version),
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
          originalState: { status: TRANSFORM_STATE.STOPPED, health: TRANSFORM_HEALTH_LABEL.red },
          reauthorizeEnabled: false,
          reauthorizedState: {
            status: TRANSFORM_STATE.STARTED,
            health: TRANSFORM_HEALTH_LABEL.green,
          },
        },
        created_by_user: USER.TRANSFORM_VIEWER,
        current_user: USER.TRANSFORM_VIEWER,
      },
      {
        suiteTitle: 'batch pivot transform (created by viewer, viewed by poweruser)',
        originalConfig: getPivotTransformConfig(PREFIX, false),
        mode: 'batch',
        type: 'pivot',
        expected: {
          originalState: { status: TRANSFORM_STATE.STOPPED, health: TRANSFORM_HEALTH_LABEL.red },
          reauthorizeEnabled: true,
          reauthorizedState: {
            status: TRANSFORM_STATE.STOPPED,
            progress: '100',
            health: TRANSFORM_HEALTH_LABEL.green,
          },
        },
        created_by_user: USER.TRANSFORM_VIEWER,
        current_user: USER.TRANSFORM_POWERUSER,
      },
      {
        suiteTitle: 'continuous pivot transform (created by viewer, authorized by poweruser)',
        originalConfig: getPivotTransformConfig(`${PREFIX}-${USER.TRANSFORM_VIEWER}-2`, true),
        mode: 'continuous',
        type: 'pivot',
        expected: {
          originalState: { status: TRANSFORM_STATE.STOPPED, health: TRANSFORM_HEALTH_LABEL.red },
          reauthorizeEnabled: true,
          reauthorizedState: {
            status: TRANSFORM_STATE.STARTED,
            health: TRANSFORM_HEALTH_LABEL.green,
          },
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
          originalState: { status: TRANSFORM_STATE.STARTED, health: TRANSFORM_HEALTH_LABEL.green },
          reauthorizeEnabled: false,
          reauthorizedState: {
            status: TRANSFORM_STATE.STARTED,
            health: TRANSFORM_HEALTH_LABEL.green,
          },
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
      await transform.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');

      for (const testData of testDataList) {
        await transform.api.createTransform(testData.originalConfig.id, testData.originalConfig, {
          deferValidation: true,
          // Create transforms with secondary authorization headers
          headers: generateHeaders(apiKeysForTransformUsers.get(testData.created_by_user)!, '1'),
        });
        // For transforms created with insufficient permissions, they can be created but not started
        // so we should not assert that the api call is successful here
        await transform.api.startTransform(testData.originalConfig.id, false);
      }
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await transform.securityCommon.clearAllTransformApiKeys();

      for (const testData of testDataList) {
        await transform.testResources.deleteDataViewByTitle(testData.originalConfig.dest.index);
        await transform.api.deleteIndices(testData.originalConfig.dest.index);
      }

      await transform.api.cleanTransformIndices();
      await transform.testResources.deleteDataViewByTitle('ft_ecommerce');
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

          await transform.testExecution.logTestStep(
            'should display the transforms reauthorize callout'
          );
          await transform.management.assertTransformsReauthorizeCalloutExists();

          await transform.testExecution.logTestStep(
            'should display the original transform in the transform list'
          );
          await transform.table.filterWithSearchString(transformId, 1);
          await transform.table.assertTransformRowFields(
            transformId,
            testData.expected.originalState
          );

          if (testData.expected.reauthorizeEnabled) {
            await transform.testExecution.logTestStep('should reauthorize the transform');
            await transform.table.assertTransformRowActionEnabled(
              transformId,
              'Reauthorize',
              testData.expected.reauthorizeEnabled
            );
            await transform.table.clickTransformRowAction(transformId, 'Reauthorize');
            await transform.table.confirmReauthorizeTransform();

            await transform.table.assertTransformRowFields(
              transformId,
              testData.expected.reauthorizedState
            );
            await transform.testExecution.logTestStep('should not show Reauthorize action anymore');
            await transform.table.assertTransformRowActionMissing(transformId, 'Reauthorize');
          } else {
            await transform.testExecution.logTestStep('should show disabled action menu button');
            await transform.table.assertTransformRowActionsEnabled(transformId, false);
          }
          await transform.table.clearSearchString(testDataList.length);
        });
      });
    }
  });
}
