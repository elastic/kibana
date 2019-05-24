/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SecurityService, SpacesService } from '../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function featureControlsTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertestWithoutAuth');
  const security: SecurityService = getService('security');
  const spaces: SpacesService = getService('spaces');
  const log = getService('log');

  const expect404 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 404);
  };

  const expect200 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 200);
  };

  const endpoints = [
    {
      // List all repositories.
      url: `/api/code/repos`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      // Get one repository.
      url: `/api/code/repo/github.com/elastic/code-examples_empty-file`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      // Get the status of one repository.
      url: `/api/code/repo/status/github.com/elastic/code-examples_empty-file`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      // Get all language server installation status.
      url: `/api/code/install`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    // Search and suggestion APIs.
    {
      url: `/api/code/search/repo?q=starter`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/code/suggestions/repo?q=starter`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/code/search/doc?q=starter`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/code/suggestions/doc?q=starter`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/code/search/symbol?q=starter`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/code/suggestions/symbol?q=starter`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
  ];

  async function executeRequest(
    endpoint: string,
    username: string,
    password: string,
    spaceId?: string
  ) {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    return await supertest
      .get(`${basePath}${endpoint}`)
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  }

  async function executeRequests(
    username: string,
    password: string,
    spaceId: string,
    expectation: 'forbidden' | 'response'
  ) {
    for (const endpoint of endpoints) {
      log.debug(`hitting ${endpoint}`);
      const result = await executeRequest(endpoint.url, username, password, spaceId);
      if (expectation === 'forbidden') {
        endpoint.expectForbidden(result);
      } else {
        endpoint.expectResponse(result);
      }
    }
  }

  describe('feature controls', () => {
    const kibanaUsername = 'kibana_user';
    const kibanaUserRoleName = 'kibana_user';

    const kibanaUserPassword = `${kibanaUsername}-password`;

    before(async () => {
      // Import a repository first
      await security.user.create(kibanaUsername, {
        password: kibanaUserPassword,
        roles: [kibanaUserRoleName],
        full_name: 'a kibana user',
      });

      await supertest
        .post(`/api/code/repo`)
        .auth(kibanaUsername, kibanaUserPassword)
        .set('kbn-xsrf', 'foo')
        .send({ url: 'https://github.com/elastic/code-examples_empty-file.git' })
        .expect(200);
    });

    after(async () => {
      // Delete the repository
      await supertest
        .delete(`/api/code/repo/github.com/elastic/code-examples_empty-file`)
        .auth(kibanaUsername, kibanaUserPassword)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      await security.user.delete(kibanaUsername);
    });

    it(`Non admin Code user cannot execute delete without all permission`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                // Grant read only permission to Code app as an non-admin user.
                code: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await supertest
          .delete(`/api/code/repo/github.com/elastic/code-examples_empty-file`)
          .auth(username, password)
          .set('kbn-xsrf', 'foo')
          .expect(404);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it(`Admin Code user can execute clone/delete with all permission`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                // Grant all permission to Code app as an admin user.
                code: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        // Clone repository
        await supertest
          .post(`/api/code/repo`)
          .auth(username, password)
          .set('kbn-xsrf', 'foo')
          .send({ url: 'https://github.com/elastic/code-examples_single-image.git' })
          .expect(200);

        // Delete repository
        await supertest
          .delete(`/api/code/repo/github.com/elastic/code-examples_single-image`)
          .auth(username, password)
          .set('kbn-xsrf', 'foo')
          .expect(200);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it(`APIs can't be accessed by .code-* read privileges role`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {});

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests(username, password, '', 'forbidden');
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it(`APIs can be accessed global all with .code-* read privileges role`, async () => {
      const username = 'global_all';
      const roleName = 'global_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              base: ['all'],
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests(username, password, '', 'response');
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it(`APIs can't be accessed by dashboard all with .code-* read privileges role`, async () => {
      const username = 'dashboard_all';
      const roleName = 'dashboard_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests(username, password, '', 'forbidden');
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    describe('spaces', () => {
      // the following tests create a user_1 which has Code read access to space_1 and dashboard all access to space_2
      const space1Id = 'space_1';
      const space2Id = 'space_2';

      const roleName = 'user_1';
      const username = 'user_1';
      const password = 'user_1-password';

      before(async () => {
        await spaces.create({
          id: space1Id,
          name: space1Id,
          disabledFeatures: [],
        });
        await spaces.create({
          id: space2Id,
          name: space2Id,
          disabledFeatures: [],
        });
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                code: ['read'],
              },
              spaces: [space1Id],
            },
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: [space2Id],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
        });
      });

      after(async () => {
        await spaces.delete(space1Id);
        await spaces.delete(space2Id);
        await security.role.delete(roleName);
        await security.user.delete(username);
      });

      it('user_1 can access APIs in space_1', async () => {
        await executeRequests(username, password, space1Id, 'response');
      });

      it(`user_1 cannot access APIs in space_2`, async () => {
        await executeRequests(username, password, space2Id, 'forbidden');
      });
    });
  });
}
