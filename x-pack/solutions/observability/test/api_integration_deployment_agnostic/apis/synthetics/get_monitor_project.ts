/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type SuperTest from 'supertest';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type {
  LegacyProjectMonitorsRequest,
  ProjectMonitor,
  ProjectMonitorMetaData,
  PrivateLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('GetProjectMonitors', function () {
    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    const retry = getService('retry');

    const TOTAL_MONITORS = 30;
    const PER_PAGE = 20;

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
          locations: [],
          privateLocations: privateLocations.map((location) => location.label),
        })),
      };
    };

    const createProjectMonitors = async (monitors: ProjectMonitor[], project: string) => {
      await supertest
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ monitors })
        .expect(200);
    };

    const deleteProjectMonitors = async (monitorIds: string[], project: string) => {
      await supertest
        .delete(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ monitors: monitorIds });
    };

    before(async () => {
      await testPrivateLocationsService.installSyntheticsPackage();

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocationsService.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      testPrivateLocations = await testPrivateLocationsService.setTestLocations([testPolicyId]);
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({ types: ['synthetics-monitor-multi-space'] });
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
      const monitors: ProjectMonitor[] = [];
      const project = 'test-brower-suite';
      for (let i = 0; i < TOTAL_MONITORS; i++) {
        monitors.push({
          ...projectMonitors.monitors[0],
          id: `test browser id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await createProjectMonitors(monitors, project);

        await retry.try(async () => {
          const firstPageResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .query({ per_page: PER_PAGE })
            .send()
            .expect(200);

          const {
            monitors: firstPageMonitors,
            total,
            after_key: afterKey,
          } = firstPageResponse.body;
          expect(firstPageMonitors.length).to.eql(PER_PAGE);
          expect(total).to.eql(TOTAL_MONITORS);
          expect(afterKey).to.be.a('string');

          const secondPageResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .query({
              search_after: afterKey,
              per_page: PER_PAGE,
            })
            .send()
            .expect(200);
          const { monitors: secondPageMonitors } = secondPageResponse.body;
          expect(secondPageMonitors.length).to.eql(TOTAL_MONITORS - PER_PAGE);
          checkFields([...firstPageMonitors, ...secondPageMonitors], monitors);
        });
      } finally {
        try {
          await deleteProjectMonitors(
            monitors.map((m) => m.id),
            project
          );
        } catch (e) {
          // best-effort cleanup; beforeEach will handle leftovers
        }
      }
    });

    it('project monitors - fetches all monitors - http', async () => {
      const monitors: ProjectMonitor[] = [];
      const project = 'test-http-suite';
      for (let i = 0; i < TOTAL_MONITORS; i++) {
        monitors.push({
          ...httpProjectMonitors.monitors[1],
          id: `test http id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await createProjectMonitors(monitors, project);

        await retry.try(async () => {
          const firstPageResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .query({ per_page: PER_PAGE })
            .send()
            .expect(200);

          const {
            monitors: firstPageProjectMonitors,
            after_key: afterKey,
            total,
          } = firstPageResponse.body;
          expect(firstPageProjectMonitors.length).to.eql(PER_PAGE);
          expect(total).to.eql(TOTAL_MONITORS);
          expect(afterKey).to.be.a('string');

          const secondPageResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .query({
              search_after: afterKey,
              per_page: PER_PAGE,
            })
            .send()
            .expect(200);
          const { monitors: secondPageProjectMonitors } = secondPageResponse.body;
          expect(secondPageProjectMonitors.length).to.eql(TOTAL_MONITORS - PER_PAGE);
          checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
        });
      } finally {
        try {
          await deleteProjectMonitors(
            monitors.map((m) => m.id),
            project
          );
        } catch (e) {
          // best-effort cleanup; beforeEach will handle leftovers
        }
      }
    });

    it('project monitors - fetches all monitors - tcp', async () => {
      const monitors: ProjectMonitor[] = [];
      const project = 'test-tcp-suite';
      for (let i = 0; i < TOTAL_MONITORS; i++) {
        monitors.push({
          ...tcpProjectMonitors.monitors[0],
          id: `test tcp id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await createProjectMonitors(monitors, project);

        await retry.try(async () => {
          const firstPageResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .query({ per_page: PER_PAGE })
            .set(samlAuth.getInternalRequestHeader())
            .send()
            .expect(200);

          const {
            monitors: firstPageProjectMonitors,
            after_key: afterKey,
            total,
          } = firstPageResponse.body;
          expect(firstPageProjectMonitors.length).to.eql(PER_PAGE);
          expect(total).to.eql(TOTAL_MONITORS);
          expect(afterKey).to.be.a('string');

          const secondPageResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .query({
              search_after: afterKey,
              per_page: PER_PAGE,
            })
            .send()
            .expect(200);
          const { monitors: secondPageProjectMonitors } = secondPageResponse.body;
          expect(secondPageProjectMonitors.length).to.eql(TOTAL_MONITORS - PER_PAGE);
          checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
        });
      } finally {
        try {
          await deleteProjectMonitors(
            monitors.map((m) => m.id),
            project
          );
        } catch (e) {
          // best-effort cleanup; beforeEach will handle leftovers
        }
      }
    });

    it('project monitors - fetches all monitors - icmp', async () => {
      const monitors: ProjectMonitor[] = [];
      const project = 'test-icmp-suite';
      for (let i = 0; i < TOTAL_MONITORS; i++) {
        monitors.push({
          ...icmpProjectMonitors.monitors[0],
          id: `test icmp id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await createProjectMonitors(monitors, project);

        await retry.try(async () => {
          const firstPageResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .query({ per_page: PER_PAGE })
            .set(samlAuth.getInternalRequestHeader())
            .send()
            .expect(200);

          const {
            monitors: firstPageProjectMonitors,
            after_key: afterKey,
            total,
          } = firstPageResponse.body;
          expect(firstPageProjectMonitors.length).to.eql(PER_PAGE);
          expect(total).to.eql(TOTAL_MONITORS);
          expect(afterKey).to.be.a('string');

          const secondPageResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project))
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .query({
              search_after: afterKey,
              per_page: PER_PAGE,
            })
            .send()
            .expect(200);
          const { monitors: secondPageProjectMonitors } = secondPageResponse.body;
          expect(secondPageProjectMonitors.length).to.eql(TOTAL_MONITORS - PER_PAGE);

          checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
        });
      } finally {
        try {
          await deleteProjectMonitors(
            monitors.map((m) => m.id),
            project
          );
        } catch (e) {
          // best-effort cleanup; beforeEach will handle leftovers
        }
      }
    });

    it('project monitors - handles url ecoded project names', async () => {
      const monitors: ProjectMonitor[] = [];
      const projectName = 'Test project';
      for (let i = 0; i < TOTAL_MONITORS; i++) {
        monitors.push({
          ...icmpProjectMonitors.monitors[0],
          id: `test url id ${i}`,
          name: `test name ${i}`,
        });
      }

      try {
        await createProjectMonitors(monitors, projectName);

        await retry.try(async () => {
          const firstPageResponse = await supertest
            .get(
              SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace(
                '{projectName}',
                encodeURI(projectName)
              )
            )
            .query({ per_page: PER_PAGE })
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .send()
            .expect(200);

          const {
            monitors: firstPageProjectMonitors,
            after_key: afterKey,
            total,
          } = firstPageResponse.body;
          expect(firstPageProjectMonitors.length).to.eql(PER_PAGE);
          expect(total).to.eql(TOTAL_MONITORS);
          expect(afterKey).to.be.a('string');

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
              per_page: PER_PAGE,
            })
            .send()
            .expect(200);
          const { monitors: secondPageProjectMonitors } = secondPageResponse.body;
          expect(secondPageProjectMonitors.length).to.eql(TOTAL_MONITORS - PER_PAGE);

          checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
        });
      } finally {
        try {
          await deleteProjectMonitors(
            monitors.map((m) => m.id),
            encodeURI(projectName)
          );
        } catch (e) {
          // best-effort cleanup; beforeEach will handle leftovers
        }
      }
    });

    it('project monitors - handles per_page parameter', async () => {
      const monitors: ProjectMonitor[] = [];
      const project = 'test-suite';
      const perPage = 10;
      const totalMonitors = 25; // not evenly divisible by perPage so the last page is partial
      for (let i = 0; i < totalMonitors; i++) {
        monitors.push({
          ...icmpProjectMonitors.monitors[0],
          id: `test-id-${i}`,
          name: `test-name-${i}`,
        });
      }

      try {
        await createProjectMonitors(monitors, project);

        await retry.try(async () => {
          let afterId;
          const fullResponse: ProjectMonitorMetaData[] = [];
          let page = 1;
          let count: number;
          do {
            const response: SuperTest.Response = await supertest
              .get(
                SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT.replace('{projectName}', project)
              )
              .set(editorUser.apiKeyHeader)
              .set(samlAuth.getInternalRequestHeader())
              .query({
                per_page: perPage,
                search_after: afterId,
              })
              .send()
              .expect(200);

            const { monitors: monitorsResponse, after_key: afterKey, total } = response.body;
            expect(total).to.eql(totalMonitors);
            count = monitorsResponse.length;
            fullResponse.push(...monitorsResponse);
            if (page < 3) {
              expect(count).to.eql(perPage);
            } else {
              expect(count).to.eql(totalMonitors - perPage * 2);
            }
            page++;

            afterId = afterKey;
          } while (count === perPage);
          expect(fullResponse.length).to.eql(totalMonitors);
          checkFields(fullResponse, monitors);
        });
      } finally {
        try {
          await deleteProjectMonitors(
            monitors.map((m) => m.id),
            project
          );
        } catch (e) {
          // best-effort cleanup; beforeEach will handle leftovers
        }
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
