/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import type SuperTest from 'supertest';
import deepmerge from 'deepmerge';

import ossRootTelemetrySchema from '@kbn/telemetry-plugin/schema/oss_root.json';
import xpackRootTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_root.json';
import monitoringRootTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_monitoring.json';
import ossPluginsTelemetrySchema from '@kbn/telemetry-plugin/schema/oss_plugins.json';
import xpackPluginsTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_plugins.json';
import type { UnencryptedTelemetryPayload } from '@kbn/telemetry-plugin/common/types';
import type {
  UsageStatsPayload,
  CacheDetails,
} from '@kbn/telemetry-collection-manager-plugin/server/types';
import { assertTelemetryPayload } from '../../../../../test/api_integration/apis/telemetry/utils';
import basicClusterFixture from './fixtures/basiccluster.json';
import multiClusterFixture from './fixtures/multicluster.json';
import type { SecurityService } from '../../../../../test/common/services/security/security';
import type { FtrProviderContext } from '../../ftr_provider_context';

function omitCacheDetails(usagePayload: Array<Record<string, unknown>>) {
  return usagePayload.map(({ cacheDetails, ...item }) => item);
}

function updateFixtureTimestamps(fixture: Array<Record<string, unknown>>, timestamp: string) {
  return fixture.map((item) => ({ ...item, timestamp }));
}

function getCacheDetails(body: UnencryptedTelemetryPayload): CacheDetails[] {
  return body.map(({ stats }) => (stats as UsageStatsPayload).cacheDetails);
}

/**
 * Update the .monitoring-* documents loaded via the archiver to the recent `timestamp`
 * @param esSupertest The client to send requests to ES
 * @param fromTimestamp The lower timestamp limit to query the documents from
 * @param toTimestamp The upper timestamp limit to query the documents from
 * @param timestamp The new timestamp to be set
 */
function updateMonitoringDates(
  esSupertest: SuperTest.SuperTest<SuperTest.Test>,
  fromTimestamp: string,
  toTimestamp: string,
  timestamp: string
) {
  return esSupertest
    .post('/.monitoring-*/_update_by_query?refresh=true')
    .send({
      query: {
        range: {
          timestamp: {
            format: 'epoch_millis',
            gte: moment(fromTimestamp).valueOf(),
            lte: moment(toTimestamp).valueOf(),
          },
        },
      },
      script: {
        source: `ctx._source.timestamp='${timestamp}'`,
        lang: 'painless',
      },
    })
    .expect(200);
}

async function createUserWithRole(
  security: SecurityService,
  userName: string,
  roleName: string,
  role: unknown
) {
  await security.role.create(roleName, role);

  await security.user.create(userName, {
    password: password(userName),
    roles: [roleName],
    full_name: `User ${userName}`,
  });
}

