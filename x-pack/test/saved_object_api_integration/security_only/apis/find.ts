/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { TestInvoker } from '../../common/lib/types';
import { findTestSuiteFactory } from '../../common/suites/find';

// tslint:disable:no-default-export
export default function({ getService }: TestInvoker) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('find', () => {
    const {
      createExpectEmpty,
      createExpectRbacForbidden,
      createExpectLegacyForbidden,
      createExpectVisualizationResults,
      expectNotSpaceAwareResults,
      expectTypeRequired,
      findTest,
    } = findTestSuiteFactory(esArchiver, supertest);

    findTest(`user with no access`, {
      user: AUTHENTICATION.NOT_A_KIBANA_USER,
      tests: {
        spaceAwareType: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
        notSpaceAwareType: {
          description: 'forbidden legacy message',
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
        unknownType: {
          description: 'forbidden login and find wigwags message',
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
        pageBeyondTotal: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
        unknownSearchField: {
          description: 'forbidden login and find wigwags message',
          statusCode: 403,
          response: createExpectLegacyForbidden(AUTHENTICATION.NOT_A_KIBANA_USER.username),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`superuser`, {
      user: AUTHENTICATION.SUPERUSER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`legacy user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`legacy readonly user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`dual-privileges user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`dual-privileges readonly user`, {
      user: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`rbac user with all globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`rbac user with read globally`, {
      user: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 200,
          response: createExpectVisualizationResults(),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`rbac user with all at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        unknownType: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`rbac user with read at default space`, {
      user: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        unknownType: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`rbac user with all at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        unknownType: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });

    findTest(`rbac user with read at space_1`, {
      user: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER,
      tests: {
        spaceAwareType: {
          description: 'only the visualization',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        notSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        unknownType: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
      },
    });
  });
}
