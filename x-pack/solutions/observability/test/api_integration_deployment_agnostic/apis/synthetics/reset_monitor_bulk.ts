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
import {
  PrivateLocationTestService,
  cleanSyntheticsTestData,
} from '../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('ResetMonitorBulkRoute', function () {
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

    const bulkResetMonitors = async (ids: string[], statusCode = 200) => {
      return supertest
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_RESET)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids })
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
      await cleanSyntheticsTestData(kibanaServer);
      await testPrivateLocations.installSyntheticsPackage();
      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      privateLocations = await testPrivateLocations.setTestLocations([testPolicyId]);
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    after(async () => {
      await cleanSyntheticsTestData(kibanaServer);
    });

    beforeEach(() => {
      httpMonitorJson = {
        ..._httpMonitorJson,
        locations: [privateLocations[0]],
      };
    });

    describe('default mode', () => {
      it('resets multiple healthy monitors', async () => {
        const mon1 = await saveMonitor(httpMonitorJson as MonitorFields);
        const mon2 = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const res = await bulkResetMonitors([mon1.id, mon2.id]);
          const results = res.body.result;
          expect(results).to.have.length(2);
          expect(results.find((r: any) => r.id === mon1.id).reset).to.eql(true);
          expect(results.find((r: any) => r.id === mon2.id).reset).to.eql(true);
        } finally {
          await monitorTestService.deleteMonitor(editorUser, mon1.id, 200, 'default');
          await monitorTestService.deleteMonitor(editorUser, mon2.id, 200, 'default');
        }
      });

      it('bumps Fleet policy revision after bulk reset', async () => {
        const mon1 = await saveMonitor(httpMonitorJson as MonitorFields);
        const mon2 = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          let revision1Before = 0;
          let revision2Before = 0;
          await retry.try(async () => {
            const policy1Before = await getPackagePoliciesForMonitor(mon1.id, testPolicyId);
            const policy2Before = await getPackagePoliciesForMonitor(mon2.id, testPolicyId);
            expect(policy1Before).to.not.be(undefined);
            expect(policy2Before).to.not.be(undefined);
            revision1Before = policy1Before!.revision;
            revision2Before = policy2Before!.revision;
          });

          await bulkResetMonitors([mon1.id, mon2.id]);

          await retry.try(async () => {
            const policy1After = await getPackagePoliciesForMonitor(mon1.id, testPolicyId);
            const policy2After = await getPackagePoliciesForMonitor(mon2.id, testPolicyId);
            expect(policy1After!.revision).to.be.greaterThan(revision1Before);
            expect(policy2After!.revision).to.be.greaterThan(revision2Before);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, mon1.id, 200, 'default');
          await monitorTestService.deleteMonitor(editorUser, mon2.id, 200, 'default');
        }
      });

      it('recreates missing policy for one of multiple monitors', async () => {
        const mon1 = await saveMonitor(httpMonitorJson as MonitorFields);
        const mon2 = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const policyId = `${mon1.id}-${testPolicyId}`;
          await deletePackagePolicyDirectly(policyId);

          await retry.try(async () => {
            expect(await getPackagePoliciesForMonitor(mon1.id, testPolicyId)).to.be(undefined);
          });

          const res = await bulkResetMonitors([mon1.id, mon2.id]);
          const results = res.body.result;
          expect(results.find((r: any) => r.id === mon1.id).reset).to.eql(true);
          expect(results.find((r: any) => r.id === mon2.id).reset).to.eql(true);

          await retry.try(async () => {
            const policyRestored = await getPackagePoliciesForMonitor(mon1.id, testPolicyId);
            expect(policyRestored).to.not.be(undefined);
          });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, mon1.id, 200, 'default');
          await monitorTestService.deleteMonitor(editorUser, mon2.id, 200, 'default');
        }
      });

      it('single ID in bulk behaves like single endpoint', async () => {
        const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const res = await bulkResetMonitors([monitorId]);
          expect(res.body.result).to.have.length(1);
          expect(res.body.result[0]).to.eql({ id: monitorId, reset: true });
        } finally {
          await monitorTestService.deleteMonitor(editorUser, monitorId, 200, 'default');
        }
      });

      it('is idempotent — calling bulk reset twice succeeds', async () => {
        const mon1 = await saveMonitor(httpMonitorJson as MonitorFields);
        const mon2 = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          await bulkResetMonitors([mon1.id, mon2.id]);
          const secondRes = await bulkResetMonitors([mon1.id, mon2.id]);
          expect(secondRes.body.result).to.have.length(2);
          expect(secondRes.body.result.every((r: any) => r.reset === true)).to.eql(true);
        } finally {
          await monitorTestService.deleteMonitor(editorUser, mon1.id, 200, 'default');
          await monitorTestService.deleteMonitor(editorUser, mon2.id, 200, 'default');
        }
      });

      it('preserves monitor configs after bulk reset', async () => {
        const mon1 = await saveMonitor(httpMonitorJson as MonitorFields);
        const mon2 = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const getMonitor = async (id: string) => {
            const res = await supertest
              .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + id)
              .set(editorUser.apiKeyHeader)
              .set(samlAuth.getInternalRequestHeader())
              .expect(200);
            return res.body;
          };

          const before1 = await getMonitor(mon1.id);
          const before2 = await getMonitor(mon2.id);

          await bulkResetMonitors([mon1.id, mon2.id]);

          const after1 = await getMonitor(mon1.id);
          const after2 = await getMonitor(mon2.id);

          for (const [before, after] of [
            [before1, after1],
            [before2, after2],
          ]) {
            expect(before.name).to.eql(after.name);
            expect(before.urls).to.eql(after.urls);
            expect(before.schedule).to.eql(after.schedule);
            expect(before.locations).to.eql(after.locations);
            expect(before.revision).to.eql(after.revision);
          }
        } finally {
          await monitorTestService.deleteMonitor(editorUser, mon1.id, 200, 'default');
          await monitorTestService.deleteMonitor(editorUser, mon2.id, 200, 'default');
        }
      });
    });

    describe('partial failure handling', () => {
      it('returns per-monitor errors when some monitors are not found', async () => {
        const { id: validId } = await saveMonitor(httpMonitorJson as MonitorFields);
        const invalidId = 'non-existent-monitor-bulk';
        try {
          const res = await bulkResetMonitors([validId, invalidId]);
          const results = res.body.result;

          const validResult = results.find((r: any) => r.id === validId);
          const invalidResult = results.find((r: any) => r.id === invalidId);

          expect(validResult.reset).to.eql(true);
          expect(invalidResult.reset).to.eql(false);
          expect(invalidResult.error).to.contain('not found');
        } finally {
          await monitorTestService.deleteMonitor(editorUser, validId, 200, 'default');
        }
      });

      it('returns 403 for viewer user', async () => {
        const mon1 = await saveMonitor(httpMonitorJson as MonitorFields);
        const mon2 = await saveMonitor(httpMonitorJson as MonitorFields);
        try {
          const viewerUser = await samlAuth.createM2mApiKeyWithRoleScope('viewer');
          await supertest
            .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_BULK_RESET)
            .set(viewerUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .send({ ids: [mon1.id, mon2.id] })
            .expect(403);
        } finally {
          await monitorTestService.deleteMonitor(editorUser, mon1.id, 200, 'default');
          await monitorTestService.deleteMonitor(editorUser, mon2.id, 200, 'default');
        }
      });

      it('all monitors not found returns empty successful results', async () => {
        const res = await bulkResetMonitors(['fake-id-1', 'fake-id-2']);
        const results = res.body.result;
        expect(results).to.have.length(2);
        expect(results.every((r: any) => r.reset === false)).to.eql(true);
      });
    });
  });
}
