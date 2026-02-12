/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type {
  ListEntitySourcesResponse,
  ListPrivMonUsersResponse,
} from '@kbn/security-solution-plugin/common/api/entity_analytics';
import { getPrivilegedMonitorUsersIndex } from '@kbn/security-solution-plugin/common/entity_analytics/privileged_user_monitoring/utils';
import { asyncForEach } from '@kbn/std';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { entityAnalyticsRouteHelpersFactory } from '../../../utils/entity_analytics';
import { PrivMonUtils } from '../utils';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const entityAnalyticsRoutes = entityAnalyticsRouteHelpersFactory(supertest, log);
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const spacesService = getService('spaces');

  const deleteEntitySources = async (namespace: string, names?: string[]) => {
    const entitySources = (await entityAnalyticsApi.listEntitySources({ query: {} }, namespace))
      .body as ListEntitySourcesResponse;

    const entitySourcesToDelete = names
      ? entitySources.sources.filter((s) => !names?.includes(s.name!))
      : entitySources.sources;

    await asyncForEach(entitySourcesToDelete, async (source) => {
      await entityAnalyticsApi.deleteEntitySource({ params: { id: source.id } }, namespace);
    });
  };

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

  const expectAllDefaultSourcesToExist = async (namespace: string) => {
    const sources = await entityAnalyticsApi.listEntitySources({ query: {} }, namespace);
    const names = (sources.body as ListEntitySourcesResponse).sources.map((s) => s.name);

    expect(names.sort()).toEqual(
      [
        `.entity_analytics.monitoring.users-${namespace}`,
        `.entity_analytics.monitoring.sources.entityanalytics_okta-${namespace}`,
        `.entity_analytics.monitoring.sources.entityanalytics_ad-${namespace}`,
      ].sort()
    );
  };

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
        await PrivMonUtils(getService, space).initPrivMonEngine();
      });
    });

    afterEach(async () => {
      await asyncForEach(SPACES, async (space) => {
        await entityAnalyticsApi.deleteMonitoringEngine({ query: { data: true } }, space);
        if (space !== 'default') {
          await spacesService.delete(space);
        }
      });
    });

    SPACES.forEach((namespace) => {
      describe(`source_index migration for space ${namespace}`, () => {
        it(`should run the migration when users have source_index field`, async () => {
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

        it(`should run the migration and delete stale users when the index was updated`, async () => {
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

        it(`should not run the migration if engine is disable`, async () => {
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

      describe(`upsert entity source migration for space ${namespace}`, () => {
        it(`should create the entity source when migration runs and no entity source exists`, async () => {
          await deleteEntitySources(namespace);

          await entityAnalyticsRoutes.runMigrations();

          await expectAllDefaultSourcesToExist(namespace);
        });

        it(`should create missing entity source when migration runs one entity source doesn't exist`, async () => {
          await deleteEntitySources(namespace, [`.entity_analytics.monitoring.users-${namespace}`]);

          await entityAnalyticsRoutes.runMigrations();

          await expectAllDefaultSourcesToExist(namespace);
        });

        it(`should work as expected when migration runs and all entity sources exist`, async () => {
          await entityAnalyticsRoutes.runMigrations();

          await expectAllDefaultSourcesToExist(namespace);
        });
      });
    });
  });
};
