/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createTestSuiteFactory } from '../../common/suites/create';

export default function({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('legacyEs');
  const esArchiver = getService('esArchiver');

  const {
    createTest,
    createExpectSpaceAwareResults,
    expectNotSpaceAwareResults,
    expectNotSpaceAwareRbacForbidden,
    expectSpaceAwareRbacForbidden,
    expectBadRequestForHiddenType,
    expectHiddenTypeRbacForbidden,
  } = createTestSuiteFactory(es, esArchiver, supertestWithoutAuth);

  describe('create', () => {
    createTest(`user with no access`, {
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
      },
    });

    createTest(`superuser`, {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 400,
          response: expectBadRequestForHiddenType,
        },
      },
    });

    createTest(`legacy user`, {
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
      },
    });

    createTest(`dual-privileges user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
      },
    });

    createTest(`dual-privileges readonly user`, {
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
      },
    });

    createTest(`rbac user with all globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: createExpectSpaceAwareResults(),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        hiddenType: {
          statusCode: 403,
          response: expectHiddenTypeRbacForbidden,
        },
      },
    });

    createTest(`rbac user with read globally`, {
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
      },
    });

    createTest(`rbac user with all at default space`, {
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
      },
    });

    createTest(`rbac user with read at default space`, {
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
      },
    });

    createTest(`rbac user with all at space_1`, {
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
      },
    });

    createTest(`rbac user with read at space_1`, {
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
      },
    });
  });
}
