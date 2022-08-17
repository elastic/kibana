/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fetch, { BodyInit, HeadersInit, Response } from 'node-fetch';
import uuid from 'uuid';
import expect from '@kbn/expect';
import { format as formatUrl } from 'url';
import { ConfigKey, ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/synthetics_monitor';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { comparePolicies, getTestProjectSyntheticsPolicy } from './sample_data/test_policy';

export default function ({ getService }: FtrProviderContext) {
  describe('[PUT] /api/uptime/service/monitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const config = getService('config');
    const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');
    const projectMonitorEndpoint = kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT;

    let projectMonitors: ProjectMonitorsRequest;

    let testPolicyId = '';
    const testPrivateLocations = new PrivateLocationTestService(getService);

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

    before(async () => {
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertest
        .post('/api/fleet/epm/packages/synthetics/0.9.4')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      await testPrivateLocations.setTestLocations([testPolicyId]);
    });

    beforeEach(() => {
      projectMonitors = setUniqueIds(getFixtureJson('project_browser_monitor'));
    });

    it('project monitors - returns a list of successfully created monitors', async () => {
      try {
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );

        expect(messages).to.have.length(2);
        expect(messages[1].updatedMonitors).eql([]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].createdMonitors).eql(
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

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );

        expect(messages).to.have.length(2);
        expect(messages[1].createdMonitors).eql([]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].updatedMonitors).eql(
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
          });

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );

        expect(messages).to.have.length(2);
        expect(messages[1].createdMonitors).eql([]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].deletedMonitors).eql([]);
        expect(messages[1].updatedMonitors).eql([projectMonitors.monitors[0].id]);
        expect(messages[1].staleMonitors).eql([secondMonitor.id]);
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
          });

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
          })
        );
        expect(messages).to.have.length(3);

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
        expect(messages[1]).eql(`Monitor ${secondMonitor.id} deleted successfully`);
        expect(messages[2].createdMonitors).eql([]);
        expect(messages[2].failedMonitors).eql([]);
        expect(messages[2].updatedMonitors).eql([projectMonitors.monitors[0].id]);
        expect(messages[2].deletedMonitors).eql([secondMonitor.id]);
        expect(messages[2].staleMonitors).eql([]);
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
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
        );

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            project: testprojectId,
          })
        );

        expect(messages).to.have.length(2);
        expect(messages[1].createdMonitors).eql([projectMonitors.monitors[0].id]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].deletedMonitors).eql([]);
        expect(messages[1].updatedMonitors).eql([]);
        expect(messages[1].staleMonitors).eql([]);

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
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({ ...projectMonitors, keep_stale: false, monitors: testMonitors }),
          {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
          }
        );

        const spaceUrl = kibanaServerUrl + `/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT}`;

        const messages = await parseStreamApiResponse(
          spaceUrl,
          JSON.stringify({ ...projectMonitors, keep_stale: false }),
          {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
          }
        );
        expect(messages).to.have.length(2);
        expect(messages[1].createdMonitors).eql([projectMonitors.monitors[0].id]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].deletedMonitors).eql([]);
        expect(messages[1].updatedMonitors).eql([]);
        expect(messages[1].staleMonitors).eql([]);

        const getResponse = await supertestWithoutAuth
          .get(API_URLS.SYNTHETICS_MONITORS)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
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
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], schedule: '3m', tags: '' }],
          })
        );

        expect(messages).to.have.length(1);
        expect(messages[0].updatedMonitors).eql([]);
        expect(messages[0].failedMonitors).eql([
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
              locations: ['localhost'],
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
        expect(messages[0].createdMonitors).eql([]);
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
        await supertestWithoutAuth
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertestWithoutAuth
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
        await supertestWithoutAuth
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertestWithoutAuth
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
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );
        expect(messages).to.have.length(2);
        expect(messages[1].updatedMonitors).eql([projectMonitors.monitors[0].id]);

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

    it('project monitors - is able to enable and disable monitors', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              {
                ...projectMonitors.monitors[0],
                enabled: false,
              },
            ],
          })
          .expect(200);
        const response = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = response.body;
        expect(monitors[0].attributes.enabled).eql(false);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - returns a failed monitor when user defines a private location without fleet permissions', async () => {
      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 0'],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const username = 'admin';
      const roleName = 'uptime read only';
      const password = `${username}-password`;
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

        const messages = await parseStreamApiResponse(
          kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          }),
          {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
          }
        );

        expect(messages).to.have.length(3);
        expect(messages[0]).to.eql(`${testMonitors[0].id}: monitor created successfully`);
        expect(messages[1]).to.eql('test-id-2: failed to create or update monitor');
        expect(messages[2]).to.eql({
          createdMonitors: [testMonitors[0].id],
          updatedMonitors: [],
          staleMonitors: [],
          deletedMonitors: [],
          failedMonitors: [
            {
              details:
                'Insufficient permissions. In order to configure private locations, you must have Fleet and Integrations write permissions. To resolve, please generate a new API key with a user who has Fleet and Integrations write permissions.',
              id: 'test-id-2',
              payload: {
                content:
                  'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
                filter: {
                  match: 'check if title is present',
                },
                id: 'test-id-2',
                locations: ['localhost'],
                name: 'check if title is present',
                params: {},
                playwrightOptions: {
                  chromiumSandbox: false,
                  headless: true,
                },
                privateLocations: ['Test private location 0'],
                schedule: 10,
                tags: [],
                throttling: {
                  download: 5,
                  latency: 20,
                  upload: 3,
                },
              },
              reason: 'Failed to create or update monitor',
            },
          ],
          failedStaleMonitors: [],
        });
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
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - returns a successful monitor when user defines a private location with fleet permissions', async () => {
      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 0'],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const username = 'admin';
      const roleName = 'uptime with fleet';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
                fleetv2: ['all'],
                fleet: ['all'],
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
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
        );
        expect(messages).to.have.length(3);
        expect(messages).to.eql([
          `${testMonitors[0].id}: monitor created successfully`,
          'test-id-2: monitor created successfully',
          {
            createdMonitors: [testMonitors[0].id, 'test-id-2'],
            updatedMonitors: [],
            staleMonitors: [],
            deletedMonitors: [],
            failedMonitors: [],
            failedStaleMonitors: [],
          },
        ]);
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
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('creates integration policies for project monitors with private locations', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
            ],
          });

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );
        expect(packagePolicy.name).eql(
          `${projectMonitors.monitors[0].id}-${projectMonitors.project}-default-Test private location 0`
        );
        expect(packagePolicy.policy_id).eql(testPolicyId);

        comparePolicies(packagePolicy, getTestProjectSyntheticsPolicy());
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
            ],
          });

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        comparePolicies(packagePolicy, getTestProjectSyntheticsPolicy());

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], privateLocations: [] }],
          });

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );

        expect(packagePolicy2).eql(undefined);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('deletes integration policies when project monitors are deleted', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
            ],
          })
          .expect(200);

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        comparePolicies(packagePolicy, getTestProjectSyntheticsPolicy());

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [],
            keep_stale: false,
          });

        const monitorsResponse2 = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(monitorsResponse2.body.monitors.length).eql(0);

        await new Promise((resolve) => {
          setTimeout(() => resolve(null), 3000);
        });

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );

        expect(packagePolicy2).eql(undefined);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('handles updating package policies when project monitors are updated', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              {
                ...projectMonitors.monitors[0],
                privateLocations: ['Test private location 0'],
              },
            ],
          });

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        comparePolicies(packagePolicy, getTestProjectSyntheticsPolicy());

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              {
                ...projectMonitors.monitors[0],
                privateLocations: ['Test private location 0'],
                enabled: false,
              },
            ],
          });

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );

        comparePolicies(
          packagePolicy2,
          getTestProjectSyntheticsPolicy({
            inputs: { enabled: { value: false, type: 'bool' } },
          })
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('handles location formatting for both private and public locations', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
            ],
          });

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
          expect(response.body.monitors[0].attributes.locations).eql([
            {
              id: 'localhost',
              label: 'Local Synthetics Service',
              geo: { lat: 0, lon: 0 },
              url: 'mockDevUrl',
              isServiceManaged: true,
              status: 'experimental',
              isInvalid: false,
            },
            {
              label: 'Test private location 0',
              isServiceManaged: false,
              isInvalid: false,
              agentPolicyId: testPolicyId,
              id: testPolicyId,
              geo: {
                lat: '',
                lon: '',
              },
              concurrentMonitors: 1,
            },
          ]);
        });
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

