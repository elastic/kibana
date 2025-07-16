/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { ConfigKey, ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { syntheticsMonitorSavedObjectType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('AddProjectMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');
    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const testPrivateLocations = new PrivateLocationTestService(getService);

    let projectMonitors: ProjectMonitorsRequest;
    let httpProjectMonitors: ProjectMonitorsRequest;

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuidv4() })),
      };
    };

    const deleteMonitor = async (
      journeyId: string,
      projectId: string,
      space: string = 'default'
    ) => {
      try {
        const response = await supertest
          .get(`/s/${space}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: "${journeyId}" AND ${syntheticsMonitorSavedObjectType}.attributes.project_id: "${projectId}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = response.body;
        if (monitors[0]?.config_id) {
          await monitorTestService.deleteMonitor(monitors[0].config_id, 200, space);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);
      await testPrivateLocations.installSyntheticsPackage();
      await testPrivateLocations.addPrivateLocation();

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'testGlobalParam', value: 'testGlobalParamValue' })
        .expect(200);
      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'testGlobalParam2', value: 'testGlobalParamValue2' })
        .expect(200);
    });

    beforeEach(() => {
      projectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_browser_monitor').monitors,
      });
      httpProjectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_http_monitor').monitors,
      });
    });

    it('project monitors - saves space as data stream namespace', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
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
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.NAMESPACE]).eql(formatKibanaNamespace(SPACE_ID));
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - browser - handles custom namespace', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom.namespace';
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
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: [{ ...projectMonitors.monitors[0], namespace: customNamespace }] })
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.NAMESPACE]).eql(customNamespace);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - lightweight - handles custom namespace', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom.namespace';
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
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: [{ ...httpProjectMonitors.monitors[1], namespace: customNamespace }] })
          .expect(200);

        // expect monitor not to have been deleted
        const getResponse = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${httpProjectMonitors.monitors[1].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.NAMESPACE]).eql(customNamespace);
      } finally {
        await deleteMonitor(httpProjectMonitors.monitors[1].id, project, SPACE_ID);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - browser - handles custom namespace errors', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom-namespace';
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
        const { body } = await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: [{ ...projectMonitors.monitors[0], namespace: customNamespace }] })
          .expect(200);
        // expect monitor not to have been deleted
        expect(body).to.eql({
          createdMonitors: [],
          failedMonitors: [
            {
              details: 'Namespace contains invalid characters',
              id: projectMonitors.monitors[0].id,
              reason: 'Invalid namespace',
            },
          ],
          updatedMonitors: [],
        });
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - lightweight - handles custom namespace errors', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom-namespace';
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
        const { body } = await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: [{ ...httpProjectMonitors.monitors[1], namespace: customNamespace }] })
          .expect(200);
        // expect monitor not to have been deleted
        expect(body).to.eql({
          createdMonitors: [],
          failedMonitors: [
            {
              details: 'Namespace contains invalid characters',
              id: httpProjectMonitors.monitors[1].id,
              reason: 'Invalid namespace',
            },
          ],
          updatedMonitors: [],
        });
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - handles editing with spaces', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
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
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const decryptedCreatedMonitor = await monitorTestService.getMonitor(
          getResponse.body.monitors[0].config_id,
          { internal: true, space: SPACE_ID }
        );
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(decryptedCreatedMonitor.body[ConfigKey.SOURCE_PROJECT_CONTENT]).eql(
          projectMonitors.monitors[0].content
        );

        const updatedSource = 'updatedSource';
        // update monitor
        await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], content: updatedSource }],
          })
          .expect(200);
        const getResponseUpdated = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors: monitorsUpdated } = getResponseUpdated.body;
        expect(monitorsUpdated.length).eql(1);

        const decryptedUpdatedMonitor = await monitorTestService.getMonitor(
          monitorsUpdated[0].config_id,
          { internal: true, space: SPACE_ID }
        );
        expect(decryptedUpdatedMonitor.body[ConfigKey.SOURCE_PROJECT_CONTENT]).eql(updatedSource);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - formats custom id appropriately', async () => {
      const project = `test project ${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
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
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        const getResponse = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]).eql(
          `${projectMonitors.monitors[0].id}-${project}-${SPACE_ID}`
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - is able to decrypt monitor when updated after hydration', async () => {
      const project = `test-project-${uuidv4()}`;
      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);

        const response = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = response.body;

        // update project monitor via push api
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);

        expect(body).eql({
          updatedMonitors: [projectMonitors.monitors[0].id],
          createdMonitors: [],
          failedMonitors: [],
        });

        // ensure that monitor can still be decrypted
        await monitorTestService.getMonitor(monitors[0]?.config_id);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => deleteMonitor(monitor.id, project)),
        ]);
      }
    });

    it('project monitors - cannot update project monitors with read only privileges', async () => {
      const project = `test-project-${uuidv4()}`;

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
                uptime: ['read'],
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
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: testMonitors })
          .expect(403);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - returns a successful monitor when user defines a private location, even without fleet permissions', async () => {
      const project = `test-project-${uuidv4()}`;
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
        const { body } = await supertestWithoutAuth
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: testMonitors })
          .expect(200);

        expect(body).to.eql({
          createdMonitors: [testMonitors[0].id, 'test-id-2'],
          updatedMonitors: [],
          failedMonitors: [],
        });
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, project, 'default');
          }),
        ]);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - cannot update project monitors when user does not have access to a space in multi space use case', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_limited_space`;
      const password = `${username}-password`;
      const SPACE_ID_1 = `test-space-1-${uuidv4()}`;
      const SPACE_ID_2 = `test-space-2-${uuidv4()}`;
      const SPACE_NAME_1 = `test-space-name-1-${uuidv4()}`;
      const SPACE_NAME_2 = `test-space-name-2-${uuidv4()}`;

      await kibanaServer.spaces.create({ id: SPACE_ID_1, name: SPACE_NAME_1 });
      await kibanaServer.spaces.create({ id: SPACE_ID_2, name: SPACE_NAME_2 });

      try {
        // Give user access to only SPACE_ID_1
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
              },
              spaces: [SPACE_ID_1],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        // Try to add a monitor to both spaces, but user only has access to one
        const multiSpaceMonitor = {
          ...projectMonitors.monitors[0],
          spaces: [SPACE_ID_1, SPACE_ID_2],
        };

        const resp = await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID_1}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: [multiSpaceMonitor] });

        expect([403, 404]).to.contain(resp.status);
        expect([
          `Kibana space does not exist, Error: Unauthorized to get ${SPACE_ID_2} space`,
          'You do not have sufficient permissions to update monitors in all required spaces.',
        ]).to.contain(resp.body.message);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID_1);
        await security.user.delete(username);
        await security.role.delete(roleName);
        await kibanaServer.spaces.delete(SPACE_ID_1);
        await kibanaServer.spaces.delete(SPACE_ID_2);
      }
    });

    it('project monitors - cannot update project monitors when user does not have access to all spaces using * in spaces', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_limited_space_star`;
      const password = `${username}-password`;
      const SPACE_ID_1 = `test-space-1-${uuidv4()}`;
      const SPACE_ID_2 = `test-space-2-${uuidv4()}`;
      const SPACE_NAME_1 = `test-space-name-1-${uuidv4()}`;
      const SPACE_NAME_2 = `test-space-name-2-${uuidv4()}`;

      await kibanaServer.spaces.create({ id: SPACE_ID_1, name: SPACE_NAME_1 });
      await kibanaServer.spaces.create({ id: SPACE_ID_2, name: SPACE_NAME_2 });

      try {
        // Give user access to only SPACE_ID_1
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
              },
              spaces: [SPACE_ID_1],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        // Try to add a monitor to all spaces using '*', but user only has access to one
        const multiSpaceMonitor = {
          ...projectMonitors.monitors[0],
          spaces: ['*'],
        };

        const resp = await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID_1}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: [multiSpaceMonitor] });

        expect([403, 404]).to.contain(resp.status);
        const msg = resp.body.message || '';
        const isPermissionError = msg.includes(
          'You do not have sufficient permissions to update monitors in all required spaces'
        );
        const isUnauthorizedSpaceError =
          msg.includes('Kibana space does not exist') || msg.includes('Unauthorized to get');
        expect(isPermissionError || isUnauthorizedSpaceError).to.be(true);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID_1);
        await security.user.delete(username);
        await security.role.delete(roleName);
        await kibanaServer.spaces.delete(SPACE_ID_1);
        await kibanaServer.spaces.delete(SPACE_ID_2);
      }
    });

    it('project monitors - user with access to all spaces can specify * in spaces and monitor is created in all spaces', async () => {
      const project = `test-project-${uuidv4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin_all_spaces`;
      const password = `${username}-password`;
      const SPACE_ID_1 = `test-space-1-${uuidv4()}`;
      const SPACE_ID_2 = `test-space-2-${uuidv4()}`;
      const SPACE_NAME_1 = `test-space-name-1-${uuidv4()}`;
      const SPACE_NAME_2 = `test-space-name-2-${uuidv4()}`;

      await kibanaServer.spaces.create({ id: SPACE_ID_1, name: SPACE_NAME_1 });
      await kibanaServer.spaces.create({ id: SPACE_ID_2, name: SPACE_NAME_2 });

      try {
        // Give user access to all spaces
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

        // Use a monitor with spaces: ['*']
        const monitorId = uuidv4();
        const monitor = {
          ...httpProjectMonitors.monitors[1],
          id: monitorId,
          name: `All spaces Monitor ${monitorId}`,
          spaces: ['*'],
        };

        // Create monitor in SPACE_ID_1 context
        const { body } = await supertest
          .put(
            `/s/${SPACE_ID_1}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set('kbn-xsrf', 'true')
          .send({ monitors: [monitor] })
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: [monitorId],
          failedMonitors: [],
        });

        // Use savedObjects client to verify monitor is created in all spaces
        const soRes = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });

        // Get all available spaces

        // Find the monitor
        const found = soRes.saved_objects.find(
          (obj: any) => obj.attributes.journey_id === monitorId
        );
        expect(found).not.to.be(undefined);
        expect(found?.namespaces).to.eql('*');
        expect(found?.attributes.name).to.eql(monitor.name);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await kibanaServer.spaces.delete(SPACE_ID_1);
        await kibanaServer.spaces.delete(SPACE_ID_2);
      }
    });
  });
}
