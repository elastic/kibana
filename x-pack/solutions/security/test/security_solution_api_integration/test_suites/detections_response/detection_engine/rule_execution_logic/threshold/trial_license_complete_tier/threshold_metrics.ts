/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
  waitForRuleSuccess,
} from '@kbn/detections-response-ftr-services';
import {
  dataGeneratorFactory,
  getLatestSecurityRuleExecutionMetricsFromEventLog,
  getOpenAlerts,
} from '../../../../utils';
import { getThresholdRuleParams } from '../../../../utils/rules/get_rule_params';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const detectionsApi = getService('detectionsApi');
  const { indexListOfDocuments: indexListOfSourceDocuments } = dataGeneratorFactory({
    es,
    index: 'logs-1',
    log,
  });

  describe('@ess @serverless @serverlessQA Rule execution metrics for Threshold rules', () => {
    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);

      await es.indices.delete({
        index: 'logs-1',
        ignore_unavailable: true,
      });
      await es.indices.create({
        index: 'logs-1',
        mappings: {
          properties: {
            '@timestamp': {
              type: 'date',
            },
            host: {
              properties: {
                name: {
                  type: 'keyword',
                },
              },
            },
          },
        },
      });
    });

    describe('metrics collection', () => {
      describe('alerts_candidate_count', () => {
        it('records alerts_candidate_count value', async () => {
          const timestamp = new Date().toISOString();
          const document = {
            '@timestamp': timestamp,
            host: { name: 'test-1' },
          };

          await indexListOfSourceDocuments([document, document]);

          const createdRule = await createRule(
            supertest,
            log,
            getThresholdRuleParams({
              index: ['logs-1'],
              query: '*:*',
              threshold: {
                field: ['host.name'],
                value: 2,
              },
              from: 'now-35m',
              interval: '30m',
              enabled: true,
            })
          );

          const { alerts_candidate_count } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(alerts_candidate_count).toBe(1);
        });

        it('records alerts_candidate_count for multiple distinct threshold buckets', async () => {
          const timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          const document1 = {
            '@timestamp': timestamp,
            host: { name: 'test-1' },
          };

          await indexListOfSourceDocuments([document1, document1]);

          // Run rule for the first time
          const createdRule = await createRule(
            supertest,
            log,
            getThresholdRuleParams({
              index: ['logs-1'],
              query: '*:*',
              threshold: {
                field: ['host.name'],
                value: 2,
              },
              alert_suppression: {
                duration: {
                  value: 300,
                  unit: 'm',
                },
              },
              from: 'now-35m',
              interval: '30m',
              enabled: true,
            })
          );
          await waitForRuleSuccess({
            supertest,
            log,
            id: createdRule.id,
          });
          const alerts = await getOpenAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);

          const { alerts_candidate_count: alertsCandidateCount } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(alertsCandidateCount).toBe(1);

          const nextTimestamp = new Date().toISOString();
          const document2 = {
            '@timestamp': nextTimestamp,
            host: { name: 'test-1' },
          };

          await indexListOfSourceDocuments([document2, document2]);

          // Disable and re-enable the rule to run it again. Alert suppression should work now.
          await detectionsApi.patchRule({ body: { id: createdRule.id, enabled: false } });
          await detectionsApi.patchRule({
            body: { id: createdRule.id, from: 'now-1m', enabled: true },
          });
          await waitForRuleSuccess({
            supertest,
            log,
            id: createdRule.id,
          });

          const nextAlerts = await getOpenAlerts(supertest, log, es, createdRule);

          // We have only 1 alert after 2 rule runs
          expect(nextAlerts.hits.hits).toHaveLength(1);

          const { alerts_candidate_count: nextAlertsCandidateCount } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(nextAlertsCandidateCount).toBe(1);
        });
      });
    });
  });
};
