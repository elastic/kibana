/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import type { ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorSavedObjectType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('AddProjectMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
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
      await testPrivateLocations.createPrivateLocation();

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

    it('should create a browser monitor with a public location', async () => {
      const project = `test-project-${uuidv4()}`;
      const monitorToCreate = {
        ...projectMonitors.monitors[0],
        privateLocations: [],
      };

      try {
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set('kbn-xsrf', 'true')
          .send({ monitors: [monitorToCreate] })
          .expect(200);

        expect(body).to.eql({
          createdMonitors: [monitorToCreate.id],
          updatedMonitors: [],
          failedMonitors: [],
        });

        // Verify the monitor was created with the correct location
        const getResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: "${monitorToCreate.id}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0].locations[0].label).eql('Dev Service');
      } finally {
        await deleteMonitor(monitorToCreate.id, project);
      }
    });

    it('should create an http monitor with a public location', async () => {
      const project = `test-project-${uuidv4()}`;
      const monitorToCreate = {
        ...httpProjectMonitors.monitors[1],
        privateLocations: [],
      };

      try {
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set('kbn-xsrf', 'true')
          .send({ monitors: [monitorToCreate] })
          .expect(200);

        expect(body).to.eql({
          createdMonitors: [monitorToCreate.id],
          updatedMonitors: [],
          failedMonitors: [],
        });

        // Verify the monitor was created with the correct location
        const getResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: "${monitorToCreate.id}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0].locations[0].label).eql('Dev Service');
      } finally {
        await deleteMonitor(monitorToCreate.id, project);
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
  });
}
