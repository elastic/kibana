/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { createRule, deleteAllRules, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import {
  getEqlRuleParams,
  getOpenAlerts,
  dataGeneratorFactory,
  getLatestSecurityRuleExecutionMetricsFromEventLog,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const { indexListOfDocuments: indexListOfSourceDocuments } = dataGeneratorFactory({
    es,
    index: 'logs-1',
    log,
  });

  describe('@ess @serverless Rule execution metrics for EQL rules', () => {
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
            host: {
              name: 'test',
            },
          };
          const rule = getEqlRuleParams({
            index: ['logs-1'],
            query: 'any where true',
            from: 'now-35m',
            interval: '30m',
            enabled: true,
          });

          await indexListOfSourceDocuments([document]);

          const createdRule = await createRule(supertest, log, rule);
          const alerts = await getOpenAlerts(supertest, log, es, createdRule);

          expect(alerts.hits.hits).toHaveLength(1);

          const { alerts_candidate_count } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(alerts_candidate_count).toBe(1);
        });

        it('records alerts_candidate_count higher than the number of suppressed alerts', async () => {
          const timestamp = new Date().toISOString();
          const document = {
            '@timestamp': timestamp,
            host: {
              name: 'host-candidate-suppression-metrics',
            },
          };
          const rule = getEqlRuleParams({
            index: ['logs-1'],
            query: 'any where true',
            alert_suppression: {
              group_by: ['host.name'],
              duration: {
                value: 300,
                unit: 'm',
              },
              missing_fields_strategy: 'suppress',
            },
            from: 'now-35m',
            interval: '30m',
            enabled: true,
          });

          await indexListOfSourceDocuments([document, document]);

          const createdRule = await createRule(supertest, log, rule);
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
