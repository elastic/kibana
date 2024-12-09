/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type SuperTest from 'supertest';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  LegacyProjectMonitorsRequest,
  ProjectMonitor,
  ProjectMonitorMetaData,
  PrivateLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('GetProjectMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertestWithoutAuth');
    const samlAuth = getService('samlAuth');

    let projectMonitors: LegacyProjectMonitorsRequest;
    let httpProjectMonitors: LegacyProjectMonitorsRequest;
    let tcpProjectMonitors: LegacyProjectMonitorsRequest;
    let icmpProjectMonitors: LegacyProjectMonitorsRequest;
    let testPolicyId = '';
    let editorUser: RoleCredentials;
    let testPrivateLocations: PrivateLocation[] = [];

    const testPrivateLocationsService = new PrivateLocationTestService(getService);

    const setUniqueIds = (
      request: LegacyProjectMonitorsRequest,
      privateLocations: PrivateLocation[] = []
    ) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({
          ...monitor,
          id: uuidv4(),
          privateLocations: privateLocations.map((location) => location.label),
        })),
      };
    };

    before(async () => {
      await testPrivateLocationsService.installSyntheticsPackage();

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocationsService.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      testPrivateLocations = await testPrivateLocationsService.setTestLocations([testPolicyId]);
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    beforeEach(() => {
      projectMonitors = setUniqueIds(
        getFixtureJson('project_browser_monitor'),
        testPrivateLocations
      );
      httpProjectMonitors = setUniqueIds(
        getFixtureJson('project_http_monitor'),
        testPrivateLocations
      );
      tcpProjectMonitors = setUniqueIds(
        getFixtureJson('project_tcp_monitor'),
        testPrivateLocations
      );
      icmpProjectMonitors = setUniqueIds(
        getFixtureJson('project_icmp_monitor'),
        testPrivateLocations
      );
    });

    it('project monitors - fetches all monitors - browser', async () => {
      const monitors = [];
      const project = 'test-brower-suite';
      for (let i = 0; i < 600; i++) {
        monitors.push({
          ...projectMonitors.monitors[0],
          id: `test browser id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(0, 250),
          })
          .expect(200);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(250, 500),
          })
          .expect(200);
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(500, 600),
          })
          .expect(200);

        const firstPageResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({ per_page: 500 })
          .send()
          .expect(200);

        const { monitors: firstPageMonitors, total, after_key: afterKey } = firstPageResponse.body;
        expect(firstPageMonitors.length).to.eql(500);
        expect(total).to.eql(600);
        expect(afterKey).to.eql('test browser id 548');

        const secondPageResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            search_after: afterKey,
            per_page: 500,
          })
          .send()
          .expect(200);
        const { monitors: secondPageMonitors } = secondPageResponse.body;
        expect(secondPageMonitors.length).to.eql(100);
        checkFields([...firstPageMonitors, ...secondPageMonitors], monitors);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(0, 250) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(250, 500) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(500, 600) })
          .expect(200);
      }
    });

    it('project monitors - fetches all monitors - http', async () => {
      const monitors = [];
      const project = 'test-http-suite';
      for (let i = 0; i < 600; i++) {
        monitors.push({
          ...httpProjectMonitors.monitors[1],
          id: `test http id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(0, 250),
          })
          .expect(200);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(250, 500),
          })
          .expect(200);
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(500, 600),
          })
          .expect(200);

        const firstPageResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({ per_page: 500 })
          .send()
          .expect(200);

        const {
          monitors: firstPageProjectMonitors,
          after_key: afterKey,
          total,
        } = firstPageResponse.body;
        expect(firstPageProjectMonitors.length).to.eql(500);
        expect(total).to.eql(600);
        expect(afterKey).to.eql('test http id 548');

        const secondPageResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            search_after: afterKey,
            per_page: 500,
          })
          .send()
          .expect(200);
        const { monitors: secondPageProjectMonitors } = secondPageResponse.body;
        expect(secondPageProjectMonitors.length).to.eql(100);
        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(0, 250) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(250, 500) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(500, 600) })
          .expect(200);
      }
    });

    it('project monitors - fetches all monitors - tcp', async () => {
      const monitors = [];
      const project = 'test-tcp-suite';
      for (let i = 0; i < 600; i++) {
        monitors.push({
          ...tcpProjectMonitors.monitors[0],
          id: `test tcp id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(0, 250),
          })
          .expect(200);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(250, 500),
          })
          .expect(200);
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(500, 600),
          })
          .expect(200);

        const firstPageResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
          .set(editorUser.apiKeyHeader)
          .query({ per_page: 500 })
          .set(samlAuth.getInternalRequestHeader())
          .send()
          .expect(200);

        const {
          monitors: firstPageProjectMonitors,
          after_key: afterKey,
          total,
        } = firstPageResponse.body;
        expect(firstPageProjectMonitors.length).to.eql(500);
        expect(total).to.eql(600);
        expect(afterKey).to.eql('test tcp id 548');

        const secondPageResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            search_after: afterKey,
            per_page: 500,
          })
          .send()
          .expect(200);
        const { monitors: secondPageProjectMonitors } = secondPageResponse.body;
        expect(secondPageProjectMonitors.length).to.eql(100);
        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(0, 250) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(250, 500) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(500, 600) })
          .expect(200);
      }
    });

    it('project monitors - fetches all monitors - icmp', async () => {
      const monitors = [];
      const project = 'test-icmp-suite';
      for (let i = 0; i < 600; i++) {
        monitors.push({
          ...icmpProjectMonitors.monitors[0],
          id: `test icmp id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(0, 250),
          })
          .expect(200);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(250, 500),
          })
          .expect(200);
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(500, 600),
          })
          .expect(200);
        const firstPageResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
          .set(editorUser.apiKeyHeader)
          .query({ per_page: 500 })
          .set(samlAuth.getInternalRequestHeader())
          .send()
          .expect(200);

        const {
          monitors: firstPageProjectMonitors,
          after_key: afterKey,
          total,
        } = firstPageResponse.body;
        expect(firstPageProjectMonitors.length).to.eql(500);
        expect(total).to.eql(600);
        expect(afterKey).to.eql('test icmp id 548');

        const secondPageResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            search_after: afterKey,
            per_page: 500,
          })
          .send()
          .expect(200);
        const { monitors: secondPageProjectMonitors } = secondPageResponse.body;
        expect(secondPageProjectMonitors.length).to.eql(100);

        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(0, 250) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(250, 500) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(500, 600) })
          .expect(200);
      }
    });

    it('project monitors - handles url ecoded project names', async () => {
      const monitors = [];
      const projectName = 'Test project';
      for (let i = 0; i < 600; i++) {
        monitors.push({
          ...icmpProjectMonitors.monitors[0],
          id: `test url id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              projectName
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(0, 250),
          })
          .expect(200);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              projectName
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(250, 500),
          })
          .expect(200);
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              projectName
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(500, 600),
          })
          .expect(200);

        const firstPageResponse = await supertest
          .get(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace(
              '{projectName}',
              encodeURI(projectName)
            )
          )
          .query({ per_page: 500 })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send()
          .expect(200);

        const {
          monitors: firstPageProjectMonitors,
          after_key: afterKey,
          total,
        } = firstPageResponse.body;
        expect(firstPageProjectMonitors.length).to.eql(500);
        expect(total).to.eql(600);
        expect(afterKey).to.eql('test url id 548');

        const secondPageResponse = await supertest
          .get(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace(
              '{projectName}',
              encodeURI(projectName)
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            search_after: afterKey,
            per_page: 500,
          })
          .send()
          .expect(200);
        const { monitors: secondPageProjectMonitors } = secondPageResponse.body;
        expect(secondPageProjectMonitors.length).to.eql(100);

        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace(
              '{projectName}',
              encodeURI(projectName)
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(0, 250) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace(
              '{projectName}',
              encodeURI(projectName)
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(250, 500) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace(
              '{projectName}',
              encodeURI(projectName)
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(500, 600) })
          .expect(200);
      }
    });

    it('project monitors - handles per_page parameter', async () => {
      const monitors = [];
      const project = 'test-suite';
      const perPage = 250;
      for (let i = 0; i < 600; i++) {
        monitors.push({
          ...icmpProjectMonitors.monitors[0],
          id: `test-id-${i}`,
          name: `test-name-${i}`,
        });
      }

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(0, 250),
          })
          .expect(200);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(250, 500),
          })
          .expect(200);
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: monitors.slice(500, 600),
          })
          .expect(200);

        let count = Number.MAX_VALUE;
        let afterId;
        const fullResponse: ProjectMonitorMetaData[] = [];
        let page = 1;
        while (count >= 250) {
          const response: SuperTest.Response = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .query({
              per_page: perPage,
              search_after: afterId,
            })
            .send()
            .expect(200);

          const { monitors: monitorsResponse, after_key: afterKey, total } = response.body;
          expect(total).to.eql(600);
          count = monitorsResponse.length;
          fullResponse.push(...monitorsResponse);
          if (page < 3) {
            expect(count).to.eql(perPage);
          } else {
            expect(count).to.eql(100);
          }
          page++;

          afterId = afterKey;
        }
        // expect(fullResponse.length).to.eql(600);
        // checkFields(fullResponse, monitors);
      } finally {
        const monitorsToDelete = monitors.map((monitor) => monitor.id);

        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(0, 250) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(250, 500) })
          .expect(200);
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: monitorsToDelete.slice(500, 600) })
          .expect(200);
      }
    });
  });
}

const checkFields = (monitorMetaData: ProjectMonitorMetaData[], monitors: ProjectMonitor[]) => {
  monitors.forEach((monitor) => {
    const configIsCorrect = monitorMetaData.some((ndjson: Record<string, unknown>) => {
      return ndjson.journey_id === monitor.id && ndjson.hash === monitor.hash;
    });
    expect(configIsCorrect).to.eql(true);
  });
};
