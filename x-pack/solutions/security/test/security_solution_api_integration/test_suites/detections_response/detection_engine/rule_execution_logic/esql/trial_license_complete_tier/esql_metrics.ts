/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { createRule, deleteAllRules, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import {
  getEsqlRuleParams,
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
    index: 'test-data-1',
    log,
  });

  describe('@ess @serverless Rule execution metrics for ES|QL rules', () => {
    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);

      await es.indices.delete({
        index: 'test-data-1,test-data-2',
        ignore_unavailable: true,
      });

      const mappings: MappingTypeMapping = {
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
      };
      await es.indices.create({
        index: 'test-data-1',
        mappings,
      });
      await es.indices.create({
        index: 'test-data-2',
        mappings,
      });
    });

    describe('metrics collection', () => {
      describe('matched_indices_count', () => {
        it('records matched_indices_count for one source index in the ES|QL query', async () => {
          const timestamp = new Date().toISOString();
          const document = {
            '@timestamp': timestamp,
            host: { name: 'test-1' },
          };
          const rule = getEsqlRuleParams({
            query: 'from test-data-1 metadata _id, _index, _version',
            from: 'now-35m',
            interval: '30m',
            enabled: true,
          });

          await indexListOfSourceDocuments([document]);

          const createdRule = await createRule(supertest, log, rule);

          const { matched_indices_count } = await getLatestSecurityRuleExecutionMetricsFromEventLog(
            es,
            log,
            createdRule.id
          );

          expect(matched_indices_count).toBe(1);
        });

        it('records matched_indices_count for a single index pattern with wildcard in the ES|QL query', async () => {
          const timestamp = new Date().toISOString();
          const document = {
            '@timestamp': timestamp,
            host: { name: 'test-1' },
          };
          const rule = getEsqlRuleParams({
            query: 'from test-data-* metadata _id, _index, _version',
            from: 'now-35m',
            interval: '30m',
            enabled: true,
          });

          await indexListOfSourceDocuments([document]);

          const createdRule = await createRule(supertest, log, rule);

          const { matched_indices_count } = await getLatestSecurityRuleExecutionMetricsFromEventLog(
            es,
            log,
            createdRule.id
          );

          expect(matched_indices_count).toBe(2);
        });

        it('records matched_indices_count for multiple source indices in the ES|QL query', async () => {
          const timestamp = new Date().toISOString();
          const document = {
            '@timestamp': timestamp,
            host: { name: 'test-1' },
          };
          const rule = getEsqlRuleParams({
            query: 'from test-da*, test-data-1, test-data-2 metadata _id, _index, _version',
            from: 'now-35m',
            interval: '30m',
            enabled: true,
          });

          await indexListOfSourceDocuments([document]);

          const createdRule = await createRule(supertest, log, rule);

          const { matched_indices_count } = await getLatestSecurityRuleExecutionMetricsFromEventLog(
            es,
            log,
            createdRule.id
          );

          expect(matched_indices_count).toBe(2);
        });
      });

      describe('alerts_candidate_count', () => {
        it('records alerts_candidate_count value', async () => {
          const timestamp = new Date().toISOString();
          const document = {
            '@timestamp': timestamp,
            host: { name: 'test-1' },
          };
          const rule = getEsqlRuleParams({
            query: 'from test-data-1 metadata _id, _index, _version',
            from: 'now-35m',
            interval: '30m',
            enabled: true,
          });

          await indexListOfSourceDocuments([document]);

          const createdRule = await createRule(supertest, log, rule);

          const { alerts_candidate_count } =
            await getLatestSecurityRuleExecutionMetricsFromEventLog(es, log, createdRule.id);

          expect(alerts_candidate_count).toBe(1);
        });

        it('records alerts_candidate_count higher than the number of suppressed alerts', async () => {
          const timestamp = new Date().toISOString();
          const document = {
            '@timestamp': timestamp,
            host: { name: 'test-1' },
          };
          const rule = getEsqlRuleParams({
            query: 'from test-data-1 metadata _id, _index, _version',
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
