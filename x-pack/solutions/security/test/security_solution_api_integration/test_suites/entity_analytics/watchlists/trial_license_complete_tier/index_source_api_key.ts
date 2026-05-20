/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common/constants';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { WatchlistSyncUtils } from './utils/watchlist_sync_utils';
import { EntityStoreUtils } from './utils/entity_store_utils';
import { usersAndRolesFactory } from '../../utils/users_and_roles';

const USER_PASSWORD = 'changeme';
const sourceIndexName = 'watchlist-api-key-test-users';

const KIBANA_ONLY_ROLE = {
  name: 'watchlist_kibana_only',
  privileges: {
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
        },
        spaces: ['default'],
      },
    ],
    elasticsearch: {
      // no index privileges — user cannot read the test source index
    },
  },
};

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const userHelper = usersAndRolesFactory(getService('security'));

  const makeEntitySourceRequest = (
    method: 'post' | 'put' | 'delete',
    path: string,
    username: string,
    body?: object
  ) => {
    const req = supertestWithoutAuth[method](path)
      .auth(username, USER_PASSWORD)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');
    return body ? req.send(body) : req.send();
  };

  const kibanaOnlyUser = 'watchlist_kibana_only_user';

  describe('@ess @serverless @skipInServerlessMKI Index Source API Key Management', () => {
    const utils = WatchlistSyncUtils(getService, [sourceIndexName]);
    const entityStore = EntityStoreUtils(getService);

    before(async () => {
      await userHelper.createRole(KIBANA_ONLY_ROLE);
      await userHelper.createUser({
        username: kibanaOnlyUser,
        password: USER_PASSWORD,
        roles: [KIBANA_ONLY_ROLE.name],
      });
      await utils.cleanWatchlistState();
      await entityStore.install(['user']);
    });

    after(async () => {
      await userHelper.deleteUser(kibanaOnlyUser);
      await userHelper.deleteRole(KIBANA_ONLY_ROLE.name);
      await entityStore.uninstall();
    });

    afterEach(async () => {
      await utils.deleteAllSourceIndices();
      await entityStore.clearAllEntityStoreData();
      await utils.cleanWatchlistState();
    });

    it('Create watchlist returns 403 when the user does not have read access to the target index pattern', async () => {
      const { body: watchlist } = await entityAnalyticsApi.createWatchlist({
        body: { name: 'priv-check-watchlist', description: 'test', riskModifier: 1 },
      });

      const response = await makeEntitySourceRequest(
        'post',
        `/api/entity_analytics/watchlists/${watchlist.id}/entity_source`,
        kibanaOnlyUser,
        {
          type: 'index',
          name: 'restricted-source',
          indexPattern: sourceIndexName,
          identifierField: 'user.name',
          enabled: true,
          range: { start: 'now-10d', end: 'now' },
        }
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient privileges');
    });

    it('Update watchlist returns 403 when user does not have read access to the new index pattern', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId, entitySourceId } = await utils.createWatchlistAndEntitySource(
        'priv-update-watchlist',
        sourceIndexName
      );

      const response = await makeEntitySourceRequest(
        'put',
        `/api/entity_analytics/watchlists/${watchlistId}/entity_source/${entitySourceId}`,
        kibanaOnlyUser,
        {
          indexPattern: 'restricted-new-index-*',
        }
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient privileges');
    });
  });
};
