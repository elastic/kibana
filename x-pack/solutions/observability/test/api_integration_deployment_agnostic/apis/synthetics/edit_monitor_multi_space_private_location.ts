/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { getFixtureJson } from './helpers/get_fixture_json';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const spaces = getService('spaces');
  const samlAuth = getService('samlAuth');
  const testPrivateLocations = new PrivateLocationTestService(getService);
  const kibanaServer = getService('kibanaServer');

  describe('editMonitorMultiSpacePrivateLocation', function () {
    // skip cloud until the fix commit is sent to serverless
    this.tags(['skipCloud']);
    let privateLocations: PrivateLocation[];
    let monitorId: string;
    let superuser: RoleCredentials;
    let httpMonitorJson: HTTPFields;
    const space1 = `space-1-${uuidv4()}`;
    const space2 = `space-2-${uuidv4()}`;

    before(async () => {
      superuser = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      httpMonitorJson = getFixtureJson('http_monitor');
      await kibanaServer.savedObjects.cleanStandardList();
      await spaces.create({
        id: space1,
        name: 'Space 1',
      });
      await spaces.create({
        id: space2,
        name: 'Space 2',
      });
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      const testPolicyName = `Test Private Location Policy ${uuidv4()}`;
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      const testPolicyId = apiResponse.body.item.id;
      privateLocations = await testPrivateLocations.setTestLocations(
        [testPolicyId],
        [space1, space2]
      );
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await spaces.delete(space1);
      await spaces.delete(space2);
    });

    it('should not create a new package policy when editing a multi-space monitor from a different space', async () => {
      const monitor = {
        ...httpMonitorJson,
        locations: [privateLocations[0]],
        spaces: [space1, space2],
      };

      // Create monitor in space1, but make it available in space2 as well
      const createResponse = await supertest
        .post(`/s/${space1}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(superuser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitor);

      monitorId = createResponse.body.id;

      const { body: allPoliciesAfterCreate } = await supertest
        .get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        )
        .set(superuser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(allPoliciesAfterCreate.total).to.be(1);
      expect(
        allPoliciesAfterCreate.items[0].inputs.find((i: any) => i.type === 'synthetics/http')
          .streams[0].compiled_stream.id
      ).to.be(monitorId);

      // Edit the monitor from space2
      const updatedMonitor = { ...monitor, name: 'Updated Monitor Name' };
      const updatedMonitorResponse = await supertest
        .put(`/s/${space2}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitorId}?internal=true`)
        .set(superuser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(updatedMonitor)
        .expect(200);

      // Query all synthetics package policies
      const { body: allPolicies } = await supertest
        .get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        )
        .set(superuser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(allPolicies.total).to.be(1);

      // Check that the original package policy was updated
      const originalPolicyId = `${monitorId}-${privateLocations[0].id}-${space1}`;
      const updatedPolicy = allPolicies.items.find((p: PackagePolicy) => p.id === originalPolicyId);
      expect(updatedPolicy).to.not.be(undefined);
      expect(updatedPolicy.name).to.contain('Updated Monitor Name');

      // Check that a new package policy was NOT created in space2
      const newPolicyId = `${monitorId}-${privateLocations[0].id}-${space2}`;
      const newPolicy = allPolicies.items.find((p: PackagePolicy) => p.id === newPolicyId);
      expect(newPolicy).to.be(undefined);
    });

    it('should update the original policy when the original space is removed', async () => {
      const monitor = {
        ...httpMonitorJson,
        locations: [privateLocations[0]],
        spaces: [space1, space2],
      };

      // Create monitor in space1, shared with space2
      const createResponse = await supertest
        .post(`/s/${space1}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(superuser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitor);
      monitorId = createResponse.body.id;

      // Edit the monitor from space2, removing space1
      const updatedMonitor = { ...monitor, name: 'Updated and Space Removed', spaces: [space2] };
      await supertest
        .put(`/s/${space2}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitorId}?internal=true`)
        .set(superuser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(updatedMonitor)
        .expect(200);

      const updatedMonitor2 = { ...monitor, name: 'Updated and Space Removed', spaces: [space2] };
      await supertest
        .put(`/s/${space2}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitorId}?internal=true`)
        .set(superuser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(updatedMonitor2)
        .expect(200);

      // Query all synthetics package policies
      const { body: allPolicies } = await supertest
        .get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        )
        .set(superuser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      // There should still be only one policy
      expect(allPolicies.total).to.be(1);

      // The original policy should be the one that was updated
      const originalPolicyId = `${monitorId}-${privateLocations[0].id}-${space1}`;
      const updatedPolicy = allPolicies.items.find((p: PackagePolicy) => p.id === originalPolicyId);
      expect(updatedPolicy).to.not.be(undefined);
      expect(updatedPolicy.name).to.contain('Updated and Space Removed');

      // No new policy should have been created
      const newPolicyId = `${monitorId}-${privateLocations[0].id}-${space2}`;
      const newPolicy = allPolicies.items.find((p: PackagePolicy) => p.id === newPolicyId);
      expect(newPolicy).to.be(undefined);
    });
  });
}
