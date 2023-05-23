/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('AddProjectMonitorsPrivateLocations', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');

    let projectMonitors: ProjectMonitorsRequest;

    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let testPolicyId = '';
    const testPrivateLocations = new PrivateLocationTestService(getService);

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuidv4() })),
      };
    };

    before(async () => {
      await supertest.put(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true').expect(200);
      await testPrivateLocations.installSyntheticsPackage();

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      await testPrivateLocations.setTestLocations([testPolicyId]);
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
        privateLocations: ['Test private location 0'],
      };
      const testMonitors = [
        projectMonitors.monitors[0],
        { ...secondMonitor, name: '[] - invalid name' },
      ];
      try {
        const body = await monitorTestService.addProjectMonitors(project, testMonitors);
        expect(body.createdMonitors.length).eql(1);
        expect(body.failedMonitors[0].reason).eql(
          'end of the stream or a document separator is expected at line 3, column 10:\n    name: [] - invalid name\n             ^'
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
      try {
        const body = await monitorTestService.addProjectMonitors(project, testMonitors);
        expect(body.createdMonitors.length).eql(2);
        const editedBody = await monitorTestService.addProjectMonitors(project, testMonitors);
        expect(editedBody.createdMonitors.length).eql(0);
        expect(editedBody.updatedMonitors.length).eql(2);

        testMonitors[1].name = '[] - invalid name';

        const editedBodyError = await monitorTestService.addProjectMonitors(project, testMonitors);
        expect(editedBodyError.createdMonitors.length).eql(0);
        expect(editedBodyError.updatedMonitors.length).eql(1);
        expect(editedBodyError.failedMonitors.length).eql(1);
        expect(editedBodyError.failedMonitors[0].details).eql(
          'Failed to update journey: test-id-2'
        );
        expect(editedBodyError.failedMonitors[0].reason).eql(
          'end of the stream or a document separator is expected at line 3, column 10:\n    name: [] - invalid name\n             ^'
        );
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return monitorTestService.deleteMonitorByJourney(projectMonitors, monitor.id, project);
          }),
        ]);
      }
    });
  });
}
