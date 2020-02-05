/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { updateTestSuiteFactory } from '../../common/suites/update';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('update', () => {
    const {
      createExpectDoesntExistNotFound,
      expectDoesntExistRbacForbidden,
      expectNotSpaceAwareResults,
      expectNotSpaceAwareRbacForbidden,
      expectSpaceAwareRbacForbidden,
      expectSpaceAwareResults,
      expectSpaceNotFound,
      expectHiddenTypeRbacForbidden,
      updateTest,
    } = updateTestSuiteFactory(esArchiver, supertest);

    updateTest(`user with no access`, {
      user: AUTHENTICATION.NOT_A_KIBANA_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`superuser`, {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 404,
          response: expectSpaceNotFound,
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    updateTest(`legacy user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`dual-privileges user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    updateTest(`dual-privileges readonly user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`rbac user with all globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 404,
          response: createExpectDoesntExistNotFound(),
        },
      },
    });

    updateTest(`rbac user with read globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
      tests: {
        spaceAware: {
          statusCode: 403,
          response: expectSpaceAwareRbacForbidden,
        },
        notSpaceAware: {
          statusCode: 403,
          response: expectNotSpaceAwareRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`rbac user with all at default space`, {
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
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`rbac user with read at default space`, {
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
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`rbac user with all at space_1`, {
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
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });

    updateTest(`rbac user with read at space_1`, {
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
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
        doesntExist: {
          statusCode: 403,
          response: expectDoesntExistRbacForbidden,
        },
      },
    });
  });
}
