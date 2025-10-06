/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics';
import { getPrivilegedMonitorUsersIndex } from '@kbn/security-solution-plugin/common/entity_analytics/privileged_user_monitoring/utils';
import { asyncForEach } from '@kbn/std';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { entityAnalyticsRouteHelpersFactory } from '../../../utils/entity_analytics';
import { PrivMonUtils } from '../utils';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const entityAnalyticsRoutes = entityAnalyticsRouteHelpersFactory(supertest, log);
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const spacesService = getService('spaces');

  const createDeprecatedPrivMonUser = (
    namespace: string,
    indexPattern: string,
    name: string = 'user_1'
  ) =>
    es.index({
      index: getPrivilegedMonitorUsersIndex(namespace),
      body: {
        user: {
          name,
          is_privileged: true,
        },
        labels: {
          sources: ['index'],
          source_indices: [indexPattern],
        },
      },
      refresh: 'wait_for',
    });

  const SPACES = ['default', 'space1'];

  describe('@ess @serverless @skipInServerlessMKI Entity Analytics Privileged user monitoring Migrations', () => {
    beforeEach(async () => {
      await asyncForEach(SPACES, async (space) => {
        if (space !== 'default') {
          await spacesService.create({
            id: space,
            name: space,
          });
        }
        await enablePrivmonSetting(kibanaServer, space);
        await PrivMonUtils(getService, space).initPrivMonEngine();
      });
    });

    afterEach(async () => {
      await asyncForEach(SPACES, async (space) => {
        await entityAnalyticsApi.deleteMonitoringEngine({ query: { data: true } }, space);
        await disablePrivmonSetting(kibanaServer, space);
        if (space !== 'default') {
          await spacesService.delete(space);
        }
      });
    });

    SPACES.forEach((namespace) => {
      it(`should run the migration when users have source_index field for space ${namespace}`, async () => {
        const indexPattern = 'INDEX1';

        await entityAnalyticsApi.createEntitySource(
          {
            body: {
              type: 'index',
              name: 'User Monitored Indices',
              indexPattern,
            },
          },
          namespace
        );
        await createDeprecatedPrivMonUser(namespace, indexPattern);
        await entityAnalyticsRoutes.runMigrations();

        const res = await entityAnalyticsApi.listPrivMonUsers({ query: {} }, namespace);
        const listed = res.body as ListPrivMonUsersResponse;

        expect(listed.length).toEqual(1);
        expect(listed[0]?.labels?.source_ids).toBeDefined();
        expect((listed[0]?.labels as any).source_indices).not.toBeDefined(); // Type Assertion required because source_indices is not defined in the schema anymore
      });

      it(`should run the migration and delete stale users when the index was updated for space ${namespace}`, async () => {
        const indexPattern = 'INDEX2';

        await entityAnalyticsApi.createEntitySource(
          {
            body: {
              type: 'index',
              name: 'User Monitored Indices',
              indexPattern,
            },
          },
          namespace
        );
        await createDeprecatedPrivMonUser(namespace, indexPattern);
        await createDeprecatedPrivMonUser(namespace, 'DIFFERENT INDEX PATTERNS', 'user_2'); // stale user

        await entityAnalyticsRoutes.runMigrations();

        const res = await entityAnalyticsApi.listPrivMonUsers({ query: {} }, namespace);
        const listed = res.body as ListPrivMonUsersResponse;

        expect(listed.length).toEqual(1);
        expect(listed[0].user?.name).toEqual('user_1');
        expect(listed[0]?.labels?.source_ids).toBeDefined();
      });

      it(`should not run the migration if engine is disable for space ${namespace}`, async () => {
        const indexPattern = 'INDEX4';

        await entityAnalyticsApi.createEntitySource(
          {
            body: {
              type: 'index',
              name: 'User Monitored Indices',
              indexPattern,
            },
          },
          namespace
        );
        await createDeprecatedPrivMonUser(namespace, indexPattern);

        await entityAnalyticsApi.deleteMonitoringEngine({ query: { data: true } }, namespace);
        await entityAnalyticsRoutes.runMigrations(); // should return 200
      });
    });
  });
};
