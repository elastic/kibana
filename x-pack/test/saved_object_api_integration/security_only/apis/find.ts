/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AUTHENTICATION } from '../../common/lib/authentication';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { findTestSuiteFactory } from '../../common/suites/find';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('find', () => {
    const {
      createExpectEmpty,
      createExpectRbacForbidden,
      createExpectVisualizationResults,
      expectFilterWrongTypeError,
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
          response: createExpectRbacForbidden('visualization'),
        },
        notSpaceAwareType: {
          description: 'forbidden login and find globaltype message',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        hiddenType: {
          description: 'forbidden login and find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'forbidden login and unknown search field',
          statusCode: 403,
          response: createExpectRbacForbidden('url'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'forbidden login and find globaltype message',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        filterWithHiddenType: {
          description: 'forbidden login and find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'forbidden',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
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
        hiddenType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
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
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        filterWithHiddenType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        filterWithUnknownType: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'Bad Request',
          statusCode: 400,
          response: expectFilterWrongTypeError,
        },
      },
    });

    findTest(`legacy user`, {
      user: AUTHENTICATION.KIBANA_LEGACY_USER,
      tests: {
        spaceAwareType: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        notSpaceAwareType: {
          description: 'forbidden login and find globaltype message',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        hiddenType: {
          description: 'forbidden login and find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'forbidden login and find visualization message',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'forbidden login and unknown search field',
          statusCode: 403,
          response: createExpectRbacForbidden('url'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'forbidden login and find globaltype message',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        filterWithHiddenType: {
          description: 'forbidden login and find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'forbidden',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
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
        hiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
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
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        filterWithHiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'Bad Request',
          statusCode: 400,
          response: expectFilterWrongTypeError,
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
        hiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
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
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        filterWithHiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'Bad Request',
          statusCode: 400,
          response: expectFilterWrongTypeError,
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
        hiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
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
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        filterWithHiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'Bad Request',
          statusCode: 400,
          response: expectFilterWrongTypeError,
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
        hiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
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
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 200,
          response: expectNotSpaceAwareResults,
        },
        filterWithHiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'Bad Request',
          statusCode: 400,
          response: expectFilterWrongTypeError,
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
        hiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'forbidden login and unknown search field',
          statusCode: 403,
          response: createExpectRbacForbidden('url'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        filterWithHiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'forbidden',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
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
        hiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'forbidden login and unknown search field',
          statusCode: 403,
          response: createExpectRbacForbidden('url'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        filterWithHiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'forbidden',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
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
        hiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'forbidden login and unknown search field',
          statusCode: 403,
          response: createExpectRbacForbidden('url'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        filterWithHiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'forbidden',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
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
        hiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        unknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 403,
          response: createExpectRbacForbidden('visualization'),
        },
        unknownSearchField: {
          description: 'forbidden login and unknown search field',
          statusCode: 403,
          response: createExpectRbacForbidden('url'),
        },
        noType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithNotSpaceAwareType: {
          description: 'only the globaltype',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
        filterWithHiddenType: {
          description: 'forbidden find hiddentype message',
          statusCode: 403,
          response: createExpectRbacForbidden('hiddentype'),
        },
        filterWithUnknownType: {
          description: 'forbidden find wigwags message',
          statusCode: 403,
          response: createExpectRbacForbidden('wigwags'),
        },
        filterWithNoType: {
          description: 'bad request, type is required',
          statusCode: 400,
          response: expectTypeRequired,
        },
        filterWithUnAllowedType: {
          description: 'forbidden',
          statusCode: 403,
          response: createExpectRbacForbidden('globaltype'),
        },
      },
    });
  });
}