/**
 * Borrowed from AIOPS test code: https://github.com/elastic/kibana/blob/23a7ac2c2e2b1f64daa17b914e86989b1fde750c/x-pack/test/api_integration/apis/aiops/explain_log_rate_spikes.ts
 * Receives a stream and parses the messages until the stream closes.
 */
async function* parseStream(stream: NodeJS.ReadableStream) {
  let partial = '';

  try {
    for await (const value of stream) {
      const full = `${partial}${value}`;
      const parts = full.split('\n');
      const last = parts.pop();

      partial = last ?? '';

      const event = parts.map((p) => JSON.parse(p));

      for (const events of event) {
        yield events;
      }
    }
  } catch (error) {
    yield { type: 'error', payload: error.toString() };
  }
}

/**
 * Helper function to process the results of the module's stream parsing helper function.
 */
async function getMessages(stream: NodeJS.ReadableStream | null) {
  if (stream === null) return [];
  const data: any[] = [];
  for await (const action of parseStream(stream)) {
    data.push(action);
  }
  return data;
}

/**
 * This type is intended to highlight any break between shared parameter contracts defined in
 * the module's streaming endpoint helper functions.
 */
type StreamApiFunction<T = unknown> = (
  url: string,
  body?: BodyInit,
  extraHeaders?: HeadersInit,
  method?: string
) => T;

/**
 * This helps the test file have DRY code when it comes to calling
 * the same streaming endpoint over and over by defining some selective defaults.
 */
const parseStreamApiResponse: StreamApiFunction<Promise<any[]>> = async (
  url: string,
  body?: BodyInit,
  extraHeaders?: HeadersInit,
  method = 'PUT'
) => {
  const streamResponse = await callStreamApi(url, body, extraHeaders, method);
  return getMessages(streamResponse.body);
};

/**
 * This helps the test file have DRY code when it comes to calling
 * the same streaming endpoint over and over by defining some selective defaults.
 */
const callStreamApi: StreamApiFunction<Promise<Response>> = async (
  url: string,
  body?: BodyInit,
  extraHeaders?: HeadersInit,
  method = 'PUT'
) => {
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'stream',
      ...extraHeaders,
    },
    body,
  });
};
