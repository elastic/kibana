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
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { addMonitorAPIHelper, omitMonitorKeys } from './create_monitor';
import { SupertestWithRoleScopeType } from '../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('EditPrivateLocation', function () {
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
    const NEW_LOCATION_LABEL = 'Barcelona';
    const NEW_TAGS = ['myAwesomeTag'];

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

    it('successfully edits a private location label with no monitors assigned', async () => {
      const privateLocation = privateLocations[0];

      await supertestEditorWithApiKey
        .put(`${SYNTHETICS_API_URLS.PRIVATE_LOCATIONS}/${privateLocation.id}`)
        .send({ label: 'No monitors assigned' })
        .expect(200);

      // Set the label back, needed for the other tests
      await supertestEditorWithApiKey
        .put(`${SYNTHETICS_API_URLS.PRIVATE_LOCATIONS}/${privateLocation.id}`)
        .send({ label: privateLocations[0].label })
        .expect(200);
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
    });

    it('successfully edits a private location label', async () => {
      const privateLocation = privateLocations[0];

      // Edit the private location
      const editResponse = await supertestEditorWithApiKey
        .put(`${SYNTHETICS_API_URLS.PRIVATE_LOCATIONS}/${privateLocation.id}`)
        .send({ label: NEW_LOCATION_LABEL, tags: NEW_TAGS })
        .expect(200);

      // Verify the response contains the updated label
      expect(editResponse.body.label).to.be(NEW_LOCATION_LABEL);
      expect(editResponse.body.tags).to.eql(NEW_TAGS);
      expect(editResponse.body.id).to.be(privateLocation.id);
      expect(editResponse.body.agentPolicyId).to.be(privateLocation.agentPolicyId);

      // Verify the location was actually updated by getting it
      const getResponse = await supertestEditorWithApiKey
        .get(`${SYNTHETICS_API_URLS.PRIVATE_LOCATIONS}/${privateLocation.id}`)
        .expect(200);

      expect(getResponse.body.label).to.be(NEW_LOCATION_LABEL);
    });

    it('verifies that monitor location label is updated when the private location label changes', async () => {
      // Get the monitor with the updated location label
      const getMonitorResponse = await supertestEditorWithApiKey
        .get(`${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${newMonitor.id}`)
        .expect(200);

      // Verify the monitor's location has the updated label
      const monitor = getMonitorResponse.body;
      expect(monitor.locations).to.have.length(1);
      expect(monitor.locations[0].id).to.be(privateLocations[0].id);
      expect(monitor.locations[0].label).to.be(NEW_LOCATION_LABEL);
    });

    it('verifies that package policies are updated when the private location label changes', async () => {
      const apiResponse = await supertestEditorWithApiKey.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy: PackagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitor.id + '-' + testFleetPolicyID + '-default'
      );
      expect(packagePolicy.name).to.contain(NEW_LOCATION_LABEL);
    });

    it('returns 404 when trying to edit a non-existent private location', async () => {
      const nonExistentId = 'non-existent-id';

      const response = await supertestEditorWithApiKey
        .put(`${SYNTHETICS_API_URLS.PRIVATE_LOCATIONS}/${nonExistentId}`)
        .send({ label: NEW_LOCATION_LABEL })
        .expect(404);

      expect(response.body.message).to.contain(
        `Private location with id ${nonExistentId} does not exist.`
      );
    });

    it('returns 400 when trying to edit with an empty label', async () => {
      const response = await supertestEditorWithApiKey
        .put(`${SYNTHETICS_API_URLS.PRIVATE_LOCATIONS}/${privateLocations[0].id}`)
        .send({ label: '' })
        .expect(400);

      expect(response.body.message).to.contain(
        '[request body.label]: value has length [0] but it must have a minimum length of [1].'
      );
    });
  });
}
