/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../cases_api_integration/common/lib/authentication';

import { Role, User } from '../../../cases_api_integration/common/lib/authentication/types';
import {
  createCase,
  deleteAllCaseItems,
  getCase,
} from '../../../cases_api_integration/common/lib/utils';
import { getPostCaseRequest } from '../../../cases_api_integration/common/lib/mock';
import { APP_ID } from '../../../../plugins/security_solution/common/constants';

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

const secNone: Role = {
  name: 'sec_none_role',
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
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const secNoneUser: User = {
  username: 'sec_none_user',
  password: 'password',
  roles: [secNone.name],
};

const roles = [secAll, secRead, secNone];

const users = [secAllUser, secReadUser, secNoneUser];

export default ({ getService }: FtrProviderContext): void => {
  describe('cases feature privilege', () => {
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

    it(`User ${
      secAllUser.username
    } with role(s) ${secAllUser.roles.join()} can create a case`, async () => {
      await createCase(supertestWithoutAuth, getPostCaseRequest({ owner: APP_ID }), 200, {
        user: secAllUser,
        space: null,
      });
    });

    it(`User ${
      secReadUser.username
    } with role(s) ${secReadUser.roles.join()} can get a case`, async () => {
      const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));
      const retrievedCase = await getCase({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        expectedHttpCode: 200,
        auth: { user: secReadUser, space: null },
      });

      expect(caseInfo.owner).to.eql(retrievedCase.owner);
    });

    for (const user of [secReadUser, secNoneUser]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot create a case`, async () => {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner: APP_ID }), 403, {
          user,
          space: null,
        });
      });
    }

    it(`User ${
      secNoneUser.username
    } with role(s) ${secNoneUser.roles.join()} cannot get a case`, async () => {
      const caseInfo = await createCase(supertest, getPostCaseRequest({ owner: APP_ID }));

      await getCase({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        expectedHttpCode: 403,
        auth: { user: secNoneUser, space: null },
      });
    });
  });
};
