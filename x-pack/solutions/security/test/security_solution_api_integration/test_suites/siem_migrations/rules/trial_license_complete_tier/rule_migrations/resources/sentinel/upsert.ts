/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { SiemMigrationResource } from '@kbn/security-solution-plugin/common/siem_migrations/model/common.gen';
import type { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import {
  deleteAllRuleMigrations,
  ruleMigrationResourcesRouteHelpersFactory,
  ruleMigrationRouteHelpersFactory,
  sentinelArmResourcesWithWatchlist,
  splunkRuleWithResources,
} from '../../../../../utils';

const LOOKUP_INDEX_NAME = 'lookup_default_allowed-ports';
const RESOURCES_INDEX = '.kibana-siem-rule-migrations-resources-default';

const sentinelWatchlistResource = {
  type: 'Microsoft.OperationalInsights/workspaces/providers/Watchlists',
  properties: {
    watchlistAlias: 'allowed_ports',
    rawContent: 'Ports,Description\r\n"389,636",LDAP Both\r\n22,SSH',
    itemsSearchKey: 'Ports',
    contentType: 'text/csv',
    numberOfLinesToSkip: 100,
  },
};

const sentinelWatchlistTemplate = {
  $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
  contentVersion: '1.0.0.0',
  parameters: {
    workspace: {
      type: 'String',
    },
  },
  resources: [sentinelWatchlistResource],
};

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const ruleMigrationRoutes = ruleMigrationRouteHelpersFactory(supertest);
  const resourceRoutes = ruleMigrationResourcesRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA @skipInServerlessMKI Rule migration resources upsert API', () => {
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
      await es.indices.delete({ index: LOOKUP_INDEX_NAME, ignore_unavailable: true });
    });

    it('should normalize Sentinel watchlists and create a denormalized lookup index', async () => {
      const {
        body: { migration_id: migrationId },
      } = await ruleMigrationRoutes.create({});

      await ruleMigrationRoutes.addSentinelRulesToMigration({
        migrationId,
        payload: sentinelArmResourcesWithWatchlist,
      });

      await resourceRoutes.upsert({
        migrationId,
        body: [
          {
            type: 'watchlist',
            name: 'uploaded-watchlist',
            content: JSON.stringify(sentinelWatchlistTemplate),
          },
        ],
      });

      const resourcesResponse = await es.search<SiemMigrationResource>({
        index: RESOURCES_INDEX,
        query: {
          bool: {
            filter: [{ term: { migration_id: migrationId } }, { term: { name: 'allowed_ports' } }],
          },
        },
      });
      const [resource] = resourcesResponse.hits.hits.map((hit) => hit._source);

      expect(resource).toMatchObject({
        type: 'lookup',
        name: 'allowed_ports',
        content: LOOKUP_INDEX_NAME,
        metadata: {
          itemsSearchKey: 'Ports',
        },
      });
      expect(resource?.metadata).toMatchObject({ itemsSearchKey: 'Ports' });

      await es.indices.refresh({ index: LOOKUP_INDEX_NAME });
      const lookupResponse = await es.search({
        index: LOOKUP_INDEX_NAME,
        query: { match_all: {} },
        size: 10,
      });

      expect(lookupResponse.hits.hits.map((hit) => hit._source)).toEqual(
        expect.arrayContaining([
          { Ports: '389', Description: 'LDAP Both' },
          { Ports: '636', Description: 'LDAP Both' },
          { Ports: '22', Description: 'SSH' },
        ])
      );
    });

    it('should reject unsupported Sentinel watchlist contentType values', async () => {
      const {
        body: { migration_id: migrationId },
      } = await ruleMigrationRoutes.create({});

      await ruleMigrationRoutes.addSentinelRulesToMigration({
        migrationId,
        payload: sentinelArmResourcesWithWatchlist,
      });

      const response = await resourceRoutes.upsert({
        migrationId,
        body: [
          {
            type: 'watchlist',
            name: 'uploaded-watchlist',
            content: JSON.stringify({
              ...sentinelWatchlistResource,
              properties: {
                ...sentinelWatchlistResource.properties,
                contentType: 'application/json',
              },
            }),
          },
        ],
        expectStatusCode: 400,
      });

      expect(response.body).toMatchObject({
        message:
          'Failed to process Sentinel watchlist resources: Unsupported Sentinel watchlist content type: application/json',
      });
    });

    it('should reject Sentinel watchlist uploads for non-Sentinel migrations', async () => {
      const {
        body: { migration_id: migrationId },
      } = await ruleMigrationRoutes.create({});

      await ruleMigrationRoutes.addRulesToMigration({
        migrationId,
        payload: [splunkRuleWithResources],
      });

      const response = await resourceRoutes.upsert({
        migrationId,
        body: [
          {
            type: 'watchlist',
            name: 'uploaded-watchlist',
            content: JSON.stringify(sentinelWatchlistResource),
          },
        ],
        expectStatusCode: 400,
      });

      expect(response.body).toMatchObject({
        message: 'Sentinel watchlist resources can only be uploaded to Sentinel migrations',
      });
    });
  });
};
