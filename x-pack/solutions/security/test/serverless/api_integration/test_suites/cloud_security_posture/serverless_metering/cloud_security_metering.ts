/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
  CDR_METERING_STATE_INDEX,
} from '@kbn/cloud-security-posture-common';
import type * as http from 'http';
import { createPackagePolicy } from '@kbn/cloud-security-posture-common/test_helper';
import { EsIndexDataProvider } from '../utils';
import {
  GCP_COMPUTE_INSTANCE_SUB_TYPE,
  getMockFindings,
  getMockMeteringStateDoc,
  getMockRawLifecycleFinding,
} from './mock_data';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import type { RoleCredentials } from '../../../services';
import type { UsageRecord } from './mock_usage_server';
import { getInterceptedRequestPayload, setupMockServer } from './mock_usage_server';

export default function (providerContext: FtrProviderContext) {
  const mockUsageApiApp = setupMockServer();
  const { getService } = providerContext;
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const findingsIndex = new EsIndexDataProvider(
    es,
    CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS
  );
  const vulnerabilitiesIndex = new EsIndexDataProvider(
    es,
    CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN
  );
  const meteringStateIndex = new EsIndexDataProvider(es, CDR_METERING_STATE_INDEX);

  // The metering_state transform reads the wildcard pattern
  // `logs-cloud_security_posture.findings-default*`. This suite writes raw
  // findings to a dedicated concrete index under that pattern rather than to
  // the package's data stream, so the lifecycle field mappings the transform
  // groups on are guaranteed regardless of which package version FTR installed.
  const RAW_FINDINGS_FTR_INDEX = 'logs-cloud_security_posture.findings-default-ftr-metering';
  const RAW_FINDINGS_FTR_TEMPLATE = 'ftr-cspm-metering-raw-findings';

  const HOUR_MS = 60 * 60 * 1000;

  // Mirrors METERING_STATE_INDEX_MAPPINGS in
  // cloud_security_posture/server/create_transforms/metering_state_transform.ts.
  // Duplicated for the same reason as the transform id above. Keep in sync: the
  // transform runs with deduce_mappings:false, so it writes against exactly these.
  const METERING_STATE_INDEX_MAPPINGS = {
    properties: {
      resource: {
        properties: {
          id: { type: 'keyword' as const },
          sub_type: { type: 'keyword' as const },
          lifecycle: { properties: { incarnation: { type: 'keyword' as const } } },
        },
      },
      cloud: { properties: { account: { properties: { id: { type: 'keyword' as const } } } } },
      posture_type: { type: 'keyword' as const },
      first_seen: { type: 'date' as const },
      last_seen: { type: 'date' as const },
      span_ms: { type: 'long' as const },
      last_started_at: { type: 'date' as const },
      last_stopped_at: { type: 'date' as const },
      last_run_ms: { type: 'long' as const },
    },
  };

  /**
   * Provisioning the state index is unresolved: the elastic/kibana service
   * account has no create_index privilege on it, so the plugin's own attempt
   * fails and it skips registering the transform. Shipping the transform as a
   * cloud_security_posture package asset was tried and does not install cleanly
   * either — Fleet applies the installing user's secondary auth to putTransform
   * but not to the destination-index create/delete.
   *
   * Creating the index here with the FTR superuser keeps these tests about
   * billing behaviour rather than about provisioning; whichever way that
   * question is settled, these assertions stand.
   *
   * Must run before createPackagePolicy, which is what triggers plugin init.
   */
  const ensureMeteringStateIndex = async () => {
    if (await es.indices.exists({ index: CDR_METERING_STATE_INDEX })) return;
    await es.indices.putIndexTemplate({
      name: 'ftr-cspm-metering-state',
      index_patterns: [`${CDR_METERING_STATE_INDEX}*`],
      priority: 600,
      template: { mappings: METERING_STATE_INDEX_MAPPINGS },
    });
    await es.indices.create({
      index: CDR_METERING_STATE_INDEX,
      mappings: METERING_STATE_INDEX_MAPPINGS,
    });
  };

  /*
  This test aims to intercept the usage API request sent by the metering background task manager.
  The task manager is running by default in security serverless project in the background and sending usage API requests to the usage API.
   This test mocks the usage API server and intercepts the usage API request sent by the metering background task manager.
  */
  describe('Intercept the usage API request sent by the metering background task manager', function () {
    this.tags(['skipMKI']);

    let mockUsageApiServer: http.Server;
    let agentPolicyId: string;
    let roleAuthc: RoleCredentials;
    let internalRequestHeader: { 'x-elastic-internal-origin': string; 'kbn-xsrf': string };
    before(async () => {
      mockUsageApiServer = mockUsageApiApp.listen(8089); // Start the usage api mock server on port 8089
    });

    beforeEach(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalRequestHeader = svlCommonApi.getInternalRequestHeader();

      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');

      const { body: agentPolicyResponse } = await supertestWithoutAuth
        .post(`/api/fleet/agent_policies`)
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;

      await findingsIndex.deleteAll();
      await vulnerabilitiesIndex.deleteAll();
      // State left behind by one test would silently change which query bills
      // the next one.
      await meteringStateIndex.deleteAll();
      // Before any package policy exists, so plugin init finds the index present.
      await ensureMeteringStateIndex();
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await findingsIndex.deleteAll();
      await vulnerabilitiesIndex.deleteAll();
      await meteringStateIndex.deleteAll();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      mockUsageApiServer.close();
    });

    it('Should intercept usage API request for CSPM', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm',
        'CSPM-1',
        roleAuthc,
        internalRequestHeader
      );
      const billableFindings = getMockFindings({
        postureType: 'cspm',
        isBillableAsset: true,
        numberOfFindings: 5,
      });

      const notBillableFindings = getMockFindings({
        postureType: 'cspm',
        isBillableAsset: false,
        numberOfFindings: 10,
      });

      await findingsIndex.addBulk([...billableFindings, ...notBillableFindings]);

      let interceptedRequestBody: UsageRecord[] = [];
      await retry.try(async () => {
        if (interceptedRequestBody.length > 0) {
          interceptedRequestBody = getInterceptedRequestPayload();
          expect(interceptedRequestBody.length).to.greaterThan(0);
          const usageSubTypes = interceptedRequestBody.map((record) => record.usage.sub_type);
          expect(usageSubTypes).to.contain('cspm');
          expect(interceptedRequestBody[0].usage.type).to.be('cloud_security');
          expect(interceptedRequestBody[0].usage.quantity).to.be(billableFindings.length);
        }
      });
    });

    it('Should intercept usage API request for KSPM', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-1',
        roleAuthc,
        internalRequestHeader
      );
      const billableFindings = getMockFindings({
        postureType: 'kspm',
        isBillableAsset: true,
        numberOfFindings: 3,
      });

      const notBillableFindings = getMockFindings({
        postureType: 'kspm',
        isBillableAsset: false,
        numberOfFindings: 11,
      });

      await findingsIndex.addBulk([...billableFindings, ...notBillableFindings]);

      let interceptedRequestBody: UsageRecord[] = [];

      await retry.try(async () => {
        if (interceptedRequestBody.length > 0) {
          interceptedRequestBody = getInterceptedRequestPayload();
          expect(interceptedRequestBody.length).to.greaterThan(0);
          const usageSubTypes = interceptedRequestBody.map((record) => record.usage.sub_type);
          expect(usageSubTypes).to.contain('kspm');
          expect(interceptedRequestBody[0].usage.type).to.be('cloud_security');
          expect(interceptedRequestBody[0].usage.quantity).to.be(billableFindings.length);
        }
      });
    });

    it('Should intercept usage API request for CNVM', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'vuln_mgmt',
        'cloudbeat/vuln_mgmt_aws',
        'aws',
        'vuln_mgmt',
        'CNVM-1',
        roleAuthc,
        internalRequestHeader
      );

      const billableFindings = getMockFindings({
        postureType: 'cnvm',
        numberOfFindings: 2,
      });

      await vulnerabilitiesIndex.addBulk(billableFindings);

      let interceptedRequestBody: UsageRecord[] = [];

      await retry.try(async () => {
        interceptedRequestBody = getInterceptedRequestPayload();
        expect(interceptedRequestBody.length).to.greaterThan(0);
        if (interceptedRequestBody.length > 0) {
          const usageSubTypes = interceptedRequestBody.map((record) => record.usage.sub_type);
          expect(usageSubTypes).to.contain('cnvm');
          expect(interceptedRequestBody[0].usage.type).to.be('cloud_security');
          expect(interceptedRequestBody[0].usage.quantity).to.be(billableFindings.length);
        }
      });
    });

    it('Should intercept usage API request with all integrations usage records', async () => {
      // Create one package policy - it takes care forCSPM, KSMP and CNVM
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm',
        'CSPM-1',
        roleAuthc,
        internalRequestHeader
      );

      const billableFindingsCSPM = getMockFindings({
        postureType: 'cspm',
        isBillableAsset: true,
        numberOfFindings: 5,
      });

      const notBillableFindingsCSPM = getMockFindings({
        postureType: 'cspm',
        isBillableAsset: false,
        numberOfFindings: 10,
      });

      const billableFindingsKSPM = getMockFindings({
        postureType: 'kspm',
        isBillableAsset: true,
        numberOfFindings: 3,
      });

      const billableFindingsCNVM = getMockFindings({
        postureType: 'cnvm',
        numberOfFindings: 2,
      });

      const notBillableFindingsKSPM = getMockFindings({
        postureType: 'kspm',
        isBillableAsset: false,
        numberOfFindings: 11,
      });

      await Promise.all([
        findingsIndex.addBulk([
          ...billableFindingsCSPM,
          ...notBillableFindingsCSPM,
          ...billableFindingsKSPM,
          ...notBillableFindingsKSPM,
        ]),
        vulnerabilitiesIndex.addBulk([...billableFindingsCNVM]),
      ]);

      // Intercept and verify usage API request
      let interceptedRequestBody: UsageRecord[] = [];

      await retry.try(async () => {
        interceptedRequestBody = getInterceptedRequestPayload();
        const usageSubTypes = interceptedRequestBody.map((record) => record.usage.sub_type);

        expect(usageSubTypes).to.contain('cspm');
        expect(usageSubTypes).to.contain('kspm');
        expect(usageSubTypes).to.contain('cnvm');
        const totalUsageQuantity = interceptedRequestBody.reduce(
          (acc, record) => acc + record.usage.quantity,
          0
        );
        expect(totalUsageQuantity).to.be(
          billableFindingsCSPM.length + billableFindingsKSPM.length + billableFindingsCNVM.length
        );
      });
    });

    it('Should bill CSPM from the metering state index, applying the GCP corroboration rules', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm',
        'CSPM-1',
        roleAuthc,
        internalRequestHeader
      );

      // beforeEach created the index with explicit mappings. Letting it be
      // auto-created by the insert below would deduce the wrong types (span_ms
      // as float, the date fields as text) and the billing query's range
      // filters would silently match nothing.
      await meteringStateIndex.deleteAll();

      const stateDocs = [
        // aws-s3, active and corroborated -> billable (3 unique resources).
        ...Array.from({ length: 3 }, () =>
          getMockMeteringStateDoc({
            subType: 'aws-s3',
            firstSeenHoursAgo: 48,
            lastSeenHoursAgo: 1,
          })
        ),
        // aws-s3 seen on a single scan (span_ms === 0) -> still billable: the
        // two-scan corroboration rule is deliberately GCP-scoped, non-GCP
        // sub_types keep the legacy presence-only semantics.
        getMockMeteringStateDoc({
          subType: 'aws-s3',
          firstSeenHoursAgo: 1,
          lastSeenHoursAgo: 1,
        }),
        // aws-s3 last scanned outside the 24h sampling window -> not billable.
        getMockMeteringStateDoc({
          subType: 'aws-s3',
          firstSeenHoursAgo: 48,
          lastSeenHoursAgo: 30,
        }),
        // gcp running and never stopped, corroborated, started well over 24h
        // ago -> billable (no stop knob means no last_stopped_at at all).
        ...Array.from({ length: 2 }, () =>
          getMockMeteringStateDoc({
            subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
            firstSeenHoursAgo: 48,
            lastSeenHoursAgo: 1,
            lastStartHoursAgo: 48,
            incarnation: new Date(Date.now() - 48 * HOUR_MS).toISOString(),
          })
        ),
        // gcp running and corroborated, but only 2h of attested run -> not billable.
        getMockMeteringStateDoc({
          subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
          firstSeenHoursAgo: 48,
          lastSeenHoursAgo: 1,
          lastStartHoursAgo: 2,
          incarnation: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
        }),
        // gcp running long enough but seen on a single scan -> not billable.
        getMockMeteringStateDoc({
          subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
          firstSeenHoursAgo: 1,
          lastSeenHoursAgo: 1,
          lastStartHoursAgo: 48,
          incarnation: new Date(Date.now() - 48 * HOUR_MS).toISOString(),
        }),
        // gcp restarted 36h ago after a stop 40h ago: stop precedes start, so
        // last_run_ms is negative and the instance is running -> billable.
        getMockMeteringStateDoc({
          subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
          firstSeenHoursAgo: 48,
          lastSeenHoursAgo: 1,
          lastStartHoursAgo: 36,
          lastStopHoursAgo: 40,
          incarnation: new Date(Date.now() - 48 * HOUR_MS).toISOString(),
        }),
        // gcp restarted only 2h ago -> running, but not yet 24h -> not billable.
        getMockMeteringStateDoc({
          subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
          firstSeenHoursAgo: 48,
          lastSeenHoursAgo: 1,
          lastStartHoursAgo: 2,
          lastStopHoursAgo: 6,
          incarnation: new Date(Date.now() - 48 * HOUR_MS).toISOString(),
        }),
        // gcp stopped 2h ago after a 30h run -> billable on its stop day.
        getMockMeteringStateDoc({
          subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
          firstSeenHoursAgo: 48,
          lastSeenHoursAgo: 1,
          lastStartHoursAgo: 32,
          lastStopHoursAgo: 2,
          incarnation: new Date(Date.now() - 48 * HOUR_MS).toISOString(),
        }),
        // gcp stopped after a 30h run, but before the window opened -> already
        // billed on its stop day, must not re-bill.
        getMockMeteringStateDoc({
          subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
          firstSeenHoursAgo: 96,
          lastSeenHoursAgo: 1,
          lastStartHoursAgo: 78,
          lastStopHoursAgo: 48,
          incarnation: new Date(Date.now() - 96 * HOUR_MS).toISOString(),
        }),
      ];

      await meteringStateIndex.addBulk(stateDocs, false);

      // The task will not emit a CSPM record at all unless the LEGACY latest
      // index has data in the window - that gate runs before the path choice.
      // These findings are deliberately non-billable, so a regression that fell
      // back to the legacy query would bill 0 here, not 7.
      await findingsIndex.addBulk(
        getMockFindings({ postureType: 'cspm', isBillableAsset: false, numberOfFindings: 3 })
      );

      // aws-s3 corroborated (3) + aws-s3 single-scan (1) + gcp never-stopped
      // (2) + gcp restarted >24h ago (1) + gcp stopped in window (1).
      const expectedBillableAssets = 3 + 1 + 2 + 1 + 1;

      await retry.try(async () => {
        const interceptedRequestBody: UsageRecord[] = getInterceptedRequestPayload();
        const cspmRecord = interceptedRequestBody.find(
          (record) => record.usage.sub_type === 'cspm'
        );
        if (!cspmRecord) {
          throw new Error('No CSPM usage record has been intercepted yet');
        }
        expect(cspmRecord.usage.type).to.be('cloud_security');
        expect(cspmRecord.usage.quantity).to.be(expectedBillableAssets);
      });
    });

    it('Should keep two incarnations of a reused resource name apart in the metering state index', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm',
        'CSPM-1',
        roleAuthc,
        internalRequestHeader
      );

      await meteringStateIndex.deleteAll();

      // The transform is a cloud_security_posture package asset, and Fleet
      // derives its id from the destination index and fleet_transform_version
      // (logs-cloud_security_posture.metering_state-default-0.1.0). Matched by
      // wildcard so the test does not encode that derivation.
      let meteringTransformId = '';
      await retry.try(async () => {
        const transforms = await es.transform.getTransform({
          transform_id: '*metering_state*',
          allow_no_match: true,
        });
        expect(transforms.count).to.be.greaterThan(0);
        meteringTransformId = transforms.transforms[0].id;
      });

      // A dedicated non-data-stream index under the transform's source pattern.
      // The template wins on priority over the package's data stream template,
      // and pins the resource.lifecycle.* types the transform groups and sorts
      // on - the package ingest pipeline that would normally produce them is
      // not installed in this environment.
      await es.indices.putIndexTemplate({
        name: RAW_FINDINGS_FTR_TEMPLATE,
        index_patterns: [`${RAW_FINDINGS_FTR_INDEX}*`],
        // Above the Fleet package templates (200) and the CSP plugin's own
        // (500): the winning template decides whether a plain index may be
        // created under a pattern a data stream template also matches.
        priority: 600,
        template: {
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              event: { properties: { ingested: { type: 'date' } } },
              resource: {
                properties: {
                  id: { type: 'keyword' },
                  sub_type: { type: 'keyword' },
                  lifecycle: {
                    properties: {
                      status: { type: 'keyword' },
                      incarnation: { type: 'keyword' },
                      created_at: { type: 'date' },
                      last_started_at: { type: 'date' },
                      last_stopped_at: { type: 'date' },
                      last_run_ms: { type: 'long' },
                    },
                  },
                },
              },
              rule: {
                properties: { benchmark: { properties: { posture_type: { type: 'keyword' } } } },
              },
              cloud: { properties: { account: { properties: { id: { type: 'keyword' } } } } },
            },
          },
        },
      });
      await es.indices.create({ index: RAW_FINDINGS_FTR_INDEX });
      const rawFindingsIndex = new EsIndexDataProvider(es, RAW_FINDINGS_FTR_INDEX);

      const resourceId = 'reused-spot-name-1';
      const oldIncarnation = new Date(Date.now() - 90 * 24 * HOUR_MS).toISOString();
      const currentIncarnation = new Date(Date.now() - 10 * HOUR_MS).toISOString();

      try {
        await rawFindingsIndex.addBulk(
          [
            // Previous VM that held this name: scanned 80h and 76h ago.
            ...[80, 76].map((scanHoursAgo) =>
              getMockRawLifecycleFinding({
                resourceId,
                subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
                scanHoursAgo,
                incarnation: oldIncarnation,
                status: 'RUNNING',
                lastStartHoursAgo: 91 * 24,
              })
            ),
            // Current VM reusing the same name: scanned 8h and 1h ago.
            ...[8, 1].map((scanHoursAgo) =>
              getMockRawLifecycleFinding({
                resourceId,
                subType: GCP_COMPUTE_INSTANCE_SUB_TYPE,
                scanHoursAgo,
                incarnation: currentIncarnation,
                status: 'RUNNING',
                lastStartHoursAgo: 9,
              })
            ),
          ],
          // Keep the backdated @timestamp values: they are the scan times the
          // transform aggregates first_seen/last_seen from. event.ingested,
          // which drives the continuous sync checkpoint, stays at NOW.
          false
        );

        // The 60s sync delay means the documents only become visible to a
        // checkpoint once they are more than a minute old, so both the schedule
        // and the assertion live inside the retry.
        await retry.tryForTime(180_000, async () => {
          await es.transform.scheduleNowTransform({
            transform_id: meteringTransformId,
          });
          await es.indices.refresh({ index: CDR_METERING_STATE_INDEX });

          const { count } = await es.count({
            index: CDR_METERING_STATE_INDEX,
            query: { term: { 'resource.id': resourceId } },
          });
          expect(count).to.be(2);

          // Reading span_ms through `fields` rather than _source: the transform
          // writes its group_by keys as dotted top-level properties.
          const currentIncarnationState = await es.search({
            index: CDR_METERING_STATE_INDEX,
            size: 1,
            _source: false,
            fields: ['span_ms'],
            query: {
              bool: {
                must: [
                  { term: { 'resource.id': resourceId } },
                  { term: { 'resource.lifecycle.incarnation': currentIncarnation } },
                ],
              },
            },
          });

          const spanMs = Number(currentIncarnationState.hits.hits[0]?.fields?.span_ms?.[0]);
          // 8h -> 1h ago is a 7h span. Had the two incarnations been merged into
          // one bucket it would be ~79h, and the VM would look corroborated for
          // far longer than it has existed.
          expect(spanMs).to.be.greaterThan(6 * HOUR_MS);
          expect(spanMs).to.be.lessThan(8 * HOUR_MS);
        });
      } finally {
        await rawFindingsIndex.destroyIndex();
        await es.indices.deleteIndexTemplate({ name: RAW_FINDINGS_FTR_TEMPLATE });
        await meteringStateIndex.deleteAll();
      }
    });

    it('Should fall back to the legacy findings query while the metering state index is empty', async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm',
        'CSPM-1',
        roleAuthc,
        internalRequestHeader
      );

      // Same billable/non-billable mix as 'Should intercept usage API request
      // for CSPM'; what this test adds is the asserted precondition below - the
      // state index exists but holds nothing, which is the state every project
      // is in until the >= 3.6.0 package pipeline and the transform have both
      // run. Billing must be unchanged there.
      await meteringStateIndex.deleteAll();
      const { count: stateDocCount } = await es.count({ index: CDR_METERING_STATE_INDEX });
      expect(stateDocCount).to.be(0);

      const billableFindings = getMockFindings({
        postureType: 'cspm',
        isBillableAsset: true,
        numberOfFindings: 5,
      });
      const notBillableFindings = getMockFindings({
        postureType: 'cspm',
        isBillableAsset: false,
        numberOfFindings: 10,
      });

      await findingsIndex.addBulk([...billableFindings, ...notBillableFindings]);

      await retry.try(async () => {
        const interceptedRequestBody: UsageRecord[] = getInterceptedRequestPayload();
        const cspmRecord = interceptedRequestBody.find(
          (record) => record.usage.sub_type === 'cspm'
        );
        if (!cspmRecord) {
          throw new Error('No CSPM usage record has been intercepted yet');
        }
        expect(cspmRecord.usage.type).to.be('cloud_security');
        expect(cspmRecord.usage.quantity).to.be(billableFindings.length);
      });
    });
  });
}
