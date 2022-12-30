/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { format as formatUrl } from 'url';
import { ConfigKey, ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { INSUFFICIENT_FLEET_PERMISSIONS } from '@kbn/synthetics-plugin/server/synthetics_service/project_monitor/project_monitor_formatter';
import { REQUEST_TOO_LARGE } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/delete_monitor_project';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/synthetics_monitor';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { parseStreamApiResponse } from './add_monitor_project_legacy';

export default function ({ getService }: FtrProviderContext) {
  describe('DeleteProjectMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const config = getService('config');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
    const kibanaServer = getService('kibanaServer');
    const projectMonitorEndpoint = kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY;

    let projectMonitors: ProjectMonitorsRequest;

    let testPolicyId = '';
    const testPrivateLocations = new PrivateLocationTestService(getService);

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuid.v4() })),
      };
    };

    before(async () => {
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertest
        .post('/api/fleet/epm/packages/synthetics/0.11.4')
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

    it('only allows 250 requests at a time', async () => {
      const project = 'test-brower-suite';
      const monitors = [];
      for (let i = 0; i < 251; i++) {
        monitors.push({
          ...projectMonitors.monitors[0],
          id: `test-id-${i}`,
          name: `test-name-${i}`,
        });
      }

      try {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        const savedObjectsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true');
        const { total } = savedObjectsResponse.body;
        expect(total).to.eql(251);
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        const response = await supertest
          .delete(API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({ monitors: monitorsToDelete })
          .expect(400);
        const { message } = response.body;
        expect(message).to.eql(REQUEST_TOO_LARGE);
      } finally {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            keep_stale: false,
            monitors: [],
          })
        );
      }
    });

    it('project monitors - handles browser monitors', async () => {
      const monitorToDelete = 'second-monitor-id';
      const monitors = [
        projectMonitors.monitors[0],
        {
          ...projectMonitors.monitors[0],
          id: monitorToDelete,
        },
      ];
      const project = 'test-brower-suite';

      try {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        const savedObjectsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total } = savedObjectsResponse.body;
        expect(total).to.eql(2);
        const monitorsToDelete = [monitorToDelete];

        const response = await supertest
          .delete(API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({ monitors: monitorsToDelete })
          .expect(200);

        expect(response.body.deleted_monitors).to.eql(monitorsToDelete);

        const responseAfterDeletion = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total: totalAfterDeletion } = responseAfterDeletion.body;
        expect(totalAfterDeletion).to.eql(1);
      } finally {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            keep_stale: false,
            monitors: [],
          })
        );
      }
    });

    it('does not delete monitors from a different project', async () => {
      const monitors = [...projectMonitors.monitors];
      const project = 'test-brower-suite';
      const secondProject = 'second-project';

      try {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project: secondProject,
            monitors,
          })
        );

        const savedObjectsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const secondProjectSavedObjectResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${secondProject}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total } = savedObjectsResponse.body;
        const { total: secondProjectTotal } = secondProjectSavedObjectResponse.body;
        expect(total).to.eql(monitors.length);
        expect(secondProjectTotal).to.eql(monitors.length);
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        const response = await supertest
          .delete(API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({ monitors: monitorsToDelete })
          .expect(200);

        expect(response.body.deleted_monitors).to.eql(monitorsToDelete);

        const responseAfterDeletion = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const secondResponseAfterDeletion = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${secondProject}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total: totalAfterDeletion } = responseAfterDeletion.body;
        const { total: secondProjectTotalAfterDeletion } = secondResponseAfterDeletion.body;
        expect(totalAfterDeletion).to.eql(0);
        expect(secondProjectTotalAfterDeletion).to.eql(monitors.length);
      } finally {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            keep_stale: false,
            monitors: [],
          })
        );
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project: secondProject,
            keep_stale: false,
            monitors: [],
          })
        );
      }
    });

    it('does not delete monitors from the same project in a different space project', async () => {
      const monitors = [...projectMonitors.monitors];
      const project = 'test-brower-suite';
      const SPACE_ID = `test-space-${uuid.v4()}`;
      const SPACE_NAME = `test-space-name ${uuid.v4()}`;
      const secondSpaceProjectMonitorApiRoute = `${kibanaServerUrl}/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      try {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        await parseStreamApiResponse(
          secondSpaceProjectMonitorApiRoute,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        const savedObjectsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const secondSpaceProjectSavedObjectResponse = await supertest
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total } = savedObjectsResponse.body;
        const { total: secondSpaceTotal } = secondSpaceProjectSavedObjectResponse.body;

        expect(total).to.eql(monitors.length);
        expect(secondSpaceTotal).to.eql(monitors.length);
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        const response = await supertest
          .delete(
            `/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace(
              '{projectName}',
              project
            )}`
          )
          .set('kbn-xsrf', 'true')
          .send({ monitors: monitorsToDelete })
          .expect(200);

        expect(response.body.deleted_monitors).to.eql(monitorsToDelete);

        const responseAfterDeletion = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const secondSpaceResponseAfterDeletion = await supertest
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total: totalAfterDeletion } = responseAfterDeletion.body;
        const { total: secondProjectTotalAfterDeletion } = secondSpaceResponseAfterDeletion.body;
        expect(totalAfterDeletion).to.eql(monitors.length);
        expect(secondProjectTotalAfterDeletion).to.eql(0);
      } finally {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            keep_stale: false,
            monitors: [],
          })
        );
        await parseStreamApiResponse(
          secondSpaceProjectMonitorApiRoute,
          JSON.stringify({
            ...projectMonitors,
            project,
            keep_stale: false,
            monitors: [],
          })
        );
      }
    });

    it('deletes integration policies when project monitors are deleted', async () => {
      const monitors = [
        { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
      ];
      const project = 'test-brower-suite';

      try {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        const savedObjectsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total } = savedObjectsResponse.body;
        expect(total).to.eql(monitors.length);
        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            savedObjectsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );
        expect(packagePolicy.policy_id).to.be(testPolicyId);

        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        const response = await supertest
          .delete(API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({ monitors: monitorsToDelete })
          .expect(200);

        expect(response.body.deleted_monitors).to.eql(monitorsToDelete);

        const responseAfterDeletion = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total: totalAfterDeletion } = responseAfterDeletion.body;
        expect(totalAfterDeletion).to.eql(0);
        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            savedObjectsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );
        expect(packagePolicy2).to.be(undefined);
      } finally {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            keep_stale: false,
            monitors: [],
          })
        );
      }
    });

    it('returns 403 when a user without fleet permissions attempts to delete a project monitor with a private location', async () => {
      const project = 'test-brower-suite';
      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 0'],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const monitorsToDelete = testMonitors.map((monitor) => monitor.id);
      const username = 'admin';
      const roleName = 'uptime read only';
      const password = `${username} - password`;
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
          JSON.stringify({
            ...projectMonitors,
            project,
            keep_stale: false,
            monitors: testMonitors,
          })
        );

        const savedObjectsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.project_id: "${project}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { total } = savedObjectsResponse.body;
        expect(total).to.eql(2);

        const {
          body: { message },
        } = await supertestWithoutAuth
          .delete(API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .auth(username, password)
          .send({ monitors: monitorsToDelete })
          .expect(403);
        expect(message).to.eql(INSUFFICIENT_FLEET_PERMISSIONS);
      } finally {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            keep_stale: false,
            monitors: [],
          })
        );
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });
  });
}
