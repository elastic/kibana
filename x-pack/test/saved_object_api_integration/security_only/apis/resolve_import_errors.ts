/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { resolveImportErrorsTestSuiteFactory } from '../../common/suites/resolve_import_errors';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const {
    resolveImportErrorsTest,
    createExpectResults,
    expectRbacForbidden,
    expectUnknownType,
  } = resolveImportErrorsTestSuiteFactory(es, esArchiver, supertest);

  describe('_resolve_import_errors', () => {
    resolveImportErrorsTest(`user with no access`, {
      user: AUTHENTICATION.NOT_A_KIBANA_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    resolveImportErrorsTest(`superuser`, {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        unknownType: {
          statusCode: 200,
          response: expectUnknownType,
        },
      },
    });

    resolveImportErrorsTest(`legacy user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    resolveImportErrorsTest(`dual-privileges user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        unknownType: {
          statusCode: 200,
          response: expectUnknownType,
        },
      },
    });

    resolveImportErrorsTest(`dual-privileges readonly user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    resolveImportErrorsTest(`rbac user with all globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        unknownType: {
          statusCode: 200,
          response: expectUnknownType,
        },
      },
    });

    resolveImportErrorsTest(`rbac readonly user`, {
      user: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    resolveImportErrorsTest(`rbac user with all at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    resolveImportErrorsTest(`rbac user with read at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    resolveImportErrorsTest(`rbac user with all at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
      tests: {
        default: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
        unknownType: {
          statusCode: 403,
          response: expectRbacForbidden,
        },
      },
    });

    resolveImportErrorsTest(`rbac user with read at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
      tests: {
        default: {
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
