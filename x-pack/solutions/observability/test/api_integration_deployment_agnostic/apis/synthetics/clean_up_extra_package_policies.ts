/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { HTTPFields, PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import expect from '@kbn/expect';
import { syntheticsMonitorSavedObjectType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('CleanUpExtraPackagePolicies', function () {
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    const retry = getService('retry');

    let editorUser: RoleCredentials;
    let privateLocation: PrivateLocation | undefined;
    let newMonitorId: string;
    let secondMonitorId: string;

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const testPrivateLocations = new PrivateLocationTestService(getService);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = {
        ..._httpMonitorJson,
        locations: privateLocation ? [privateLocation] : [],
      };
    });

    it('add test monitors', async () => {
      privateLocation = await testPrivateLocations.addTestPrivateLocation();
      const newMonitor = {
        ...httpMonitorJson,
        locations: [privateLocation],
      };
      const resp = await monitorTestService.createMonitor(newMonitor, editorUser);
      newMonitorId = resp.id;
      const items = await testPrivateLocations.getPackagePolicies();
      expect(items.length).eql(1);

      secondMonitorId = (
        await monitorTestService.createMonitor(
          {
            ...httpMonitorJson,
            name: 'second-monitor',
            locations: [privateLocation],
          },
          editorUser
        )
      ).id;
      expect((await testPrivateLocations.getPackagePolicies()).length).eql(2);
    });

    it('it cleans up the extra package policy', async () => {
      // only delete the saved object to make policy orphaned
      await kibanaServer.savedObjects.delete({
        type: syntheticsMonitorSavedObjectType,
        id: newMonitorId,
      });

      await monitorTestService.testNowMonitor(secondMonitorId, editorUser);

      expect((await testPrivateLocations.getPackagePolicies()).length).eql(3);

      // trigger cleanup endpoint
      await monitorTestService.triggerCleanup(editorUser);

      await retry.try(async () => {
        const items = await testPrivateLocations.getPackagePolicies();
        // 2 is for the temporary policy, which is created by the test now run
        expect(items.length).eql(2);
        const names = items.map((item) => item.name);
        expect(names.includes('LIGHTWEIGHT_SYNTHETICS_TEST_NOW_RUN')).eql(true);
        expect(
          names.filter((name) => name.includes('second-monitor-Test private location')).length
        ).eql(1);
      });
    });
  });
}
