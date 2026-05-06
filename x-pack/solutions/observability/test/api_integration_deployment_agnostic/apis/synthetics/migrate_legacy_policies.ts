/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { PrivateLocation, HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getFixtureJson } from './helpers/get_fixture_json';
import {
  PrivateLocationTestService,
  cleanSyntheticsTestData,
} from '../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';

/**
 * Tests for migrating legacy package policies (with spaceId suffix) to the new format (without spaceId).
 *
 * Legacy format: `${monitorId}-${locationId}-${spaceId}`
 * New format: `${monitorId}-${locationId}`
 *
 * The migration happens when:
 * 1. A monitor is edited
 * 2. The cleanup task runs
 */
export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('MigrateLegacyPolicies', function () {
    const kibanaServer = getService('kibanaServer');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const roleScopedSupertest = getService('roleScopedSupertest');
    const samlAuth = getService('samlAuth');
    const retry = getService('retry');

    let supertestAdmin: SupertestWithRoleScopeType;
    let editorUser: RoleCredentials;
    let privateLocation: PrivateLocation;
    let testFleetPolicyID: string;
    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    let syntheticsPackageVersion: string;

    const CLEANUP_TIMEOUT = 3 * 60 * 1000;

    const getPackagePolicies = async (): Promise<PackagePolicy[]> => {
      const apiResponse = await supertestAdmin.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );
      return apiResponse.body.items || [];
    };

    const createLegacyPackagePolicy = async (
      monitorId: string,
      spaceId: string
    ): Promise<string> => {
      const legacyPolicyId = `${monitorId}-${privateLocation.id}-${spaceId}`;

      await retry.tryForTime(60_000, async () => {
        const response = await supertestAdmin.post('/api/fleet/package_policies').send({
          id: legacyPolicyId,
          name: `legacy-${legacyPolicyId}`,
          namespace: 'default',
          policy_ids: [testFleetPolicyID],
          package: {
            name: 'synthetics',
            version: syntheticsPackageVersion,
          },
          inputs: [
            {
              type: 'synthetics/http',
              enabled: true,
              streams: [],
            },
          ],
        });

        expect(response.status).to.eql(
          200,
          `Failed to create legacy policy: ${JSON.stringify(response.body)}`
        );
      });

      await retry.tryForTime(60_000, async () => {
        const updateResponse = await supertestAdmin
          .put(`/api/fleet/package_policies/${legacyPolicyId}`)
          .send({
            is_managed: true,
            force: true,
          });
        expect(updateResponse.status).to.eql(
          200,
          `Failed to set is_managed on legacy policy: ${JSON.stringify(updateResponse.body)}`
        );
      });

      return legacyPolicyId;
    };

    const createMonitor = async (
      monitorId: string,
      monitorName: string,
      extraFields?: Record<string, unknown>
    ): Promise<string> => {
      const response = await supertestWithoutAuth
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `?id=${monitorId}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ...httpMonitorJson, name: monitorName, ...extraFields });

      expect(response.status).to.eql(200, JSON.stringify(response.body));
      return response.body.id;
    };

    const editMonitor = async (
      monitorId: string,
      updates: Record<string, unknown>
    ): Promise<void> => {
      const response = await supertestWithoutAuth
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `/${monitorId}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(updates);

      expect(response.status).to.eql(200, JSON.stringify(response.body));
    };

    before(async () => {
      supertestAdmin = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
      });

      await cleanSyntheticsTestData(kibanaServer);
      await testPrivateLocations.installSyntheticsPackage();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      _httpMonitorJson = getFixtureJson('http_monitor');

      const apiResponse = await testPrivateLocations.addFleetPolicy(
        'Legacy Migration Test Policy',
        [ALL_SPACES_ID]
      );
      testFleetPolicyID = apiResponse.body.item.id;
      const locations = await testPrivateLocations.setTestLocations(
        [testFleetPolicyID],
        [ALL_SPACES_ID]
      );
      privateLocation = locations[0];

      const pkgResponse = await supertestAdmin.get('/api/fleet/epm/packages/synthetics');
      syntheticsPackageVersion = pkgResponse.body?.item?.version || '1.5.0';
    });

    beforeEach(() => {
      httpMonitorJson = {
        ..._httpMonitorJson,
        locations: [privateLocation],
      };
    });

    after(async () => {
      await supertestAdmin.destroy();
      await cleanSyntheticsTestData(kibanaServer);
    });

    describe('Migration on monitor edit', () => {
      it('should migrate legacy policy to new format when monitor is edited', async () => {
        const monitorId = uuidv4();

        const legacyPolicyId = await createLegacyPackagePolicy(monitorId, 'default');

        let policies = await getPackagePolicies();
        expect(policies.find((p) => p.id === legacyPolicyId)).not.to.be(undefined);

        const createdMonitorId = await createMonitor(monitorId, uuidv4());
        expect(createdMonitorId).to.eql(monitorId);

        await editMonitor(createdMonitorId, { name: uuidv4() });

        await retry.tryForTime(CLEANUP_TIMEOUT, async () => {
          policies = await getPackagePolicies();
          const newFormatPolicyId = `${monitorId}-${privateLocation.id}`;

          expect(policies.find((p) => p.id === newFormatPolicyId)).not.to.be(undefined);
          expect(policies.find((p) => p.id === legacyPolicyId)).to.be(undefined);
        });

        await monitorTestService.deleteMonitor(editorUser, createdMonitorId);
      });

      it('should handle multiple legacy policies for same monitor in different spaces', async () => {
        const monitorId = uuidv4();
        const space2 = 'space-2-' + uuidv4().slice(0, 8);

        await kibanaServer.spaces.create({ id: space2, name: space2 });

        const legacyPolicy1 = await createLegacyPackagePolicy(monitorId, 'default');
        const legacyPolicy2 = await createLegacyPackagePolicy(monitorId, space2);

        let policies = await getPackagePolicies();
        expect(policies.some((p) => p.id === legacyPolicy1)).to.be(true);
        expect(policies.some((p) => p.id === legacyPolicy2)).to.be(true);

        await createMonitor(monitorId, uuidv4(), { spaces: ['default', space2] });

        await editMonitor(monitorId, { name: uuidv4() });

        await retry.tryForTime(CLEANUP_TIMEOUT, async () => {
          policies = await getPackagePolicies();
          const newFormatPolicyId = `${monitorId}-${privateLocation.id}`;

          expect(policies.some((p) => p.id === newFormatPolicyId)).to.be(true);
          expect(policies.some((p) => p.id === legacyPolicy1)).to.be(false);
          expect(policies.some((p) => p.id === legacyPolicy2)).to.be(false);
        });

        await monitorTestService.deleteMonitor(editorUser, monitorId);
        await kibanaServer.spaces.delete(space2);
      });

      it('should clean up legacy policy from a space the monitor is no longer in', async () => {
        const monitorAId = uuidv4();
        const monitorBId = uuidv4();
        const extraSpace = `extra-space-${uuidv4().slice(0, 8)}`;

        await kibanaServer.spaces.create({ id: extraSpace, name: extraSpace });

        await createMonitor(monitorBId, uuidv4(), {
          spaces: ['default', extraSpace],
        });

        await createMonitor(monitorAId, uuidv4());
        const staleLegacyPolicyId = await createLegacyPackagePolicy(monitorAId, extraSpace);

        let policies = await getPackagePolicies();
        expect(policies.some((p) => p.id === staleLegacyPolicyId)).to.be(true);

        await editMonitor(monitorAId, { name: uuidv4() });

        await retry.tryForTime(CLEANUP_TIMEOUT, async () => {
          policies = await getPackagePolicies();
          const newFormatPolicyId = `${monitorAId}-${privateLocation.id}`;

          expect(policies.some((p) => p.id === newFormatPolicyId)).to.be(true);
          expect(policies.some((p) => p.id === staleLegacyPolicyId)).to.be(false);
        });

        await monitorTestService.deleteMonitor(editorUser, monitorAId);
        await monitorTestService.deleteMonitor(editorUser, monitorBId);
        await kibanaServer.spaces.delete(extraSpace);
      });
    });

    describe('Migration via cleanup task', () => {
      it('should clean up orphaned legacy policies via cleanup endpoint', async () => {
        const monitorId = uuidv4();

        await createMonitor(monitorId, uuidv4());

        const newFormatPolicyId = `${monitorId}-${privateLocation.id}`;
        await retry.tryForTime(CLEANUP_TIMEOUT, async () => {
          const policies = await getPackagePolicies();
          expect(policies.some((p) => p.id === newFormatPolicyId)).to.be(true);
        });

        const orphanedLegacyPolicyId = await createLegacyPackagePolicy(monitorId, 'orphaned-space');

        let policies = await getPackagePolicies();
        expect(policies.some((p) => p.id === orphanedLegacyPolicyId)).to.be(true);

        await monitorTestService.triggerCleanup(editorUser);

        await retry.tryForTime(CLEANUP_TIMEOUT, async () => {
          policies = await getPackagePolicies();
          expect(policies.some((p) => p.id === newFormatPolicyId)).to.be(true);
          expect(policies.some((p) => p.id === orphanedLegacyPolicyId)).to.be(false);
        });

        await monitorTestService.deleteMonitor(editorUser, monitorId);
      });

      // https://github.com/elastic/kibana/issues/263665
      // The cleanup task deletes legacy policies but the subsequent syncAllPackagePolicies
      // does not reliably recreate the missing new-format policy. Skipping until the
      // sync-after-cleanup path in the product code is fixed.
      it.skip('should migrate legacy policies to new format when cleanup runs', async () => {
        const monitorId = uuidv4();

        await createMonitor(monitorId, uuidv4());

        const newFormatPolicyId = `${monitorId}-${privateLocation.id}`;
        await retry.tryForTime(CLEANUP_TIMEOUT, async () => {
          const policies = await getPackagePolicies();
          expect(policies.some((p) => p.id === newFormatPolicyId)).to.be(true);
        });

        await supertestAdmin
          .post('/api/fleet/package_policies/delete')
          .send({ packagePolicyIds: [newFormatPolicyId], force: true })
          .expect(200);

        const legacyPolicy1 = await createLegacyPackagePolicy(monitorId, 'default');
        const legacyPolicy2 = await createLegacyPackagePolicy(monitorId, 'space-2');

        await monitorTestService.triggerCleanup(editorUser);

        await retry.tryForTime(CLEANUP_TIMEOUT, async () => {
          const policies = await getPackagePolicies();
          expect(policies.some((p) => p.id === newFormatPolicyId)).to.be(true);
          expect(policies.some((p) => p.id === legacyPolicy1)).to.be(false);
          expect(policies.some((p) => p.id === legacyPolicy2)).to.be(false);
        });

        await monitorTestService.deleteMonitor(editorUser, monitorId);
      });

      it('should clean up legacy policies from spaces with no monitors', async () => {
        const monitorId1 = uuidv4();
        const monitorId2 = uuidv4();
        const emptySpace1 = `empty-space-1-${uuidv4().slice(0, 8)}`;
        const emptySpace2 = `empty-space-2-${uuidv4().slice(0, 8)}`;

        await kibanaServer.spaces.create({ id: emptySpace1, name: emptySpace1 });
        await kibanaServer.spaces.create({ id: emptySpace2, name: emptySpace2 });

        const legacyPolicy1 = await createLegacyPackagePolicy(monitorId1, emptySpace1);
        const legacyPolicy2 = await createLegacyPackagePolicy(monitorId2, emptySpace2);

        let policies = await getPackagePolicies();
        expect(policies.some((p) => p.id === legacyPolicy1)).to.be(true);
        expect(policies.some((p) => p.id === legacyPolicy2)).to.be(true);

        await monitorTestService.triggerCleanup(editorUser);

        await retry.tryForTime(CLEANUP_TIMEOUT, async () => {
          policies = await getPackagePolicies();
          expect(policies.some((p) => p.id === legacyPolicy1)).to.be(false);
          expect(policies.some((p) => p.id === legacyPolicy2)).to.be(false);
        });

        await kibanaServer.spaces.delete(emptySpace1);
        await kibanaServer.spaces.delete(emptySpace2);
      });
    });

    describe('Policy ID format verification', () => {
      it('creates new monitors with new format policy ID (without spaceId)', async () => {
        const monitorId = uuidv4();

        await createMonitor(monitorId, uuidv4());

        await retry.try(async () => {
          const policies = await getPackagePolicies();

          const newFormatPolicyId = `${monitorId}-${privateLocation.id}`;
          const legacyFormatPolicyId = `${monitorId}-${privateLocation.id}-default`;

          expect(policies.find((p) => p.id === newFormatPolicyId)).not.to.be(undefined);
          expect(policies.find((p) => p.id === legacyFormatPolicyId)).to.be(undefined);
        });

        await monitorTestService.deleteMonitor(editorUser, monitorId);
      });
    });
  });
}