function password(userName: string) {
  return `${userName}-password`;
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth'); // We need this because `.auth` in the already authed one does not work as expected
  const esArchiver = getService('esArchiver');
  const esSupertest = getService('esSupertest');
  const security = getService('security');

  describe('/api/telemetry/v2/clusters/_stats', () => {
    const timestamp = new Date().toISOString();
    describe('monitoring/multicluster', () => {
      let localXPack: Record<string, unknown>;
      let monitoring: Array<Record<string, unknown>>;

      const archive = 'x-pack/test/functional/es_archives/monitoring/multicluster';
      const fromTimestamp = '2017-08-15T21:00:00.000Z';
      const toTimestamp = '2017-08-16T00:00:00.000Z';

      before(async () => {
        await esArchiver.load(archive);
        await updateMonitoringDates(esSupertest, fromTimestamp, toTimestamp, timestamp);

        const { body }: { body: UnencryptedTelemetryPayload } = await supertest
          .post('/api/telemetry/v2/clusters/_stats')
          .set('kbn-xsrf', 'xxx')
          .send({ unencrypted: true, refreshCache: true })
          .expect(200);

        expect(body.length).to.be.greaterThan(1);
        const telemetryStats = body.map(({ stats }) => stats);
        localXPack = telemetryStats.shift() as Record<string, unknown>;
        monitoring = telemetryStats as Array<Record<string, unknown>>;
      });
      after(() => esArchiver.unload(archive));

      it('should pass the schema validations', () => {
        const root = deepmerge(ossRootTelemetrySchema, xpackRootTelemetrySchema);

        // Merging root to monitoring because `kibana` may be passed in some cases for old collection methods reporting to a newer monitoring cluster
        const monitoringRoot = deepmerge(
          root,
          // It's nested because of the way it's collected and declared
          monitoringRootTelemetrySchema.properties.monitoringTelemetry.properties.stats.items
        );
        const plugins = deepmerge(ossPluginsTelemetrySchema, xpackPluginsTelemetrySchema);

        try {
          assertTelemetryPayload({ root, plugins }, localXPack);
          monitoring.forEach((stats) => {
            assertTelemetryPayload({ root: monitoringRoot, plugins }, stats);
          });
        } catch (err) {
          err.message = `The telemetry schemas in 'x-pack/plugins/telemetry_collection_xpack/schema/' are out-of-date, please update it as required: ${err.message}`;
          throw err;
        }
      });

      it('should load multiple trial-license clusters', async () => {
        expect(monitoring).length(3);
        expect(localXPack.collectionSource).to.eql('local_xpack');

        expect(omitCacheDetails(monitoring)).to.eql(
          updateFixtureTimestamps(multiClusterFixture, timestamp)
        );
      });
    });

    describe('with basic cluster and reporting and canvas usage info', () => {
      const archive = 'x-pack/test/functional/es_archives/monitoring/basic_6.3.x';
      const fromTimestamp = '2018-07-23T22:54:59.087Z';
      const toTimestamp = '2018-07-23T22:55:05.933Z';
      before(async () => {
        await esArchiver.load(archive);
        await updateMonitoringDates(esSupertest, fromTimestamp, toTimestamp, timestamp);
      });
      after(() => esArchiver.unload(archive));
      it('should load non-expiring basic cluster', async () => {
        const { body }: { body: UnencryptedTelemetryPayload } = await supertest
          .post('/api/telemetry/v2/clusters/_stats')
          .set('kbn-xsrf', 'xxx')
          .send({ unencrypted: true, refreshCache: true })
          .expect(200);

        expect(body).length(2);
        const telemetryStats = body.map(({ stats }) => stats);

        const [localXPack, ...monitoring] = telemetryStats as Array<Record<string, unknown>>;
        expect(localXPack.collectionSource).to.eql('local_xpack');
        expect(omitCacheDetails(monitoring)).to.eql(
          updateFixtureTimestamps(basicClusterFixture, timestamp)
        );
      });
    });

    describe('Telemetry caching', () => {
      const archive = 'x-pack/test/functional/es_archives/monitoring/basic_6.3.x';
      const fromTimestamp = '2018-07-23T22:54:59.087Z';
      const toTimestamp = '2018-07-23T22:55:05.933Z';

      before(async () => {
        await esArchiver.load(archive);
        await updateMonitoringDates(esSupertest, fromTimestamp, toTimestamp, timestamp);
        // hit the endpoint to cache results
        await supertest
          .post('/api/telemetry/v2/clusters/_stats')
          .set('kbn-xsrf', 'xxx')
          .send({ unencrypted: true, refreshCache: true })
          .expect(200);
      });
      after(() => esArchiver.unload(archive));
    });

    it('returns non-cached results when unencrypted', async () => {
      const now = Date.now();
      const { body }: { body: UnencryptedTelemetryPayload } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ unencrypted: true })
        .expect(200);

      expect(body).length(1);

      const cacheDetails = getCacheDetails(body);
      cacheDetails.forEach(({ fetchedAt, updatedAt }) => {
        // Check that the cache is fresh by comparing updatedAt timestamp with
        // the timestamp the data was fetched.
        expect(new Date(updatedAt).getTime()).to.be.greaterThan(now);
        // Check that the fetchedAt timestamp is updated when the data is fetched
        expect(new Date(fetchedAt).getTime()).to.be.greaterThan(now);
      });
    });

    it('grabs a fresh copy on refresh', async () => {
      const now = Date.now();
      const { body }: { body: UnencryptedTelemetryPayload } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ unencrypted: true, refreshCache: true })
        .expect(200);

      expect(body).length(1);
      getCacheDetails(body).forEach(({ updatedAt, fetchedAt }) => {
        // Check that the cache is fresh by comparing updatedAt timestamp with
        // the timestamp the data was fetched.
        expect(new Date(updatedAt).getTime()).to.be.greaterThan(now);
        // Check that the fetchedAt timestamp is updated when the data is fetched
        expect(new Date(fetchedAt).getTime()).to.be.greaterThan(now);
      });
    });

    describe('Only global read+ users can fetch unencrypted telemetry', () => {
      describe('superadmin user', () => {
        it('should return unencrypted telemetry for the admin user', async () => {
          await supertest
            .post('/api/telemetry/v2/clusters/_stats')
            .set('kbn-xsrf', 'xxx')
            .send({ unencrypted: true })
            .expect(200);
        });

        it('should return encrypted telemetry for the admin user', async () => {
          await supertest
            .post('/api/telemetry/v2/clusters/_stats')
            .set('kbn-xsrf', 'xxx')
            .send({ unencrypted: false })
            .expect(200);
        });
      });

      describe('global-read user', () => {
        const globalReadOnlyUser = 'telemetry-global-read-only-user';
        const globalReadOnlyRole = 'telemetry-global-read-only-role';

        before('create user', async () => {
          await createUserWithRole(security, globalReadOnlyUser, globalReadOnlyRole, {
            kibana: [
              {
                spaces: ['*'],
                base: ['read'],
                feature: {},
              },
            ],
          });
        });

        after(async () => {
          await security.user.delete(globalReadOnlyUser);
          await security.role.delete(globalReadOnlyRole);
        });

        it('should return encrypted telemetry for the global-read user', async () => {
          await supertestWithoutAuth
            .post('/api/telemetry/v2/clusters/_stats')
            .auth(globalReadOnlyUser, password(globalReadOnlyUser))
            .set('kbn-xsrf', 'xxx')
            .send({ unencrypted: false })
            .expect(200);
        });

        it('should return unencrypted telemetry for the global-read user', async () => {
          await supertestWithoutAuth
            .post('/api/telemetry/v2/clusters/_stats')
            .auth(globalReadOnlyUser, password(globalReadOnlyUser))
            .set('kbn-xsrf', 'xxx')
            .send({ unencrypted: true })
            .expect(200);
        });
      });

      describe('non global-read user', () => {
        const noGlobalUser = 'telemetry-no-global-user';
        const noGlobalRole = 'telemetry-no-global-role';

        before('create user', async () => {
          await createUserWithRole(security, noGlobalUser, noGlobalRole, {
            kibana: [
              {
                spaces: ['*'],
                base: [],
                feature: {
                  // It has access to many features specified individually but not a global one
                  discover: ['all'],
                  dashboard: ['all'],
                  canvas: ['all'],
                  maps: ['all'],
                  ml: ['all'],
                  visualize: ['all'],
                  dev_tools: ['all'],
                },
              },
            ],
          });
        });

        after(async () => {
          await security.user.delete(noGlobalUser);
          await security.role.delete(noGlobalRole);
        });

        it('should return encrypted telemetry for the read-only user', async () => {
          await supertestWithoutAuth
            .post('/api/telemetry/v2/clusters/_stats')
            .auth(noGlobalUser, password(noGlobalUser))
            .set('kbn-xsrf', 'xxx')
            .send({ unencrypted: false })
            .expect(200);
        });

        it('should return 403 when the read-only user requests unencrypted telemetry', async () => {
          await supertestWithoutAuth
            .post('/api/telemetry/v2/clusters/_stats')
            .auth(noGlobalUser, password(noGlobalUser))
            .set('kbn-xsrf', 'xxx')
            .send({ unencrypted: true })
            .expect(403);
        });
      });
    });
  });
}
