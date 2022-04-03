/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PINGS_DATE_RANGE_END, PINGS_DATE_RANGE_START } from './constants';
import { API_URLS } from '../../../../plugins/synthetics/common/constants';

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');
  const spaces = getService('spaces');

  const expect403 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 403);
  };

  const expectResponse = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 200);
  };

  const executePingsRequest = async (username: string, password: string, spaceId?: string) => {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    const url = `${basePath}${API_URLS.PINGS}?sort=desc&from=${PINGS_DATE_RANGE_START}&to=${PINGS_DATE_RANGE_END}`;
    return await supertest
      .get(url)
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  };

  describe('feature controls', () => {
    it(`APIs can be accessed by heartbeat-* read privileges role`, async () => {
      const username = 'heartbeat_read';
      const roleName = 'heartbeat_read';
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

        const pingsResult = await executePingsRequest(username, password);
        expect403(pingsResult);
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

        const pingsResult = await executePingsRequest(username, password);
        expect403(pingsResult);
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
        const pingsResult = await executePingsRequest(username, password, space1Id);
        expectResponse(pingsResult);
      });

      it(`user_1 can't access APIs in space_2`, async () => {
        const pingsResult = await executePingsRequest(username, password);
        expect403(pingsResult);
      });
    });
  });
}
