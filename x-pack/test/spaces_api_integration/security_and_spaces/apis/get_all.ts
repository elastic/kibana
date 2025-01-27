/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../common/ftr_provider_context';
import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { getAllTestSuiteFactory } from '../../common/suites/get_all.agnostic';

// eslint-disable-next-line import/no-default-export
export default function getAllSpacesTestSuite(context: FtrProviderContext) {
  // @ts-expect-error getAllTestSuiteFactory expects only DeploymentAgnosticFtrProviderContext
  const { getAllTest, expectRbacForbidden } = getAllTestSuiteFactory(context);

  describe('get all', function () {
    this.tags('skipFIPS');
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          machineLearningAdmin: AUTHENTICATION.MACHINE_LEARING_ADMIN,
          machineLearningUser: AUTHENTICATION.MACHINE_LEARNING_USER,
          monitoringUser: AUTHENTICATION.MONITORING_USER,
        },
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        users: {
          machineLearningAdmin: AUTHENTICATION.MACHINE_LEARING_ADMIN,
          machineLearningUser: AUTHENTICATION.MACHINE_LEARNING_USER,
          monitoringUser: AUTHENTICATION.MONITORING_USER,
        },
      },
    ].forEach((scenario) => {
      getAllTest(`machine_learning_admin can't access any spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.machineLearningAdmin,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          copySavedObjectsPurpose: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          shareSavedObjectsPurpose: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          includeAuthorizedPurposes: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      getAllTest(`machine_learning_user can't access any spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.machineLearningUser,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          copySavedObjectsPurpose: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          shareSavedObjectsPurpose: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          includeAuthorizedPurposes: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });

      getAllTest(`monitoring_user can't access any spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.monitoringUser,
        tests: {
          exists: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          copySavedObjectsPurpose: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          shareSavedObjectsPurpose: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
          includeAuthorizedPurposes: {
            statusCode: 403,
            response: expectRbacForbidden,
          },
        },
      });
    });
  });
}
