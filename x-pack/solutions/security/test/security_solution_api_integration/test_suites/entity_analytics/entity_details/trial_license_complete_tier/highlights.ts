/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { DEFAULT_ANOMALY_SCORE } from '@kbn/security-solution-plugin/common/constants';
import { createPackagePolicy } from '@kbn/cloud-security-posture-common/test_helper';
import { deleteAllRules } from '@kbn/detections-response-ftr-services/rules';
import { createAlertsIndex, deleteAllAlerts } from '@kbn/detections-response-ftr-services/alerts';
import { EsArchivePathBuilder } from '../../../../es_archive_path_builder';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  assetCriticalityRouteHelpersFactory,
  buildDocument,
  cleanAssetCriticality,
  createAndSyncRuleAndAlertsFactory,
  deleteAllRiskScores,
  riskEngineRouteHelpersFactory,
  waitForRiskScoresToBePresent,
} from '../../utils';
import {
  dataGeneratorFactory,
  forceStartDatafeeds,
  indexDocuments,
  setupMlModulesWithRetry,
} from '../../../detections_response/utils';
import { deleteAllDocuments } from '../../utils/elasticsearch_helpers';

const FINDINGS_LATEST_INDEX = 'logs-cloud_security_posture.findings_latest-default';
const VULNERABILITIES_LATEST_INDEX = 'logs-cloud_security_posture.vulnerabilities_latest-default';

