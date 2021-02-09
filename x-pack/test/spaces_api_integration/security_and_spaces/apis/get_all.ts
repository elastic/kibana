/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { SPACES } from '../../common/lib/spaces';
import { TestInvoker } from '../../common/lib/types';
import { getAllTestSuiteFactory } from '../../common/suites/get_all';

// eslint-disable-next-line import/no-default-export
export default function getAllSpacesTestSuite({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    getAllTest,
    createExpectResults,
    createExpectAllPurposesResults,
    expectRbacForbidden,
  } = getAllTestSuiteFactory(esArchiver, supertestWithoutAuth);

  // these are used to determine expected results for tests where the `include_authorized_purposes` option is enabled
  const authorizedAll = {
    any: true,
    copySavedObjectsIntoSpace: true,
    findSavedObjects: true,
    shareSavedObjectsIntoSpace: true,
  };
  const authorizedRead = {
    any: true,
    copySavedObjectsIntoSpace: false,
    findSavedObjects: true,
    shareSavedObjectsIntoSpace: false,
  };

  describe('get all', () => {
    /* eslint-disable @typescript-eslint/naming-convention */
    [
      {
        spaceId: SPACES.DEFAULT.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          allAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          readAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
          readSavedObjectsAtDefaultSpace:
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_READ_USER,
          allSavedObjectsAtDefaultSpace:
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_ALL_USER,
          readSavedObjectsAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_READ_USER,
          allSavedObjectsAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
          apmUser: AUTHENTICATION.APM_USER,
          machineLearningAdmin: AUTHENTICATION.MACHINE_LEARING_ADMIN,
          machineLearningUser: AUTHENTICATION.MACHINE_LEARNING_USER,
          monitoringUser: AUTHENTICATION.MONITORING_USER,
        },
      },
      {
        spaceId: SPACES.SPACE_1.spaceId,
        users: {
          noAccess: AUTHENTICATION.NOT_A_KIBANA_USER,
          superuser: AUTHENTICATION.SUPERUSER,
          allGlobally: AUTHENTICATION.KIBANA_RBAC_USER,
          readGlobally: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
          allAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
          readAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
          allAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          readAtDefaultSpace: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
          readSavedObjectsAtDefaultSpace:
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_READ_USER,
          allSavedObjectsAtDefaultSpace:
            AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_ALL_USER,
          readSavedObjectsAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_READ_USER,
          allSavedObjectsAtSpace_1: AUTHENTICATION.KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_ALL_USER,
          legacyAll: AUTHENTICATION.KIBANA_LEGACY_USER,
          dualAll: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
          dualRead: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
          apmUser: AUTHENTICATION.APM_USER,
          machineLearningAdmin: AUTHENTICATION.MACHINE_LEARING_ADMIN,
          machineLearningUser: AUTHENTICATION.MACHINE_LEARNING_USER,
          monitoringUser: AUTHENTICATION.MONITORING_USER,
        },
      },
      /* eslint-enable @typescript-eslint/naming-convention */
    ].forEach((scenario) => {
      getAllTest(`user with no access can't access any spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.noAccess,
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

      getAllTest(`superuser can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.superuser,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          copySavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          shareSavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(
              authorizedAll,
              'default',
              'space_1',
              'space_2'
            ),
          },
        },
      });

      getAllTest(`rbac user with all globally can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allGlobally,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          copySavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          shareSavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(
              authorizedAll,
              'default',
              'space_1',
              'space_2'
            ),
          },
        },
      });

      getAllTest(`dual-privileges user can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualAll,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          copySavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          shareSavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
          },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(
              authorizedAll,
              'default',
              'space_1',
              'space_2'
            ),
          },
        },
      });

      getAllTest(`legacy user can't access any spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.legacyAll,
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

      getAllTest(`rbac user with read globally can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readGlobally,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
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
            statusCode: 200,
            response: createExpectAllPurposesResults(
              authorizedRead,
              'default',
              'space_1',
              'space_2'
            ),
          },
        },
      });

      getAllTest(`dual-privileges readonly user can access all spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.dualRead,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('default', 'space_1', 'space_2'),
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
            statusCode: 200,
            response: createExpectAllPurposesResults(
              authorizedRead,
              'default',
              'space_1',
              'space_2'
            ),
          },
        },
      });

      getAllTest(`rbac user with all at space_1 can access space_1 from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.allAtSpace_1,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('space_1'),
          },
          copySavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('space_1'),
          },
          shareSavedObjectsPurpose: {
            statusCode: 200,
            response: createExpectResults('space_1'),
          },
          includeAuthorizedPurposes: {
            statusCode: 200,
            response: createExpectAllPurposesResults(authorizedAll, 'space_1'),
          },
        },
      });

      getAllTest(`rbac user with read at space_1 can access space_1 from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.readAtSpace_1,
        tests: {
          exists: {
            statusCode: 200,
            response: createExpectResults('space_1'),
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
            statusCode: 200,
            response: createExpectAllPurposesResults(authorizedRead, 'space_1'),
          },
        },
      });

      getAllTest(
        `rbac user with all at default space can access default from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.allAtDefaultSpace,
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default'),
            },
            copySavedObjectsPurpose: {
              statusCode: 200,
              response: createExpectResults('default'),
            },
            shareSavedObjectsPurpose: {
              statusCode: 200,
              response: createExpectResults('default'),
            },
            includeAuthorizedPurposes: {
              statusCode: 200,
              response: createExpectAllPurposesResults(authorizedAll, 'default'),
            },
          },
        }
      );

      getAllTest(
        `rbac user with read at default space can access default from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.readAtDefaultSpace,
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default'),
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
              statusCode: 200,
              response: createExpectAllPurposesResults(authorizedRead, 'default'),
            },
          },
        }
      );

      getAllTest(
        `rbac user with saved objects management all at default space can access default from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.allSavedObjectsAtDefaultSpace,
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default'),
            },
            copySavedObjectsPurpose: {
              statusCode: 200,
              response: createExpectResults('default'),
            },
            shareSavedObjectsPurpose: {
              statusCode: 200,
              response: createExpectResults('default'),
            },
            includeAuthorizedPurposes: {
              statusCode: 200,
              response: createExpectAllPurposesResults(authorizedAll, 'default'),
            },
          },
        }
      );

      getAllTest(
        `rbac user with saved objects management read at default space can access default from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.readSavedObjectsAtDefaultSpace,
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('default'),
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
              statusCode: 200,
              response: createExpectAllPurposesResults(authorizedRead, 'default'),
            },
          },
        }
      );

      getAllTest(
        `rbac user with saved objects management all at space_1 space can access space_1 from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.allSavedObjectsAtSpace_1,
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('space_1'),
            },
            copySavedObjectsPurpose: {
              statusCode: 200,
              response: createExpectResults('space_1'),
            },
            shareSavedObjectsPurpose: {
              statusCode: 200,
              response: createExpectResults('space_1'),
            },
            includeAuthorizedPurposes: {
              statusCode: 200,
              response: createExpectAllPurposesResults(authorizedAll, 'space_1'),
            },
          },
        }
      );

      getAllTest(
        `rbac user with saved objects management read at space_1 space can access space_1 from ${scenario.spaceId}`,
        {
          spaceId: scenario.spaceId,
          user: scenario.users.readSavedObjectsAtSpace_1,
          tests: {
            exists: {
              statusCode: 200,
              response: createExpectResults('space_1'),
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
              statusCode: 200,
              response: createExpectAllPurposesResults(authorizedRead, 'space_1'),
            },
          },
        }
      );

      getAllTest(`apm_user can't access any spaces from ${scenario.spaceId}`, {
        spaceId: scenario.spaceId,
        user: scenario.users.apmUser,
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
