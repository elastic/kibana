/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { bulkGetTestSuiteFactory } from '../../common/suites/bulk_get';

// tslint:disable:no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const {
    bulkGetTest,
    createExpectLegacyForbidden,
    createExpectResults,
    expectRbacForbidden,
  } = bulkGetTestSuiteFactory(esArchiver, supertest);

  describe('_bulk_get', () => {
    bulkGetTest(`user with no access`, {
      user: AUTHENTICATION.NOT_A_KIBANA_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
      },
    });

    bulkGetTest(`superuser`, {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
      },
    });

    bulkGetTest(`legacy user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
      },
    });

    bulkGetTest(`legacy reeadonly user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
      },
    });

    bulkGetTest(`dual-privileges user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
      },
    });

    bulkGetTest(`dual-privileges readonly user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
      },
    });

    bulkGetTest(`rbac user with all globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
      },
    });

    bulkGetTest(`rbac user with read globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
      },
    });

    bulkGetTest(`rbac user with all at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    bulkGetTest(`rbac user with read at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    bulkGetTest(`rbac user with all at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    bulkGetTest(`rbac user with read at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });
  });
}
