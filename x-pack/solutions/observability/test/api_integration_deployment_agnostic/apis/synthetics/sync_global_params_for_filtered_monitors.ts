/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { HTTPFields, PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('SyncGlobalParamsForFilteredMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    const retry = getService('retry');

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let editorUser: RoleCredentials;
    let privateLocation: PrivateLocation;
    let testFleetPolicyID: string;
    let _httpMonitorJson: HTTPFields;

    let paramAId: string;

    const MONITOR_WITH_PARAM_A = 'test-monitor-with-paramA';
    const MONITOR_WITH_PARAM_B = 'test-monitor-with-paramB';
    const MONITOR_WITH_BOTH_PARAMS = 'test-monitor-with-both-params';
    const MONITOR_WITHOUT_PARAMS = 'test-monitor-without-params';

    const findPolicyByMonitorName = (
      policies: PackagePolicy[],
      monitorName: string
    ): PackagePolicy | undefined => {
      return policies.find((p) => p.name.startsWith(monitorName));
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await kibanaServer.savedObjects.clean({ types: [syntheticsParamType] });

      _httpMonitorJson = getFixtureJson('http_monitor');

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const fleetResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testFleetPolicyID = fleetResponse.body.item.id;

      const locations = await testPrivateLocations.setTestLocations([testFleetPolicyID]);
      privateLocation = locations[0];
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    it('creates global params paramA and paramB', async () => {
      const paramAResponse = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'paramA', value: 'valueA' })
        .expect(200);

      paramAId = paramAResponse.body.id;

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'paramB', value: 'valueB' })
        .expect(200);
    });

    it('creates four HTTP monitors with different param references on a private location', async () => {
      const pvtLoc = {
        id: testFleetPolicyID,
        agentPolicyId: testFleetPolicyID,
        label: privateLocation.label,
        isServiceManaged: false,
        geo: { lat: 0, lon: 0 },
      };

      await monitorTestService.createMonitor(
        {
          ..._httpMonitorJson,
          name: MONITOR_WITH_PARAM_A,
          urls: 'https://example.com/${paramA}/health',
          locations: [pvtLoc],
        },
        editorUser
      );

      await monitorTestService.createMonitor(
        {
          ..._httpMonitorJson,
          name: MONITOR_WITH_PARAM_B,
          urls: 'https://example.com/${paramB}/health',
          locations: [pvtLoc],
        },
        editorUser
      );

      await monitorTestService.createMonitor(
        {
          ..._httpMonitorJson,
          name: MONITOR_WITH_BOTH_PARAMS,
          urls: 'https://example.com/${paramA}/${paramB}',
          locations: [pvtLoc],
        },
        editorUser
      );

      await monitorTestService.createMonitor(
        {
          ..._httpMonitorJson,
          name: MONITOR_WITHOUT_PARAMS,
          urls: 'https://example.com/static/health',
          locations: [pvtLoc],
        },
        editorUser
      );

      await retry.tryForTime(30 * 1000, async () => {
        const policies = await testPrivateLocations.getPackagePolicies();
        expect(policies.length).to.eql(4);
      });
    });

    it('only updates package policies for monitors that reference the modified param', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const policiesBefore = await testPrivateLocations.getPackagePolicies();
      expect(policiesBefore.length).to.eql(4);

      const revisionsBefore: Record<string, number> = {};
      for (const p of policiesBefore) {
        revisionsBefore[p.name] = p.revision;
      }

      expect(findPolicyByMonitorName(policiesBefore, MONITOR_WITH_PARAM_A)).to.be.ok();
      expect(findPolicyByMonitorName(policiesBefore, MONITOR_WITH_PARAM_B)).to.be.ok();
      expect(findPolicyByMonitorName(policiesBefore, MONITOR_WITH_BOTH_PARAMS)).to.be.ok();
      expect(findPolicyByMonitorName(policiesBefore, MONITOR_WITHOUT_PARAMS)).to.be.ok();

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + paramAId)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'paramA', value: 'updatedValueA' })
        .expect(200);

      await retry.tryForTime(60 * 1000, async () => {
        const policiesAfter = await testPrivateLocations.getPackagePolicies();

        const policyParamA = findPolicyByMonitorName(policiesAfter, MONITOR_WITH_PARAM_A)!;
        const policyBoth = findPolicyByMonitorName(policiesAfter, MONITOR_WITH_BOTH_PARAMS)!;

        expect(policyParamA.revision).to.be.greaterThan(revisionsBefore[policyParamA.name]);
        expect(policyBoth.revision).to.be.greaterThan(revisionsBefore[policyBoth.name]);
      });

      const policiesFinal = await testPrivateLocations.getPackagePolicies();

      const policyParamB = findPolicyByMonitorName(policiesFinal, MONITOR_WITH_PARAM_B)!;
      const policyNoParams = findPolicyByMonitorName(policiesFinal, MONITOR_WITHOUT_PARAMS)!;

      expect(policyParamB.revision).to.eql(revisionsBefore[policyParamB.name]);
      expect(policyNoParams.revision).to.eql(revisionsBefore[policyNoParams.name]);
    });

    it('confirms the updated param value is resolved in the affected package policy', async () => {
      const policies = await testPrivateLocations.getPackagePolicies();
      const policyParamA = findPolicyByMonitorName(policies, MONITOR_WITH_PARAM_A)!;

      const httpInput = policyParamA.inputs.find((i) => i.type === 'synthetics/http');
      const httpStream = httpInput?.streams?.[0];
      const compiledStream = httpStream?.compiled_stream as Record<string, unknown> | undefined;

      expect(compiledStream).to.be.ok();
      expect(compiledStream!.urls).to.eql('https://example.com/updatedValueA/health');
    });
  });
}
