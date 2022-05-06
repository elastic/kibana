/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import expect from '@kbn/expect';
import { PushMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/lib/saved_objects/synthetics_monitor';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('[PUT] /api/uptime/service/monitors', () => {
    const supertest = getService('supertest');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    let pushMonitors: PushMonitorsRequest;

    const setUniqueIds = (request: PushMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuid.v4() })),
      };
    };

    const deleteMonitor = async (
      journeyId: string,
      projectId: string,
      space: string = 'default',
      username: string = '',
      password: string = ''
    ) => {
      try {
        const response = await supertest
          .get(`/s/${space}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            query: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId} AND ${syntheticsMonitorType}.attributes.suite_id: ${projectId} `,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = response.body;

        if (monitors[0]?.id) {
          await supertest
            .delete(`/s/${space}${API_URLS.SYNTHETICS_MONITORS}/${monitors[0].id}`)
            .set('kbn-xsrf', 'true')
            .send(pushMonitors)
            .expect(200);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    beforeEach(() => {
      pushMonitors = setUniqueIds(getFixtureJson('push_browser_monitor'));
    });

    it('push monitors - returns a list of successfully created monitors', async () => {
      try {
        const apiResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send(pushMonitors);

        expect(apiResponse.body.updatedMonitors).eql([]);
        expect(apiResponse.body.failedMonitors).eql([]);
        expect(apiResponse.body.createdMonitors).eql(
          pushMonitors.monitors.map((monitor) => monitor.id)
        );
      } finally {
        await Promise.all([
          pushMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, pushMonitors.projectId);
          }),
        ]);
      }
    });

    it('push monitors - returns a list of successfully updated monitors', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send(pushMonitors);

        const apiResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send(pushMonitors);

        expect(apiResponse.body.createdMonitors).eql([]);
        expect(apiResponse.body.failedMonitors).eql([]);
        expect(apiResponse.body.updatedMonitors).eql(
          pushMonitors.monitors.map((monitor) => monitor.id)
        );
      } finally {
        await Promise.all([
          pushMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, pushMonitors.projectId);
          }),
        ]);
      }
    });

    it('push monitors - does not increment monitor revision unless a change has been made', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send(pushMonitors);

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send(pushMonitors);

        const updatedMonitorsResponse = await Promise.all(
          pushMonitors.monitors.map((monitor) => {
            return supertest
              .get(API_URLS.SYNTHETICS_MONITORS)
              .query({ query: `${syntheticsMonitorType}.attributes.journey_id: ${monitor.id}` })
              .set('kbn-xsrf', 'true')
              .expect(200);
          })
        );

        updatedMonitorsResponse.forEach((response) => {
          expect(response.body.monitors[0].attributes.revision).eql(1);
        });
      } finally {
        await Promise.all([
          pushMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, pushMonitors.projectId);
          }),
        ]);
      }
    });

    it('push monitors - increments monitor revision when a change has been made', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send(pushMonitors);

        const editedMonitors = {
          ...pushMonitors,
          monitors: pushMonitors.monitors.map((monitor) => ({
            ...monitor,
            content: 'changed content',
          })),
        };

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send(editedMonitors);

        const updatedMonitorsResponse = await Promise.all(
          pushMonitors.monitors.map((monitor) => {
            return supertest
              .get(API_URLS.SYNTHETICS_MONITORS)
              .query({ query: `${syntheticsMonitorType}.attributes.journey_id: ${monitor.id}` })
              .set('kbn-xsrf', 'true')
              .expect(200);
          })
        );

        updatedMonitorsResponse.forEach((response) => {
          expect(response.body.monitors[0].attributes.revision).eql(2);
        });
      } finally {
        await Promise.all([
          pushMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, pushMonitors.projectId);
          }),
        ]);
      }
    });

    it('push monitors - does not delete monitors when keep stale is true', async () => {
      const secondMonitor = { ...pushMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [pushMonitors.monitors[0], secondMonitor];

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send({
            ...pushMonitors,
            monitors: testMonitors,
          })
          .expect(200);

        const apiResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send(pushMonitors)
          .expect(200);

        // does not delete the stale monitor
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            query: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;

        expect(monitors.length).eql(1);

        expect(apiResponse.body.createdMonitors).eql([]);
        expect(apiResponse.body.failedMonitors).eql([]);
        expect(apiResponse.body.deletedMonitors).eql([]);
        expect(apiResponse.body.updatedMonitors).eql([pushMonitors.monitors[0].id]);
        expect(apiResponse.body.staleMonitors).eql([secondMonitor.id]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, pushMonitors.projectId);
          }),
        ]);
      }
    });

    it('push monitors - deletes monitors when keep stale is false', async () => {
      const secondMonitor = { ...pushMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [pushMonitors.monitors[0], secondMonitor];

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send({
            ...pushMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
          .expect(200);

        const pushResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send({ ...pushMonitors, keep_stale: false })
          .expect(200);

        // expect monitor to have been deleted
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            query: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;

        expect(monitors[0]).eql(undefined);

        expect(pushResponse.body.createdMonitors).eql([]);
        expect(pushResponse.body.failedMonitors).eql([]);
        expect(pushResponse.body.updatedMonitors).eql([pushMonitors.monitors[0].id]);
        expect(pushResponse.body.deletedMonitors).eql([secondMonitor.id]);
        expect(pushResponse.body.staleMonitors).eql([]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, pushMonitors.projectId);
          }),
        ]);
      }
    });

    it('push monitors - does not delete monitors from different suites when keep stale is false', async () => {
      const secondMonitor = { ...pushMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [pushMonitors.monitors[0], secondMonitor];
      const testprojectId = 'test-suite-2';
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send({
            ...pushMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
          .expect(200);

        const pushResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .set('kbn-xsrf', 'true')
          .send({ ...pushMonitors, keep_stale: false, projectId: testprojectId })
          .expect(200);

        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            query: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;

        expect(monitors.length).eql(1);

        expect(pushResponse.body.createdMonitors).eql([pushMonitors.monitors[0].id]);
        expect(pushResponse.body.failedMonitors).eql([]);
        expect(pushResponse.body.deletedMonitors).eql([]);
        expect(pushResponse.body.updatedMonitors).eql([]);
        expect(pushResponse.body.staleMonitors).eql([]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, pushMonitors.projectId);
          }),
        ]);

        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, testprojectId);
          }),
        ]);
      }
    });

    it('push monitors - does not delete a monitor from the same suite in a different space', async () => {
      const secondMonitor = { ...pushMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [pushMonitors.monitors[0], secondMonitor];
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuid.v4()}`;
      const SPACE_NAME = `test-space-name ${uuid.v4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
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
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({
            ...pushMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
          .expect(200);
        const pushResponse = await supertest
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PUSH}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ ...pushMonitors, keep_stale: false })
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .auth(username, password)
          .query({
            query: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(pushResponse.body.createdMonitors).eql([pushMonitors.monitors[0].id]);
        expect(pushResponse.body.failedMonitors).eql([]);
        expect(pushResponse.body.deletedMonitors).eql([]);
        expect(pushResponse.body.updatedMonitors).eql([]);
        expect(pushResponse.body.staleMonitors).eql([]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, pushMonitors.projectId, 'default', username, password);
          }),
        ]);
        await deleteMonitor(
          secondMonitor.id,
          pushMonitors.projectId,
          SPACE_NAME,
          username,
          password
        );
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });
  });
}
