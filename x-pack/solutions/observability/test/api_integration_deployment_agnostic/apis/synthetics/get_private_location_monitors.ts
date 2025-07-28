/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { PrivateLocation, ServiceLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import rawExpect from 'expect';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { addMonitorAPIHelper, omitMonitorKeys } from './create_monitor';
import { SupertestWithRoleScopeType } from '../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('GetPrivateLocationMonitors', function () {
    const kibanaServer = getService('kibanaServer');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const samlAuth = getService('samlAuth');
    const roleScopedSupertest = getService('roleScopedSupertest');
    let supertestEditorWithApiKey: SupertestWithRoleScopeType;

    let testFleetPolicyID: string;
    let editorUser: RoleCredentials;
    let privateLocations: PrivateLocation[] = [];
    const testPolicyName = 'Fleet test server policy' + Date.now();

    let newMonitor: { id: string; name: string };
    const testPrivateLocations = new PrivateLocationTestService(getService);

    before(async () => {
      supertestEditorWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('editor', {
        withInternalHeaders: true,
      });

      await kibanaServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    after(async () => {
      await supertestEditorWithApiKey.destroy();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(editorUser);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('adds a test fleet policy', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testFleetPolicyID = apiResponse.body.item.id;
    });

    it('add a test private location', async () => {
      privateLocations = await testPrivateLocations.setTestLocations([testFleetPolicyID]);

      const apiResponse = await supertestEditorWithApiKey
        .get(SYNTHETICS_API_URLS.SERVICE_LOCATIONS)
        .expect(200);

      const testResponse: Array<PrivateLocation | ServiceLocation> = [
        {
          id: testFleetPolicyID,
          isServiceManaged: false,
          isInvalid: false,
          label: privateLocations[0].label,
          geo: {
            lat: 0,
            lon: 0,
          },
          agentPolicyId: testFleetPolicyID,
          spaces: ['default'],
        },
      ];

      rawExpect(apiResponse.body.locations).toEqual(rawExpect.arrayContaining(testResponse));
    });

    it('adds a monitor in private location', async () => {
      newMonitor = {
        ...getFixtureJson('http_monitor'),
        namespace: 'default',
        locations: [privateLocations[0]],
      };

      const { body, rawBody } = await addMonitorAPIHelper(
        supertestWithoutAuth,
        newMonitor,
        200,
        editorUser,
        samlAuth
      );
      expect(body).eql(omitMonitorKeys(newMonitor));
      newMonitor.id = rawBody.id;
      newMonitor = {
        ...getFixtureJson('http_monitor'),
        namespace: 'default',
        locations: [privateLocations[0]],
        name: 'Monitor in private location',
      };

      // add a legacy monitor
      const resp = await addMonitorAPIHelper(
        supertestWithoutAuth,
        newMonitor,
        200,
        editorUser,
        samlAuth,
        undefined,
        'synthetics-monitor'
      );
      expect(resp.body).eql(omitMonitorKeys(newMonitor));
    });

    it('returns monitors for private location', async () => {
      const apiResponse = await supertestEditorWithApiKey
        .get(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_MONITORS)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(apiResponse.body).to.eql([{ id: privateLocations[0].id, count: 2 }]);
    });
  });
}
