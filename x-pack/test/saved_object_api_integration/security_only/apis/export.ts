/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { exportTestSuiteFactory } from '../../common/suites/export';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('export', () => {
    const {
      createExpectRbacForbidden,
      expectTypeOrObjectsRequired,
      createExpectVisualizationResults,
      exportTest,
    } = exportTestSuiteFactory(esArchiver, supertest);

    exportTest('user with no access', {
      user: AUTHENTICATION.NOT_A_KIBANA_USER,
      tests: {
        spaceAwareType: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('superuser', {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('legacy user', {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        spaceAwareType: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('dual-privileges user', {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('dual-privileges readonly user', {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('rbac user with all globally', {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('rbac user with read globally', {
      user: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('rbac user with all at default space', {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('rbac user with read at default space', {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('rbac user with all at space_1', {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });

    exportTest('rbac user with read at space_1', {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        noTypeOrObjects: {
          description: 'bad request, type or object is required',
          statusCode: 400,
          response: expectTypeOrObjectsRequired,
        },
      },
    });
  });
}