export default function ({ getService }: FtrProviderContext) {
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);
  const config = getService('config');
  const retry = getService('retry');

  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditPath = dataPathBuilder.getPath('auditbeat/hosts');

  const hostName = 'rock01';

  const anonymizedFields = ['host.name', 'user.name', 'service.name'];
  const notAnonymizedFields = ['_id', '@timestamp', 'asset.criticality'];
  const mockAnonymizationFields = [...anonymizedFields, ...notAnonymizedFields].map(
    (field, index) => ({
      id: index + 1 + '',
      field,
      allowed: true,
      anonymized: anonymizedFields.includes(field),
    })
  );

  const vulnerabilityMockData = [
    {
      ['@timestamp']: new Date().toISOString(),
      host: {
        name: hostName,
      },
      resource: {
        name: 'NameNama',
        id: '12345',
      },
      result: {
        evaluation: 'failed',
      },
      vulnerability: {
        severity: 'MEDIUM',
        package: {
          name: 'github.com/aws/aws-sdk-go',
          version: 'v1.42.30',
        },
      },
      cvss: {
        redhat: {
          V3Vector: 'CVSS:3.1/AV:L/AC:H/PR:L/UI:N/S:C/C:H/I:N/A:N',
          V3Score: 5.6,
        },
      },
    },
  ];

  const siemModule = 'security_linux_v3';
  const mlJobId = 'v3_linux_anomalous_network_activity';

  describe('@ess @serverless @skipInServerlessMKI Entity Details - Highlights API', () => {
    const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
    const { indexListOfDocuments } = dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });
    const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
    let agentPolicyId: string;
    let packagePolicyId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await createAlertsIndex(supertest, log);
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );

      await assetCriticalityRoutes.upsert({
        id_field: 'host.name',
        id_value: hostName,
        criticality_level: 'high_impact',
      });

      await indexListOfDocuments([buildDocument({ host: { name: hostName } })]);

      await createAndSyncRuleAndAlerts({
        query: `host.name:${hostName}`,
        alerts: 1,
        riskScore: 21,
        maxSignals: 100,
      });

      await riskEngineRoutes.init();
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');

      await supertest
        .post(`/api/fleet/setup`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;
      const packagePolicyItem = await createPackagePolicy(
        supertest,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm'
      );
      packagePolicyId = packagePolicyItem.id;
      await indexDocuments({
        es,
        index: VULNERABILITIES_LATEST_INDEX,
        documents: vulnerabilityMockData,
        log,
      });

      // Order is critical here: auditbeat data must be loaded before attempting to start the ML job,
      // as the job looks for certain indices on start
      await kibanaServer.uiSettings.update({
        [DEFAULT_ANOMALY_SCORE]: 1,
      });
      await esArchiver.load(auditPath);
      await setupMlModulesWithRetry({ module: siemModule, supertest, retry });
      await forceStartDatafeeds({ jobId: mlJobId, rspCode: 200, supertest });
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/anomalies'
      );
    });

    after(async () => {
      await riskEngineRoutes.cleanUp();
      await cleanAssetCriticality({ log, es });
      await deleteAllRiskScores(log, es);
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
      await supertest
        .post(`/api/fleet/package_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packagePolicyIds: [packagePolicyId] });
      await deleteAllDocuments(es, FINDINGS_LATEST_INDEX);
      await deleteAllDocuments(es, VULNERABILITIES_LATEST_INDEX);
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await esArchiver.unload(auditPath);
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/anomalies'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.update({
        [DEFAULT_ANOMALY_SCORE]: 50,
      });
    });

    const baseRequestBody = {
      anonymizationFields: mockAnonymizationFields,
      from: Date.now() - 24 * 60 * 60 * 1000 * 365 * 99, // 99 years ago
      to: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      connectorId: 'preconfigured-bedrock',
    };

    it('should return highlights for entity', async () => {
      const { body } = await entityAnalyticsApi
        .entityDetailsHighlights({
          body: {
            ...baseRequestBody,
            entityType: 'host' as const,
            entityIdentifier: hostName,
          },
        })
        .expect(200);

      expect(body.summary).toEqual({
        assetCriticality: [
          {
            '@timestamp': [expect.any(String)],
            'asset.criticality': ['high_impact'],
            'host.name': [expect.any(String)],
          },
        ],
        riskScore: [
          {
            id_field: ['host.name'],
            alert_inputs: [
              {
                contribution_score: [expect.any(String)],
                description: [expect.any(String)],
                risk_score: ['21'],
                timestamp: [expect.any(String)],
              },
            ],
            asset_criticality_contribution_score: expect.any(String),
            score: [expect.any(Number)],
          },
        ],
        vulnerabilities: [
          {
            '@timestamp': [expect.any(String)],
            _id: [expect.any(String)],
            'host.name': [expect.any(String)],
          },
        ],
        vulnerabilitiesTotal: {
          CRITICAL: 0,
          HIGH: 0,
          LOW: 0,
          MEDIUM: 1,
          NONE: 0,
        },
        anomalies: [
          {
            id: 'v3_linux_anomalous_network_activity',
            'job.description':
              'Security: Linux - Looks for unusual processes using the network which could indicate command-and-control, lateral movement, persistence, or data exfiltration activity.',
            'job.name': 'Unusual Linux Network Activity',
            score: 4.834237150691662,
          },
          {
            id: 'v3_linux_anomalous_network_activity',
            'job.description':
              'Security: Linux - Looks for unusual processes using the network which could indicate command-and-control, lateral movement, persistence, or data exfiltration activity.',
            'job.name': 'Unusual Linux Network Activity',
            score: 4.834237150691662,
          },
        ],
      });
      expect(body.replacements).toEqual(expect.any(Object));
      expect(body.prompt).toContain(
        'Generate structured information for entity so a Security analyst can act.'
      );

      // check if anonymization fields are working
      expect(JSON.stringify(body.summary)).not.toContain(hostName);
      expect(JSON.stringify(body.replacements)).toContain(hostName);
    });

    it('should handle non-existent host entity', async () => {
      const { body } = await entityAnalyticsApi
        .entityDetailsHighlights({
          body: {
            ...baseRequestBody,
            entityType: 'host' as const,
            entityIdentifier: 'un-existent-host',
          },
        })
        .expect(200);

      expect(body.summary).toEqual({
        assetCriticality: [],
        riskScore: [],
        vulnerabilities: [],
        vulnerabilitiesTotal: {
          CRITICAL: 0,
          HIGH: 0,
          LOW: 0,
          MEDIUM: 0,
          NONE: 0,
        },
        anomalies: [],
      });
      expect(Object.values(body.replacements)).toEqual(['un-existent-host']);
      expect(body.prompt).toContain(
        'Generate structured information for entity so a Security analyst can act.'
      );
    });

    describe('anonymization fields handling', () => {
      it('should work with empty anonymization fields array', async () => {
        const requestBody = {
          ...baseRequestBody,
          entityType: 'host' as const,
          entityIdentifier: hostName,
          anonymizationFields: [],
        };

        await entityAnalyticsApi
          .entityDetailsHighlights({
            body: requestBody,
          })
          .expect(200);
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should handle very long entity identifiers', async () => {
        const longIdentifier = 'a'.repeat(1000); // 1000 character identifier
        const requestBody = {
          ...baseRequestBody,
          entityType: 'host' as const,
          entityIdentifier: longIdentifier,
        };

        await entityAnalyticsApi
          .entityDetailsHighlights({
            body: requestBody,
          })
          .expect(200);
      });

      it('should handle entity identifiers with special characters', async () => {
        const specialIdentifiers = [
          'test-host.example.com',
          'test_host_123',
          'test host with spaces',
          'test-host@domain.com',
          'test-host!@#$%^&*()',
          'test-host-ñáéíóú',
          'test-host-中文',
        ];

        for (const identifier of specialIdentifiers) {
          const requestBody = {
            ...baseRequestBody,
            entityType: 'host' as const,
            entityIdentifier: identifier,
          };

          await entityAnalyticsApi
            .entityDetailsHighlights({
              body: requestBody,
            })
            .expect(200);
        }
      });
    });
  });
}
