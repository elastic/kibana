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
  getLatestSecurityRuleExecutionMetricsFromEventLog,
  getOpenAlerts,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  const mlJobId = 'v3_linux_anomalous_network_activity_ea';
  const sourceEventsIndexName = '.ml-anomalies-custom-v3_linux_anomalous_network_activity_ea';

  const { indexListOfDocuments } = dataGeneratorFactory({
    es,
    index: sourceEventsIndexName,
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
    beforeEach(async () => {
      await es.indices.delete({
        index: sourceEventsIndexName,
        ignore_unavailable: true,
      });

      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('metrics collection', () => {
      describe('matched_indices_count', () => {
        it('does not record matched_indices_count for machine learning rules', async () => {
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
          await getOpenAlerts(supertest, log, es, createdRule);

          const { matched_indices_count } = await getLatestSecurityRuleExecutionMetricsFromEventLog(
            es,
            log,
            createdRule.id
          );

          expect(matched_indices_count).toBeUndefined();
        });
      });

      describe('alerts_candidate_count', () => {
        it('records alerts_candidate_count value', async () => {
          const timestamp = new Date().toISOString();
          const anomaly = {
            ...baseAnomaly,
            timestamp,
          };
          await indexListOfDocuments([anomaly]);

          const createdRule = await createRule(
            supertest,
            log,
            getMLRuleParams({
              ...sharedMlRuleRewrites,
              anomaly_threshold: 30,
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

      describe('alerts_suppressed_count', () => {
        it('records alerts_suppressed_count as 0 when no suppression is configured', async () => {
          const timestamp = new Date().toISOString();
          const anomaly = {
            ...baseAnomaly,
            timestamp,
          };
          await indexListOfDocuments([anomaly]);

          const createdRule = await createRule(
            supertest,
            log,
            getMLRuleParams({
              ...sharedMlRuleRewrites,
              anomaly_threshold: 30,
              enabled: true,
            })
          );
          const alerts = await getOpenAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);

          const { alerts_suppressed_count } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(alerts_suppressed_count).toBe(0);
        });

        it('records alerts_suppressed_count when alerts are suppressed', async () => {
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

          const { alerts_suppressed_count } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(alerts_suppressed_count).toBe(1);
        });
      });
    });
  });
};
