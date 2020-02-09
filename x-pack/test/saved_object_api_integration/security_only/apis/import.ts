/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { importTestSuiteFactory } from '../../common/suites/import';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const {
    importTest,
    createExpectResults,
    expectRbacForbidden,
    expectUnknownTypeUnsupported,
    expectResultsWithUnsupportedHiddenType,
  } = importTestSuiteFactory(es, esArchiver, supertest);

  describe('_import', () => {
    importTest(`user with no access`, {
      user: AUTHENTICATION.NOT_A_KIBANA_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    importTest(`superuser`, {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        hiddenType: {
          // import filters out the space type, so the remaining objects will import successfully
          statusCode: 200,
          response: expectResultsWithUnsupportedHiddenType,
        },
        unknownType: {
          statusCode: 200,
          response: expectUnknownTypeUnsupported,
        },
      },
    });

    importTest(`legacy user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    importTest(`dual-privileges user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        hiddenType: {
          // import filters out the space type, so the remaining objects will import successfully
          statusCode: 200,
          response: expectResultsWithUnsupportedHiddenType,
        },
        unknownType: {
          statusCode: 200,
          response: expectUnknownTypeUnsupported,
        },
      },
    });

    importTest(`dual-privileges readonly user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    importTest(`rbac user with all globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        hiddenType: {
          // import filters out the space type, so the remaining objects will import successfully
          statusCode: 200,
          response: expectResultsWithUnsupportedHiddenType,
        },
        unknownType: {
          statusCode: 200,
          response: expectUnknownTypeUnsupported,
        },
      },
    });

    importTest(`rbac readonly user`, {
      user: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    importTest(`rbac user with all at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    importTest(`rbac user with read at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    importTest(`rbac user with all at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    importTest(`rbac user with read at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        hiddenType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });
  });
}
