/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type {
  EncryptedSyntheticsSavedMonitor,
  HTTPFields,
  MonitorFields,
  PrivateLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('ResetMonitorRoute', function () {
    const supertest = getService('supertestWithoutAuth');
    // TODO: Replace with roleScopedSupertest for deployment-agnostic compatibility
    // eslint-disable-next-line @kbn/eslint/deployment_agnostic_test_context
    const supertestWithAuth = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    const retry = getService('retry');

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    let editorUser: RoleCredentials;
    let testPolicyId = '';
    let privateLocations: PrivateLocation[];

    const saveMonitor = async (
      monitor: MonitorFields
    ): Promise<EncryptedSyntheticsSavedMonitor> => {
      const res = await supertest
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ...monitor, name: `${monitor.name}-${uuidv4()}` });

      expect(res.status).to.eql(200, JSON.stringify(res.body));
      return res.body;
    };

    const resetMonitor = async (
      monitorId: string,
      { force = false, statusCode = 200 }: { force?: boolean; statusCode?: number } = {}
    ) => {
      const url = SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_RESET.replace('{monitorId}', monitorId);
      return supertest
        .post(url)
        .query({ force })
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(statusCode);
    };

    const getPackagePoliciesForMonitor = async (
      monitorId: string,
      locationId: string
    ): Promise<PackagePolicy | undefined> => {
      const policyId = `${monitorId}-${locationId}`;
      const apiResponse = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );
      return apiResponse.body.items.find((p: PackagePolicy) => p.id === policyId);
    };

    const deletePackagePolicyDirectly = async (policyId: string) => {
      await supertestWithAuth
        .post('/api/fleet/package_policies/delete')
        .set('kbn-xsrf', 'true')
        .send({ packagePolicyIds: [policyId], force: true })
        .expect(200);
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();
      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      privateLocations = await testPrivateLocations.setTestLocations([testPolicyId]);
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(() => {
      httpMonitorJson = {
        ..._httpMonitorJson,
        locations: [privateLocations[0]],
      };
    });

    describe('default mode (editMonitors)', () => {
      it('resets a healthy monitor and returns success', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const resetResponse = await resetMonitor(monitorId);
          expect(resetResponse.body).to.eql({ id: monitorId, reset: true });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('recreates missing Fleet package policy', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          await retry.try(async () => {
            const policyBefore = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policyBefore).to.not.be(undefined);
          });

          const policyIdToDelete = `${monitorId}-${testPolicyId}`;
          await deletePackagePolicyDirectly(policyIdToDelete);

          await retry.try(async () => {
            const policyAfterDelete = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policyAfterDelete).to.be(undefined);
          });

          const resetResponse = await resetMonitor(monitorId);
          expect(resetResponse.body).to.eql({ id: monitorId, reset: true });

          await retry.try(async () => {
            const policyAfterReset = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policyAfterReset).to.not.be(undefined);
            expect(policyAfterReset!.policy_id).to.eql(testPolicyId);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('overwrites existing policy (handles corruption)', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          let revisionBefore: number = 0;
          await retry.try(async () => {
            const policyBefore = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policyBefore).to.not.be(undefined);
            revisionBefore = policyBefore!.revision;
          });

          const resetResponse = await resetMonitor(monitorId);
          expect(resetResponse.body).to.eql({ id: monitorId, reset: true });

          await retry.try(async () => {
            const policyAfter = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policyAfter).to.not.be(undefined);
            expect(policyAfter!.revision).to.be.greaterThan(revisionBefore);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('is idempotent — calling reset multiple times succeeds', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          await resetMonitor(monitorId);
          await resetMonitor(monitorId);
          const thirdReset = await resetMonitor(monitorId);
          expect(thirdReset.body).to.eql({ id: monitorId, reset: true });

          await retry.try(async () => {
            const policyAfter = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policyAfter).to.not.be(undefined);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('preserves monitor config — saved object is unchanged after reset', async () => {
        const saved = await saveMonitor(httpMonitorJson as MonitorFields);
        const monitorId = saved.id;
        try {
          const getBefore = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(200);

          await resetMonitor(monitorId);

          const getAfter = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(200);

          expect(getBefore.body.name).to.eql(getAfter.body.name);
          expect(getBefore.body.urls).to.eql(getAfter.body.urls);
          expect(getBefore.body.schedule).to.eql(getAfter.body.schedule);
          expect(getBefore.body.locations).to.eql(getAfter.body.locations);
          expect(getBefore.body.revision).to.eql(getAfter.body.revision);
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });
    });

    describe('force mode (delete + recreate)', () => {
      it('resets a healthy monitor with force=true', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const resetResponse = await resetMonitor(monitorId, { force: true });
          expect(resetResponse.body).to.eql({ id: monitorId, reset: true });

          await retry.try(async () => {
            const policy = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policy).to.not.be(undefined);
            expect(policy!.policy_id).to.eql(testPolicyId);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('recreates missing Fleet package policy with force=true', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const policyIdToDelete = `${monitorId}-${testPolicyId}`;
          await deletePackagePolicyDirectly(policyIdToDelete);

          await retry.try(async () => {
            const policyGone = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policyGone).to.be(undefined);
          });

          const resetResponse = await resetMonitor(monitorId, { force: true });
          expect(resetResponse.body).to.eql({ id: monitorId, reset: true });

          await retry.try(async () => {
            const policyRestored = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policyRestored).to.not.be(undefined);
            expect(policyRestored!.policy_id).to.eql(testPolicyId);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('is idempotent with force=true', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          await resetMonitor(monitorId, { force: true });
          const secondReset = await resetMonitor(monitorId, { force: true });
          expect(secondReset.body).to.eql({ id: monitorId, reset: true });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('preserves monitor config with force=true', async () => {
        const saved = await saveMonitor(httpMonitorJson as MonitorFields);
        const monitorId = saved.id;
        try {
          const getBefore = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(200);

          await resetMonitor(monitorId, { force: true });

          const getAfter = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(200);

          expect(getBefore.body.name).to.eql(getAfter.body.name);
          expect(getBefore.body.urls).to.eql(getAfter.body.urls);
          expect(getBefore.body.schedule).to.eql(getAfter.body.schedule);
          expect(getBefore.body.locations).to.eql(getAfter.body.locations);
          expect(getBefore.body.revision).to.eql(getAfter.body.revision);
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });
    });

    describe('monitor with multiple private locations', () => {
      let testPolicyId2: string;
      let multiLocations: PrivateLocation[];

      before(async () => {
        const testPolicyName2 = 'Fleet test server policy 2 ' + Date.now();
        const apiResponse2 = await testPrivateLocations.addFleetPolicy(testPolicyName2);
        testPolicyId2 = apiResponse2.body.item.id;
        multiLocations = await testPrivateLocations.setTestLocations([testPolicyId, testPolicyId2]);
      });

      it('recreates policies for all locations when one is missing', async () => {
        const monitor = { ..._httpMonitorJson, locations: multiLocations };
        const { id: monitorId } = await saveMonitor(monitor as MonitorFields);
        try {
          await retry.try(async () => {
            const policy1Before = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            const policy2Before = await getPackagePoliciesForMonitor(monitorId, testPolicyId2);
            expect(policy1Before).to.not.be(undefined);
            expect(policy2Before).to.not.be(undefined);
          });

          const policyIdToDelete = `${monitorId}-${testPolicyId}`;
          await deletePackagePolicyDirectly(policyIdToDelete);

          await retry.try(async () => {
            const policy1Gone = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            expect(policy1Gone).to.be(undefined);
          });

          await resetMonitor(monitorId);

          await retry.try(async () => {
            const policy1After = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            const policy2After = await getPackagePoliciesForMonitor(monitorId, testPolicyId2);
            expect(policy1After).to.not.be(undefined);
            expect(policy2After).to.not.be(undefined);
            expect(policy1After!.policy_id).to.eql(testPolicyId);
            expect(policy2After!.policy_id).to.eql(testPolicyId2);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('recreates all policies with force=true when all are missing', async () => {
        const monitor = { ..._httpMonitorJson, locations: multiLocations };
        const { id: monitorId } = await saveMonitor(monitor as MonitorFields);
        try {
          await deletePackagePolicyDirectly(`${monitorId}-${testPolicyId}`);
          await deletePackagePolicyDirectly(`${monitorId}-${testPolicyId2}`);

          await retry.try(async () => {
            expect(await getPackagePoliciesForMonitor(monitorId, testPolicyId)).to.be(undefined);
            expect(await getPackagePoliciesForMonitor(monitorId, testPolicyId2)).to.be(undefined);
          });

          const resetResponse = await resetMonitor(monitorId, { force: true });
          expect(resetResponse.body).to.eql({ id: monitorId, reset: true });

          await retry.try(async () => {
            const policy1 = await getPackagePoliciesForMonitor(monitorId, testPolicyId);
            const policy2 = await getPackagePoliciesForMonitor(monitorId, testPolicyId2);
            expect(policy1).to.not.be(undefined);
            expect(policy2).to.not.be(undefined);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });
    });

    describe('error handling', () => {
      it('returns 404 for non-existent monitor', async () => {
        const invalidId = 'non-existent-monitor-id';
        const res = await resetMonitor(invalidId, { statusCode: 404 });
        expect(res.body.message).to.contain(invalidId);
      });

      it('returns 404 for non-existent monitor with force=true', async () => {
        const invalidId = 'non-existent-monitor-id-force';
        const res = await resetMonitor(invalidId, { force: true, statusCode: 404 });
        expect(res.body.message).to.contain(invalidId);
      });

      it('returns 403 for viewer user (default mode)', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const viewerUser = await samlAuth.createM2mApiKeyWithRoleScope('viewer');
          const url = SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_RESET.replace(
            '{monitorId}',
            monitorId
          );
          await supertest
            .post(url)
            .set(viewerUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(403);
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('returns 403 for viewer user (force mode)', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const viewerUser = await samlAuth.createM2mApiKeyWithRoleScope('viewer');
          const url = SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_RESET.replace(
            '{monitorId}',
            monitorId
          );
          await supertest
            .post(url)
            .query({ force: true })
            .set(viewerUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(403);
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });
    });
  });
}
