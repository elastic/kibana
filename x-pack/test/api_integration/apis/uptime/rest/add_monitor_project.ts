/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import expect from '@kbn/expect';
import { ConfigKey, ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/synthetics_monitor';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('[PUT] /api/uptime/service/monitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    let projectMonitors: ProjectMonitorsRequest;

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
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
            filter: `${syntheticsMonitorType}.attributes.journey_id: "${journeyId}" AND ${syntheticsMonitorType}.attributes.project_id: "${projectId}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = response.body;
        if (monitors[0]?.id) {
          await supertest
            .delete(`/s/${space}${API_URLS.SYNTHETICS_MONITORS}/${monitors[0].id}`)
            .set('kbn-xsrf', 'true')
            .send(projectMonitors)
            .expect(200);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    beforeEach(() => {
      projectMonitors = setUniqueIds(getFixtureJson('project_browser_monitor'));
    });

    it('project monitors - returns a list of successfully created monitors', async () => {
      try {
        const apiResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        expect(apiResponse.body.updatedMonitors).eql([]);
        expect(apiResponse.body.failedMonitors).eql([]);
        expect(apiResponse.body.createdMonitors).eql(
          projectMonitors.monitors.map((monitor) => monitor.id)
        );
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - returns a list of successfully updated monitors', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        const apiResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        expect(apiResponse.body.createdMonitors).eql([]);
        expect(apiResponse.body.failedMonitors).eql([]);
        expect(apiResponse.body.updatedMonitors).eql(
          projectMonitors.monitors.map((monitor) => monitor.id)
        );
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - does not increment monitor revision unless a change has been made', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        const updatedMonitorsResponse = await Promise.all(
          projectMonitors.monitors.map((monitor) => {
            return supertest
              .get(API_URLS.SYNTHETICS_MONITORS)
              .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitor.id}` })
              .set('kbn-xsrf', 'true')
              .expect(200);
          })
        );

        updatedMonitorsResponse.forEach((response) => {
          expect(response.body.monitors[0].attributes.revision).eql(1);
        });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - increments monitor revision when a change has been made', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        const editedMonitors = {
          ...projectMonitors,
          monitors: projectMonitors.monitors.map((monitor) => ({
            ...monitor,
            content: 'changed content',
          })),
        };

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(editedMonitors);

        const updatedMonitorsResponse = await Promise.all(
          projectMonitors.monitors.map((monitor) => {
            return supertest
              .get(API_URLS.SYNTHETICS_MONITORS)
              .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitor.id}` })
              .set('kbn-xsrf', 'true')
              .expect(200);
          })
        );

        updatedMonitorsResponse.forEach((response) => {
          expect(response.body.monitors[0].attributes.revision).eql(2);
        });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - does not delete monitors when keep stale is true', async () => {
      const secondMonitor = { ...projectMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: testMonitors,
          })
          .expect(200);

        const apiResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);

        // does not delete the stale monitor
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;

        expect(monitors.length).eql(1);

        expect(apiResponse.body.createdMonitors).eql([]);
        expect(apiResponse.body.failedMonitors).eql([]);
        expect(apiResponse.body.deletedMonitors).eql([]);
        expect(apiResponse.body.updatedMonitors).eql([projectMonitors.monitors[0].id]);
        expect(apiResponse.body.staleMonitors).eql([secondMonitor.id]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - deletes monitors when keep stale is false', async () => {
      const secondMonitor = { ...projectMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
          .expect(200);

        const projectResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({ ...projectMonitors, keep_stale: false })
          .expect(200);

        // expect monitor to have been deleted
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;

        expect(monitors[0]).eql(undefined);

        expect(projectResponse.body.createdMonitors).eql([]);
        expect(projectResponse.body.failedMonitors).eql([]);
        expect(projectResponse.body.updatedMonitors).eql([projectMonitors.monitors[0].id]);
        expect(projectResponse.body.deletedMonitors).eql([secondMonitor.id]);
        expect(projectResponse.body.staleMonitors).eql([]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - does not delete monitors from different suites when keep stale is false', async () => {
      const secondMonitor = { ...projectMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const testprojectId = 'test-suite-2';
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
          .expect(200);

        const projectResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({ ...projectMonitors, keep_stale: false, project: testprojectId })
          .expect(200);

        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;

        expect(monitors.length).eql(1);

        expect(projectResponse.body.createdMonitors).eql([projectMonitors.monitors[0].id]);
        expect(projectResponse.body.failedMonitors).eql([]);
        expect(projectResponse.body.deletedMonitors).eql([]);
        expect(projectResponse.body.updatedMonitors).eql([]);
        expect(projectResponse.body.staleMonitors).eql([]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);

        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, testprojectId);
          }),
        ]);
      }
    });

    it('project monitors - does not delete a monitor from the same suite in a different space', async () => {
      const secondMonitor = { ...projectMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
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
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
          .expect(200);
        const projectResponse = await supertest
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ ...projectMonitors, keep_stale: false })
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(projectResponse.body.createdMonitors).eql([projectMonitors.monitors[0].id]);
        expect(projectResponse.body.failedMonitors).eql([]);
        expect(projectResponse.body.deletedMonitors).eql([]);
        expect(projectResponse.body.updatedMonitors).eql([]);
        expect(projectResponse.body.staleMonitors).eql([]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(
              monitor.id,
              projectMonitors.project,
              'default',
              username,
              password
            );
          }),
        ]);
        await deleteMonitor(
          projectMonitors.monitors[0].id,
          projectMonitors.project,
          SPACE_ID,
          username,
          password
        );
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - validates monitor type', async () => {
      try {
        const apiResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], schedule: '3m', tags: '' }],
          });

        expect(apiResponse.body.updatedMonitors).eql([]);
        expect(apiResponse.body.failedMonitors).eql([
          {
            details:
              'Invalid value "3m" supplied to "schedule" | Invalid value "" supplied to "tags"',
            id: projectMonitors.monitors[0].id,
            payload: {
              content:
                'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
              filter: {
                match: 'check if title is present',
              },
              id: projectMonitors.monitors[0].id,
              locations: ['us-east4-a'],
              name: 'check if title is present',
              params: {},
              playwrightOptions: {
                chromiumSandbox: false,
                headless: true,
              },
              schedule: '3m',
              tags: '',
              throttling: {
                download: 5,
                latency: 20,
                upload: 3,
              },
            },
            reason: 'Failed to save or update monitor. Configuration is not valid',
          },
        ]);
        expect(apiResponse.body.createdMonitors).eql([]);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - saves space as data stream namespace', async () => {
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
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0].attributes[ConfigKey.NAMESPACE]).eql(SPACE_ID);
      } finally {
        await deleteMonitor(
          projectMonitors.monitors[0].id,
          projectMonitors.project,
          SPACE_ID,
          username,
          password
        );
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - formats custom id appropriately', async () => {
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
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]).eql(
          `${projectMonitors.monitors[0].id}-${projectMonitors.project}-${SPACE_ID}`
        );
      } finally {
        await deleteMonitor(
          projectMonitors.monitors[0].id,
          projectMonitors.project,
          SPACE_ID,
          username,
          password
        );
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - is able to decrypt monitor when updated after hydration', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        const response = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = response.body;

        // add urls and ports to mimic hydration
        const updates = {
          [ConfigKey.URLS]: 'https://modified-host.com',
          [ConfigKey.PORT]: 443,
        };

        const modifiedMonitor = { ...monitors[0]?.attributes, ...updates };

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitors[0]?.id)
          .set('kbn-xsrf', 'true')
          .send(modifiedMonitor)
          .expect(200);

        // update project monitor via push api
        const apiResponse = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        expect(apiResponse.body.updatedMonitors).eql([projectMonitors.monitors[0].id]);

        // ensure that monitor can still be decrypted
        await supertest
          .get(API_URLS.SYNTHETICS_MONITORS + '/' + monitors[0]?.id)
          .set('kbn-xsrf', 'true')
          .expect(200);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });
  });
}
