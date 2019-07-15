/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { bulkCreateTestSuiteFactory } from '../../common/suites/bulk_create';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const {
    bulkCreateTest,
    createExpectResults,
    createExpectRbacForbidden,
    expectBadRequestForSpace,
    expectedForbiddenTypesWithSpace,
  } = bulkCreateTestSuiteFactory(es, esArchiver, supertest);

  describe('_bulk_create', () => {
    bulkCreateTest(`user with no access`, {
      user: AUTHENTICATION.NOT_A_KIBANA_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(expectedForbiddenTypesWithSpace),
        },
      },
    });

    bulkCreateTest(`superuser`, {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        includingSpace: {
          statusCode: 200,
          response: expectBadRequestForSpace,
        },
      },
    });

    bulkCreateTest(`legacy user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(expectedForbiddenTypesWithSpace),
        },
      },
    });

    bulkCreateTest(`dual-privileges user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(['space']),
        },
      },
    });

    bulkCreateTest(`dual-privileges readonly user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(expectedForbiddenTypesWithSpace),
        },
      },
    });

    bulkCreateTest(`rbac user with all globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        default: {
          statusCode: 200,
          response: createExpectResults(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(['space']),
        },
      },
    });

    bulkCreateTest(`rbac readonly user`, {
      user: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(expectedForbiddenTypesWithSpace),
        },
      },
    });

    bulkCreateTest(`rbac user with all at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(expectedForbiddenTypesWithSpace),
        },
      },
    });

    bulkCreateTest(`rbac user with read at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(expectedForbiddenTypesWithSpace),
        },
      },
    });

    bulkCreateTest(`rbac user with all at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(expectedForbiddenTypesWithSpace),
        },
      },
    });

    bulkCreateTest(`rbac user with read at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
      tests: {
        default: {
          statusCode: 403,
          response: createExpectRbacForbidden(),
        },
        includingSpace: {
          statusCode: 403,
          response: createExpectRbacForbidden(expectedForbiddenTypesWithSpace),
        },
      },
    });
  });
}
