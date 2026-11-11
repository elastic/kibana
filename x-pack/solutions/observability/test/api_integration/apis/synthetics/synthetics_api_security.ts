/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  syntheticsAppPublicRestApiRoutes,
  syntheticsAppRestApiRoutes,
} from '@kbn/synthetics-plugin/server/routes';
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

const ELASTIC_MANAGED_LOCATIONS_DISABLED =
  "You don't have permission to use Elastic managed global locations. Please contact your Kibana administrator.";

export default function ({ getService }: FtrProviderContext) {
  describe('SyntheticsAPISecurity', function () {
    this.tags('skipCloud');

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const kibanaServer = getService('kibanaServer');

    const assertPermissions = async (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      path: string,
      options: {
        statusCodes: number[];
        SPACE_ID: string;
        username: string;
        password: string;
        writeAccess?: boolean;
        anyRequiredPrivileges?: string[];
        tags?: string;
        readUser?: boolean;
      }
    ) => {
      let resp;
      const {
        statusCodes,
        SPACE_ID,
        username,
        password,
        writeAccess,
        anyRequiredPrivileges,
        readUser,
      } = options;
      let tags = anyRequiredPrivileges?.length
        ? `[${readUser ? '' : 'uptime-read,'}${anyRequiredPrivileges.join(',')}]`
        : !writeAccess
        ? '[uptime-read]'
        : options.tags ?? '[uptime-read,uptime-write]';
      if (
        (method === 'POST' || method === 'DELETE' || method === 'PUT') &&
        path.includes('private_locations')
      ) {
        tags = readUser
          ? '[private-location-write,uptime-write]'
          : '[uptime-read,private-location-write,uptime-write]';
      }
      const getStatusMessage = (respStatus: string | number) =>
        `Expected ${statusCodes?.join(
          ','
        )}, got ${respStatus} status code doesn't match, for path: ${path} and method ${method}`;

      const getBodyMessage = (tg?: string) =>
        `API [${method} ${path}] is unauthorized for user, this action is granted by the Kibana privileges ${
          tg ?? tags
        }`;

      const verifyPermissionsBody = (res: any, msg: string) => {
        if (res.status === 403 && !res.body.message.includes('MissingIndicesPrivileges:')) {
          expect(decodeURIComponent(res.body.message)).to.eql(msg);
        }
      };

      switch (method) {
        case 'GET':
          resp = await supertestWithoutAuth
            .get(`/s/${SPACE_ID}${path}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({});
          expect(statusCodes.includes(resp.status)).to.eql(true, getStatusMessage(resp.status));
          verifyPermissionsBody(resp, getBodyMessage('[uptime-read]'));
          break;
        case 'PUT':
          resp = await supertestWithoutAuth
            .put(`/s/${SPACE_ID}${path}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({});
          expect(statusCodes.includes(resp.status)).to.eql(true, getStatusMessage(resp.status));
          verifyPermissionsBody(resp, getBodyMessage());
          break;
        case 'POST':
          resp = await supertestWithoutAuth
            .post(`/s/${SPACE_ID}${path}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({});
          expect(statusCodes.includes(resp.status)).to.eql(true, getStatusMessage(resp.status));
          verifyPermissionsBody(resp, getBodyMessage());
          break;
        case 'DELETE':
          resp = await supertestWithoutAuth
            .delete(`/s/${SPACE_ID}${path}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({});
          expect(statusCodes.includes(resp.status)).to.eql(true, getStatusMessage(resp.status));
          verifyPermissionsBody(resp, getBodyMessage());
          break;
      }

      return resp;
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    const allRoutes = syntheticsAppRestApiRoutes.concat(syntheticsAppPublicRestApiRoutes);

    it('throws permissions errors for un-auth user', async () => {
      const { SPACE_ID, username, password } = await monitorTestService.addsNewSpace([]);

      for (const routeFn of allRoutes) {
        const route = routeFn();
        await assertPermissions(route.method, route.path, {
          statusCodes: [403],
          SPACE_ID,
          username,
          password,
          writeAccess: route.writeAccess ?? true,
          anyRequiredPrivileges: route.anyRequiredPrivileges,
        });
      }
    });

    it('throws permissions errors for read user', async () => {
      const { SPACE_ID, username, password } = await monitorTestService.addsNewSpace(['read']);

      for (const routeFn of allRoutes) {
        const route = routeFn();
        if (route.writeAccess === false && !route.anyRequiredPrivileges?.length) {
          continue;
        }
        await assertPermissions(route.method, route.path, {
          statusCodes: [200, 403, 500, 400, 404],
          SPACE_ID,
          username,
          password,
          writeAccess: route.writeAccess ?? true,
          anyRequiredPrivileges: route.anyRequiredPrivileges,
          tags: '[uptime-write]',
          readUser: true,
        });
      }
    });

    it('allows a read user with manual-run access to trigger a test', async () => {
      const { SPACE_ID, username, password } = await monitorTestService.addsNewSpace([
        'read',
        'can_run_test_manually',
      ]);

      await assertPermissions(
        'POST',
        `${SYNTHETICS_API_URLS.TRIGGER_MONITOR}/00000000-0000-4000-8000-000000000000`,
        {
          statusCodes: [404],
          SPACE_ID,
          username,
          password,
          writeAccess: false,
          anyRequiredPrivileges: ['uptime-write', 'monitor-run-manually'],
        }
      );
    });

    it('allows an all user to trigger a test', async () => {
      const { SPACE_ID, username, password } = await monitorTestService.addsNewSpace(['all']);

      await assertPermissions(
        'POST',
        `${SYNTHETICS_API_URLS.TRIGGER_MONITOR}/00000000-0000-4000-8000-000000000000`,
        {
          statusCodes: [404],
          SPACE_ID,
          username,
          password,
          writeAccess: false,
          anyRequiredPrivileges: ['uptime-write', 'monitor-run-manually'],
        }
      );
    });

    it('no permissions errors for all user', async () => {
      const { SPACE_ID, username, password } = await monitorTestService.addsNewSpace(['all']);

      for (const routeFn of allRoutes) {
        const route = routeFn();
        if (
          (route.method === 'DELETE' && route.path === SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT) ||
          SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_APIKEY
        ) {
          continue;
        }
        await assertPermissions(route.method, route.path, {
          statusCodes: [400, 200, 404],
          SPACE_ID,
          username,
          password,
          writeAccess: route.writeAccess ?? true,
          tags: '[uptime-write]',
        });
      }
    });

    /**
     * Manual runs on Elastic managed locations also require the `elastic_managed_locations_enabled`
     * sub-feature, matching the UI, which disables "Run test manually" for such monitors without it.
     * Monitors on private locations only are not affected.
     */
    describe('run test manually on Elastic managed locations', () => {
      const testPrivateLocations = new PrivateLocationTestService(getService);

      let managedMonitorId: string;
      let privateMonitorId: string;

      const triggerTestNow = async (
        monitorId: string,
        uptimePermissions: string[],
        statusCode: number
      ) => {
        const { username, password } = await monitorTestService.addsNewSpace(uptimePermissions);
        const res = await supertestWithoutAuth
          .post(`${SYNTHETICS_API_URLS.TRIGGER_MONITOR}/${monitorId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send();
        expect(res.status).to.eql(statusCode, JSON.stringify(res.body));
        return res;
      };

      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await testPrivateLocations.installSyntheticsPackage();
        const pvtLoc = await testPrivateLocations.createPrivateLocation();

        const managedRes = await monitorTestService.createMonitor({
          monitor: {
            ...getFixtureJson('http_monitor'),
            name: `managed location monitor ${uuidv4()}`,
          },
        });
        managedMonitorId = managedRes.rawBody.id;

        const privateRes = await monitorTestService.createMonitor({
          monitor: {
            ...getFixtureJson('http_monitor'),
            name: `private location monitor ${uuidv4()}`,
            locations: [
              {
                id: pvtLoc.id,
                agentPolicyId: pvtLoc.agentPolicyId,
                label: pvtLoc.label,
                isServiceManaged: false,
                geo: pvtLoc.geo,
              },
            ],
          },
        });
        privateMonitorId = privateRes.rawBody.id;
      });

      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('read + can_run_test_manually role cannot run a monitor on managed locations (403)', async () => {
        const res = await triggerTestNow(managedMonitorId, ['read', 'can_run_test_manually'], 403);
        expect(res.body.message).to.eql(ELASTIC_MANAGED_LOCATIONS_DISABLED);
      });

      it('read + can_run_test_manually role can run a private-location-only monitor', async () => {
        const res = await triggerTestNow(privateMonitorId, ['read', 'can_run_test_manually'], 200);
        expect(typeof res.body.testRunId).to.eql('string');
      });

      it('writer without the managed locations sub-feature cannot run it (403)', async () => {
        const res = await triggerTestNow(managedMonitorId, ['minimal_all'], 403);
        expect(res.body.message).to.eql(ELASTIC_MANAGED_LOCATIONS_DISABLED);
      });

      it('base `all` role can run a monitor on managed locations', async () => {
        const res = await triggerTestNow(managedMonitorId, ['all'], 200);
        expect(typeof res.body.testRunId).to.eql('string');
      });

      it('run once (monitor editor) is also gated on managed locations', async () => {
        const runOncePath = `${SYNTHETICS_API_URLS.RUN_ONCE_MONITOR}/${uuidv4()}`;
        const monitor = {
          ...getFixtureJson('http_monitor'),
          name: `run once monitor ${uuidv4()}`,
        };

        const writer = await monitorTestService.addsNewSpace(['minimal_all']);
        const denied = await supertestWithoutAuth
          .post(runOncePath)
          .auth(writer.username, writer.password)
          .set('kbn-xsrf', 'true')
          .send(monitor);
        expect(denied.status).to.eql(403, JSON.stringify(denied.body));
        expect(denied.body.message).to.eql(ELASTIC_MANAGED_LOCATIONS_DISABLED);

        const allUser = await monitorTestService.addsNewSpace(['all']);
        const allowed = await supertestWithoutAuth
          .post(runOncePath)
          .auth(allUser.username, allUser.password)
          .set('kbn-xsrf', 'true')
          .send(monitor);
        expect(allowed.status).to.eql(200, JSON.stringify(allowed.body));
      });
    });
  });
}
