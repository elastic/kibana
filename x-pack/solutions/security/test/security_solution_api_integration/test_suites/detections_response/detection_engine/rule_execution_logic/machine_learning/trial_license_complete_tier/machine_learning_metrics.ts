/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { createRule, deleteAllAlerts, deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { Anomaly } from '@kbn/security-solution-plugin/server/lib/machine_learning';
import {
  getMLRuleParams,
  dataGeneratorFactory,
  forceStartDatafeeds,
  getLatestSecurityRuleExecutionMetricsFromEventLog,
  getOpenAlerts,
  setupMlModulesWithRetry,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const config = getService('config');
  const retry = getService('retry');

  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditPath = dataPathBuilder.getPath('auditbeat/hosts');

  const siemModule = 'security_linux_v3';
  const mlJobId = 'v3_linux_anomalous_network_activity_ea';

  const { indexListOfDocuments } = dataGeneratorFactory({
    es,
    index: '.ml-anomalies-custom-v3_linux_anomalous_network_activity_ea',
    log,
  });

  const sharedMlRuleRewrites = {
    name: 'Test ML rule',
    description: 'Test ML rule description',
    risk_score: 50,
    severity: 'critical',
    machine_learning_job_id: mlJobId,
    rule_id: 'ml-rule-id',
  } as const;

  const baseAnomaly: Partial<Anomaly> = {
    is_interim: false,
    record_score: 43,
    result_type: 'record',
    job_id: mlJobId,
    'user.name': ['root'],
  };

  describe('@ess @serverless Rule execution metrics for Machine Learning rules', () => {
    before(async () => {
      await esArchiver.load(auditPath);
      await setupMlModulesWithRetry({ module: siemModule, supertest, retry });
      await forceStartDatafeeds({ jobId: mlJobId, rspCode: 200, supertest });
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/anomalies'
      );
    });

    after(async () => {
      await esArchiver.unload(auditPath);
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/anomalies'
      );
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('metrics collection', () => {
      describe('alerts_candidate_count', () => {
        it('records alerts_candidate_count value', async () => {
          const createdRule = await createRule(
            supertest,
            log,
            getMLRuleParams({
              ...sharedMlRuleRewrites,
              anomaly_threshold: 30,
              from: '1900-01-01T00:00:00.000Z',
              enabled: true,
            })
          );
          const alerts = await getOpenAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);

          const { alerts_candidate_count } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(alerts_candidate_count).toBe(1);
        });

        it('records alerts_candidate_count higher than the number of suppressed alerts', async () => {
          const timestamp = new Date().toISOString();
          const anomaly = {
            ...baseAnomaly,
            timestamp,
          };
          await indexListOfDocuments([anomaly, anomaly]);

          const createdRule = await createRule(
            supertest,
            log,
            getMLRuleParams({
              ...sharedMlRuleRewrites,
              anomaly_threshold: 40,
              enabled: true,
              alert_suppression: {
                group_by: ['user.name'],
                missing_fields_strategy: 'suppress',
              },
              from: timestamp,
            })
          );
          const alerts = await getOpenAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);

          const { alerts_candidate_count } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(alerts_candidate_count).toBe(2);
        });
      });
    });
  });
};
