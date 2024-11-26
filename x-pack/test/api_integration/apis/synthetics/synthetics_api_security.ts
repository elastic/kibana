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
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

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
        tags?: string;
      }
    ) => {
      let resp;
      const { statusCodes, SPACE_ID, username, password, writeAccess } = options;
      const tags = !writeAccess ? '[uptime-read]' : options.tags ?? '[uptime-read,uptime-write]';
      const getStatusMessage = (respStatus: string) =>
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
        });
      }
    });

    it('throws permissions errors for read user', async () => {
      const { SPACE_ID, username, password } = await monitorTestService.addsNewSpace(['read']);

      for (const routeFn of allRoutes) {
        const route = routeFn();
        if (route.writeAccess === false) {
          continue;
        }
        await assertPermissions(route.method, route.path, {
          statusCodes: [200, 403, 500, 400, 404],
          SPACE_ID,
          username,
          password,
          writeAccess: route.writeAccess ?? true,
          tags: '[uptime-write]',
        });
      }
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
  });
}
