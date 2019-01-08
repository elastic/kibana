/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { findRelationshipsTestSuiteFactory } from '../../common/suites/find_relationships';

// tslint:disable:no-default-export
export default function({ getService }: TestInvoker) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    createExpectDoesntExistNotFound,
    createExpectLegacyForbidden,
    createExpectSpaceAwareResults,
    createExpectNotSpaceAwareResults,
    expectSpaceAwareRbacForbidden,
    expectNotSpaceAwareRbacForbidden,
    expectDoesntExistRbacForbidden,
    findRelationshipsTest,
  } = findRelationshipsTestSuiteFactory(esArchiver, supertestWithoutAuth);

  describe('find_relationships', () => {
    findRelationshipsTest('user with no access', {
      user: AUTHENTICATION.NOT_A_KIBANA_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
        notSpaceAware: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
        doesntExist: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
      },
    });

    findRelationshipsTest('superuser', {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    findRelationshipsTest('legacy user', {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    findRelationshipsTest('legacy readonly user', {
      user: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    findRelationshipsTest(`dual-privileges user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    findRelationshipsTest(`dual-privileges readonly user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    findRelationshipsTest(`rbac user with all globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    findRelationshipsTest(`rbac user with read globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: createExpectNotSpaceAwareResults(),
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    findRelationshipsTest(`rbac user with all at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    findRelationshipsTest(`rbac user with read at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    findRelationshipsTest(`rbac user with all at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    findRelationshipsTest(`rbac user with read at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });
  });
}
