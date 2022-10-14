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
  ProjectMonitorsRequest,
  ProjectMonitor,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { parseStreamApiResponse } from './add_monitor_project';

export default function ({ getService }: FtrProviderContext) {
  describe('GetProjectMonitors', function () {
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

    it('project monitors - handles browser monitors', async () => {
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
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        const firstPageResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const firstPageProjectMonitors = firstPageResponse.text.split(`\n`);
        expect(firstPageProjectMonitors.length).to.eql(500);
        const afterId = JSON.parse(
          firstPageProjectMonitors[firstPageProjectMonitors.length - 1]
        ).afterKey.join(',');

        const secondPageResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .query({
            after_id: afterId,
          })
          .send()
          .expect(200);
        const secondPageProjectMonitors = secondPageResponse.text.split(`\n`);
        expect(secondPageProjectMonitors.length).to.eql(100);
        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
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
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        const firstPageResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const firstPageProjectMonitors = firstPageResponse.text.split(`\n`);
        expect(firstPageProjectMonitors.length).to.eql(500);
        const afterId = JSON.parse(
          firstPageProjectMonitors[firstPageProjectMonitors.length - 1]
        ).afterKey.join(',');

        const secondPageResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .query({
            after_id: afterId,
          })
          .send()
          .expect(200);
        const secondPageProjectMonitors = secondPageResponse.text.split(`\n`);
        expect(secondPageProjectMonitors.length).to.eql(100);
        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
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
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        const firstPageResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const firstPageProjectMonitors = firstPageResponse.text.split(`\n`);
        expect(firstPageProjectMonitors.length).to.eql(500);
        const afterId = JSON.parse(
          firstPageProjectMonitors[firstPageProjectMonitors.length - 1]
        ).afterKey.join(',');

        const secondPageResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .query({
            after_id: afterId,
          })
          .send()
          .expect(200);
        const secondPageProjectMonitors = secondPageResponse.text.split(`\n`);
        expect(secondPageProjectMonitors.length).to.eql(100);
        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
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
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project,
            monitors,
          })
        );

        const firstPageResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const firstPageProjectMonitors = firstPageResponse.text.split(`\n`);
        expect(firstPageProjectMonitors.length).to.eql(500);
        const afterId = JSON.parse(
          firstPageProjectMonitors[firstPageProjectMonitors.length - 1]
        ).afterKey.join(',');

        const secondPageResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .query({
            after_id: afterId,
          })
          .send()
          .expect(200);
        const secondPageProjectMonitors = secondPageResponse.text.split(`\n`);
        expect(secondPageProjectMonitors.length).to.eql(100);

        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
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
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project: projectName,
            keep_stale: false,
            monitors,
          })
        );

        const firstPageResponse = await supertest
          .get(
            API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace(
              '{projectName}',
              encodeURI(projectName)
            )
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const firstPageProjectMonitors = firstPageResponse.text.split(`\n`);
        expect(firstPageProjectMonitors.length).to.eql(500);
        const afterId = JSON.parse(
          firstPageProjectMonitors[firstPageProjectMonitors.length - 1]
        ).afterKey.join(',');

        const secondPageResponse = await supertest
          .get(
            API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace(
              '{projectName}',
              encodeURI(projectName)
            )
          )
          .set('kbn-xsrf', 'true')
          .query({
            after_id: afterId,
          })
          .send()
          .expect(200);
        const secondPageProjectMonitors = secondPageResponse.text.split(`\n`);
        expect(secondPageProjectMonitors.length).to.eql(100);

        checkFields([...firstPageProjectMonitors, ...secondPageProjectMonitors], monitors);
      } finally {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            project: projectName,
            keep_stale: false,
            monitors: [],
          })
        );
      }
    });

    it('project monitors - handles size parameter', async () => {
      const monitors = [];
      const size = 250;
      for (let i = 0; i < 600; i++) {
        monitors.push({
          ...icmpProjectMonitors.monitors[0],
          id: `test-id-${i}`,
          name: `test-name-${i}`,
        });
      }

      try {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            monitors,
          })
        );
        let count = Number.MAX_VALUE;
        let afterId;
        let response;
        let monitorResponse;
        const fullResponse: string[] = [];
        let page = 1;
        while (count >= 250) {
          response = await supertest
            .get(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY.replace('{projectName}', 'test-suite'))
            .set('kbn-xsrf', 'true')
            .query({
              size,
              after_id: afterId,
            })
            .send()
            .expect(200);

          monitorResponse = response.text.split('\n') as string[];
          count = monitorResponse.length;
          fullResponse.push(...monitorResponse);
          if (page < 3) {
            expect(count).to.eql(size);
          } else {
            expect(count).to.eql(100);
          }
          page++;

          afterId = JSON.parse(monitorResponse[monitorResponse.length - 1]).afterKey.join(',');
        }
        expect(fullResponse.length).to.eql(600);
        checkFields(fullResponse, monitors);
      } finally {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
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
