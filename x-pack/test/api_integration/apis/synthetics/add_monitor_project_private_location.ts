/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  // FLAKY: https://github.com/elastic/kibana/issues/160277
  describe.skip('AddProjectMonitorsPrivateLocations', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    let projectMonitors: ProjectMonitorsRequest;

    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let testPolicyId = '';
    const testPolicyName = 'Fleet test server policy' + Date.now();
    const testPrivateLocations = new PrivateLocationTestService(getService);

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuidv4() })),
      };
    };

    before(async () => {
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);
      await testPrivateLocations.installSyntheticsPackage();

      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      await testPrivateLocations.setTestLocations([testPolicyId]);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(() => {
      projectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_browser_monitor').monitors,
      });
    });

    it('project monitors - returns a failed monitor when creating integration fails', async () => {
      const project = `test-project-${uuidv4()}`;

      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 7'],
      };
      const testMonitors = [
        projectMonitors.monitors[0],
        {
          ...secondMonitor,
          name: '!@#$%^&*()_++[\\-\\]- wow name',
        },
      ];
      try {
        const { body, status } = await monitorTestService.addProjectMonitors(project, testMonitors);
        expect(status).eql(200);
        expect(body.createdMonitors.length).eql(1);
        expect(body.failedMonitors[0].reason).eql(
          "Couldn't save or update monitor because of an invalid configuration."
        );
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return monitorTestService.deleteMonitorByJourney(projectMonitors, monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - returns a failed monitor when editing integration fails', async () => {
      const project = `test-project-${uuidv4()}`;

      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 0'],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const { body, status: status0 } = await monitorTestService.addProjectMonitors(
        project,
        testMonitors
      );
      expect(status0).eql(200);

      expect(body.createdMonitors.length).eql(2);
      const { body: editedBody, status: editedStatus } =
        await monitorTestService.addProjectMonitors(project, testMonitors);
      expect(editedStatus).eql(200);

      expect(editedBody.createdMonitors.length).eql(0);
      expect(editedBody.updatedMonitors.length).eql(2);

      testMonitors[1].name = '!@#$%^&*()_++[\\-\\]- wow name';
      testMonitors[1].privateLocations = ['Test private location 8'];

      const { body: editedBodyError, status } = await monitorTestService.addProjectMonitors(
        project,
        testMonitors
      );
      expect(status).eql(200);
      expect(editedBodyError.createdMonitors.length).eql(0);
      expect(editedBodyError.updatedMonitors.length).eql(1);
      expect(editedBodyError.failedMonitors.length).eql(1);
      expect(editedBodyError.failedMonitors[0].details).eql(
        `Invalid locations specified. Private Location(s) 'Test private location 8' not found. Available private locations are 'Test private location 0'`
      );
      expect(editedBodyError.failedMonitors[0].reason).eql(
        "Couldn't save or update monitor because of an invalid configuration."
      );
    });
  });
}
