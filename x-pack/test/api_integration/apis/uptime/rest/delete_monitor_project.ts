/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import expect from '@kbn/expect';
import { format as formatUrl } from 'url';
import {
  ConfigKey,
  ProjectMonitorsRequest,
  ProjectMonitor,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/synthetics_monitor';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { parseStreamApiResponse } from './add_monitor_project';

export default function ({ getService }: FtrProviderContext) {
  describe('DeleteProjectMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const config = getService('config');
    const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
    const projectMonitorEndpoint = kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY;

    let projectMonitors: ProjectMonitorsRequest;
    let httpProjectMonitors: ProjectMonitorsRequest;
    let tcpProjectMonitors: ProjectMonitorsRequest;
    let icmpProjectMonitors: ProjectMonitorsRequest;

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
        .post('/api/fleet/epm/packages/synthetics/0.10.3')
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
      httpProjectMonitors = setUniqueIds(getFixtureJson('project_http_monitor'));
      tcpProjectMonitors = setUniqueIds(getFixtureJson('project_tcp_monitor'));
      icmpProjectMonitors = setUniqueIds(getFixtureJson('project_icmp_monitor'));
    });

    // it('only allows 250 requests at a time', async () => { });

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
          .post(API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project))
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
          .post(API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project))
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
          .post(API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project))
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
  });
}

const checkFields = (response: string[], monitors: ProjectMonitor[]) => {
  const monitorMetaData = response.map((item) => JSON.parse(item));
  monitors.forEach((monitor) => {
    const configIsCorrect = monitorMetaData.some((ndjson: Record<string, unknown>) => {
      return ndjson.journey_id === monitor.id && ndjson.hash === monitor.hash;
    });
    expect(configIsCorrect).to.eql(true);
  });
};
