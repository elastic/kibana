/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { APP_ID } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../cases_api_integration/common/lib/authentication';

import { Role, User } from '../../../cases_api_integration/common/lib/authentication/types';
import {
  createCase,
  deleteAllCaseItems,
  deleteCases,
  getCase,
} from '../../../cases_api_integration/common/lib/utils';
import { getPostCaseRequest } from '../../../cases_api_integration/common/lib/mock';

const secAllCasesOnlyDelete: Role = {
  name: 'sec_all_cases_only_delete',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
          securitySolutionCases: ['cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secAllCasesOnlyDeleteUser: User = {
  username: 'sec_all_cases_only_delete_user',
  password: 'password',
  roles: [secAllCasesOnlyDelete.name],
};

const secAllCasesNoDelete: Role = {
  name: 'sec_all_cases_no_delete',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
          securitySolutionCases: ['minimal_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secAllCasesNoDeleteUser: User = {
  username: 'sec_all_cases_no_delete_user',
  password: 'password',
  roles: [secAllCasesNoDelete.name],
};

const secAll: Role = {
  name: 'sec_all_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
          securitySolutionCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secAllUser: User = {
  username: 'sec_all_user',
  password: 'password',
  roles: [secAll.name],
};

const secAllCasesRead: Role = {
  name: 'sec_all_cases_read_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
          securitySolutionCases: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secAllCasesReadUser: User = {
  username: 'sec_all_cases_read_user',
  password: 'password',
  roles: [secAllCasesRead.name],
};

const secAllCasesNone: Role = {
  name: 'sec_all_cases_none_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secAllCasesNoneUser: User = {
  username: 'sec_all_cases_none_user',
  password: 'password',
  roles: [secAllCasesNone.name],
};

const secReadCasesAll: Role = {
  name: 'sec_read_cases_all_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
          securitySolutionCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secReadCasesAllUser: User = {
  username: 'sec_read_cases_all_user',
  password: 'password',
  roles: [secReadCasesAll.name],
};

const secReadCasesRead: Role = {
  name: 'sec_read_cases_read_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
          securitySolutionCases: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secReadCasesReadUser: User = {
  username: 'sec_read_cases_read_user',
  password: 'password',
  roles: [secReadCasesRead.name],
};

const secRead: Role = {
  name: 'sec_read_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
          securitySolutionCases: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secReadUser: User = {
  username: 'sec_read_user',
  password: 'password',
  roles: [secRead.name],
};

const secReadCasesNone: Role = {
  name: 'sec_read_cases_none_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secReadCasesNoneUser: User = {
  username: 'sec_read_cases_none_user',
  password: 'password',
  roles: [secReadCasesNone.name],
};

const roles = [
  secAll,
  secAllCasesRead,
  secAllCasesNone,
  secAllCasesOnlyDelete,
  secAllCasesNoDelete,
  secReadCasesAll,
  secReadCasesRead,
  secRead,
  secReadCasesNone,
];

const users = [
  secAllUser,
  secAllCasesReadUser,
  secAllCasesNoneUser,
  secAllCasesOnlyDeleteUser,
  secAllCasesNoDeleteUser,
  secReadCasesAllUser,
  secReadCasesReadUser,
  secReadUser,
  secReadCasesNoneUser,
];

export default ({ getService }: FtrProviderContext): void => {
  describe('security solution cases sub feature privilege', () => {
    const es = getService('es');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const supertest = getService('supertest');

    before(async () => {
      await createUsersAndRoles(getService, users, roles);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, users, roles);
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const user of [secAllUser, secReadCasesAllUser, secAllCasesNoDeleteUser]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can create a case`, async () => {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner: APP_ID }), 200, {
          user,
          space: null,
        });
      });
    }

    for (const user of [
      secAllCasesReadUser,
      secReadCasesAllUser,
      secReadCasesReadUser,
      secReadUser,
      secAllCasesNoDeleteUser,
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can get a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));
        const retrievedCase = await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        expect(caseInfo.owner).to.eql(retrievedCase.owner);
      });
    }

    for (const user of [
      secAllCasesReadUser,
      secAllCasesNoneUser,
      secReadCasesReadUser,
      secReadUser,
      secReadCasesNoneUser,
      secAllCasesOnlyDeleteUser,
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot create a case`, async () => {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner: APP_ID }), 403, {
          user,
          space: null,
        });
      });
    }

    for (const user of [secAllCasesNoneUser, secReadCasesNoneUser, secAllCasesOnlyDeleteUser]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} cannot get a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));

        await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }

    for (const user of [secAllUser, secAllCasesOnlyDeleteUser]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can delete a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));
        await deleteCases({
          caseIDs: [caseInfo.id],
          supertest: supertestWithoutAuth,
          expectedHttpCode: 204,
          auth: { user, space: null },
        });
      });
    }

    for (const user of [secAllCasesReadUser, secAllCasesNoDeleteUser]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot delete a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));
        await deleteCases({
          caseIDs: [caseInfo.id],
          supertest: supertestWithoutAuth,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }
  });
};
