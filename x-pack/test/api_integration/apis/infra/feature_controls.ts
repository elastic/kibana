/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import gql from 'graphql-tag';
import { FtrProviderContext } from '../../ftr_provider_context';

const introspectionQuery = gql`
  query Schema {
    __schema {
      queryType {
        name
      }
    }
  }
`;

export default function({ getService }: FtrProviderContext) {
  const security = getService('security');
  const spaces = getService('spaces');
  const clientFactory = getService('infraOpsGraphQLClientFactory');

  const expectGraphQL404 = (result: any) => {
    expect(result.response).to.be(undefined);
    expect(result.error).not.to.be(undefined);
    expect(result.error).to.have.property('networkError');
    expect(result.error.networkError).to.have.property('statusCode', 404);
  };

  const expectGraphQLResponse = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).to.have.property('data');
    expect(result.response.data).to.be.an('object');
  };

  const executeGraphQLQuery = async (username: string, password: string, spaceId?: string) => {
    const queryOptions = {
      query: introspectionQuery,
    };

    const basePath = spaceId ? `/s/${spaceId}` : '';

    const client = clientFactory({ username, password, basePath });
    let error;
    let response;
    try {
      response = await client.query(queryOptions);
    } catch (err) {
      error = err;
    }
    return {
      error,
      response,
    };
  };

  describe('feature controls', () => {
    it(`APIs can't be accessed by user with logstash-* "read" privileges`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['logstash-*'],
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
        expectGraphQL404(graphQLResult);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it('APIs can be accessed user with global "all" and logstash-* "read" privileges', async () => {
      const username = 'global_all';
      const roleName = 'global_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['logstash-*'],
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
        expectGraphQLResponse(graphQLResult);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    // this could be any role which doesn't have access to the infra feature
    it(`APIs can't be accessed by user with dashboard "all" and logstash-* "read" privileges`, async () => {
      const username = 'dashboard_all';
      const roleName = 'dashboard_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['logstash-*'],
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
        expectGraphQL404(graphQLResult);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    describe('spaces', () => {
      // the following tests create a user_1 which has infrastructure read access to space_1, logs read access to space_2 and dashboard all access to space_3
      const space1Id = 'space_1';
      const space2Id = 'space_2';
      const space3Id = 'space_3';

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
        await spaces.create({
          id: space3Id,
          name: space3Id,
          disabledFeatures: [],
        });
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['logstash-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                infrastructure: ['read'],
              },
              spaces: [space1Id],
            },
            {
              feature: {
                logs: ['read'],
              },
              spaces: [space2Id],
            },
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: [space3Id],
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
        await spaces.delete(space3Id);
        await security.role.delete(roleName);
        await security.user.delete(username);
      });

      it('user_1 can access APIs in space_1', async () => {
        const graphQLResult = await executeGraphQLQuery(username, password, space1Id);
        expectGraphQLResponse(graphQLResult);
      });

      it(`user_1 can access APIs in space_2`, async () => {
        const graphQLResult = await executeGraphQLQuery(username, password, space2Id);
        expectGraphQLResponse(graphQLResult);
      });

      it(`user_1 can't access APIs in space_3`, async () => {
        const graphQLResult = await executeGraphQLQuery(username, password, space3Id);
        expectGraphQL404(graphQLResult);
      });
    });
  });
}
