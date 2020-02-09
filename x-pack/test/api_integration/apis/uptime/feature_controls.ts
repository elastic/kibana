/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { docCountQueryString } from '../../../../legacy/plugins/uptime/public/queries';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PINGS_DATE_RANGE_END, PINGS_DATE_RANGE_START } from './constants';

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');
  const spaces = getService('spaces');

  const expect404 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 404);
  };

  const expectResponse = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 200);
  };

  const executeGraphQLQuery = async (username: string, password: string, spaceId?: string) => {
    const basePath = spaceId ? `/s/${spaceId}` : '';
    const getDocCountQuery = {
      operationName: null,
      query: docCountQueryString,
      variables: {
        dateRangeStart: '2019-01-28T17:40:08.078Z',
        dateRangeEnd: '2019-01-28T19:00:16.078Z',
      },
    };

    return await supertest
      .post(`${basePath}/api/uptime/graphql`)
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .send({ ...getDocCountQuery })
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  };

  const executePingsRequest = async (username: string, password: string, spaceId?: string) => {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    return await supertest
      .get(
        `${basePath}/api/uptime/pings?sort=desc&dateRangeStart=${PINGS_DATE_RANGE_START}&dateRangeEnd=${PINGS_DATE_RANGE_END}`
      )
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  };

  describe('feature controls', () => {
    it(`APIs can't be accessed by heartbeat-* read privileges role`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['heartbeat-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        const graphQLResult = await executeGraphQLQuery(username, password);
        expect404(graphQLResult);

        const pingsResult = await executePingsRequest(username, password);
        expect404(pingsResult);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it('APIs can be accessed global all with heartbeat-* read privileges role', async () => {
      const username = 'global_all';
      const roleName = 'global_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['heartbeat-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
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

        const graphQLResult = await executeGraphQLQuery(username, password);
        expectResponse(graphQLResult);

        const pingsResult = await executePingsRequest(username, password);
        expectResponse(pingsResult);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    // this could be any role which doesn't have access to the uptime feature
    it(`APIs can't be accessed by dashboard all with heartbeat-* read privileges role`, async () => {
      const username = 'dashboard_all';
      const roleName = 'dashboard_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['heartbeat-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
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

        const graphQLResult = await executeGraphQLQuery(username, password);
        expect404(graphQLResult);

        const pingsResult = await executePingsRequest(username, password);
        expect404(pingsResult);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    describe('spaces', () => {
      // the following tests create a user_1 which has uptime read access to space_1 and dashboard all access to space_2
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
          elasticsearch: {
            indices: [
              {
                names: ['heartbeat-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                uptime: ['read'],
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
        const graphQLResult = await executeGraphQLQuery(username, password, space1Id);
        expectResponse(graphQLResult);

        const pingsResult = await executePingsRequest(username, password, space1Id);
        expectResponse(pingsResult);
      });

      it(`user_1 can't access APIs in space_2`, async () => {
        const graphQLResult = await executeGraphQLQuery(username, password);
        expect404(graphQLResult);

        const pingsResult = await executePingsRequest(username, password);
        expect404(pingsResult);
      });
    });
  });
}
