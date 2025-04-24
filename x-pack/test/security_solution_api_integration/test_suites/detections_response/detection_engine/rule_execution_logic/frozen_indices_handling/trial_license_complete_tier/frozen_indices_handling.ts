/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { CreateRuleProps } from '../../../../../../../api_integration/services/security_solution_api.gen';

import { dataGeneratorFactory } from '../../../../utils';
import {
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');
  const retry = getService('retry');

  describe('@ess frozen indices queried', () => {
    const index = 'test_idx';
    const { indexListOfDocuments } = dataGeneratorFactory({ es, index, log });

    const cleanOperationsLIFO: Array<() => Promise<void>> = [];
    const addCleanOperation = (operation: () => Promise<void>) =>
      cleanOperationsLIFO.push(operation);
    const runCleanOperations = async () => {
      for (let idx = cleanOperationsLIFO.length - 1; idx >= 0; idx--) {
        await cleanOperationsLIFO[idx]();
      }
    };

    after(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await runCleanOperations();
    });

    it('should report the querying of frozen indices during rule execution', async () => {
      const id = uuidv4();
      const timestamp = new Date().toISOString();
      const firstDoc = {
        id,
        '@timestamp': timestamp,
        foo: 'bar',
      };

      await indexListOfDocuments([firstDoc]);

      const createRuleProps: CreateRuleProps = {
        body: {
          name: 'spammy_1s',
          description: 'Spammy query rule',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'low',
          type: 'query',
          query: 'foo: *',
          index: ['test_idx*'],
          interval: '1s',
          from: 'now-3600s',
        },
      };

      const startDate = new Date().toISOString();

      const { body: createdRuleResponse } = await securitySolutionApi
        .createRule(createRuleProps)
        .expect(200);
      const ruleId = createdRuleResponse.id;
      const ruleExecutionsResultUrl = `/internal/detection_engine/rules/${ruleId}/execution/results`;
      // Wait for a successful execution. The counter should be zero at this point
      await retry.try(async () => {
        const response = await supertest
          .get(`${ruleExecutionsResultUrl}?start=${startDate}&end=9999-12-31T23:59:59Z`)
          .set('elastic-api-version', '1')
          .send();
        expect(response.statusCode).to.be.equal(200);
        const { total, events } = response.body;
        expect(total).to.be.greaterThan(1);
        expect(events[0].status).to.be.equal('success');
        expect(events[0].frozen_indices_queried_count).to.eql(0);
      });

      // Create a snapshot repository
      const snapshotName = 'my-snapshot';
      await supertest
        .put('/api/snapshot_restore/repositories')
        .set('kbn-xsrf', 'foo')
        .send({
          name: snapshotName,
          type: 'fs',
          settings: {
            location: '/tmp',
          },
        })
        .expect(200);

      addCleanOperation(async () => {
        await supertest
          .delete(`/api/snapshot_restore/repositories/${snapshotName}`)
          .set('kbn-xsrf', 'foo')
          .send()
          .expect(200);
      });

      // We need to delete the index before deleting the snapshot
      addCleanOperation(async () => {
        await supertest
          .post('/api/index_management/indices/delete')
          .set('kbn-xsrf', 'foo')
          .send({
            indices: [`partial-${index}`],
          })
          .expect(200);
      });

      // Verify snapshot repository is working
      await supertest
        .get(`/api/snapshot_restore/repositories/${snapshotName}/verify`)
        .set('kbn-xsrf', 'foo')
        .send()
        .expect(200);

      // Create an ilm policy that moves the index to frozen after 0 days
      const frozenIlmName = 'frozen-ilm';
      await supertest
        .post('/api/index_lifecycle_management/policies')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'frozen-ilm',
          phases: {
            hot: {
              actions: {
                set_priority: {
                  priority: 100,
                },
              },
              min_age: '0ms',
            },
            frozen: {
              min_age: '0d',
              actions: {
                searchable_snapshot: {
                  snapshot_repository: 'my-snapshot',
                },
              },
            },
          },
        })
        .expect(200);

      addCleanOperation(async () => {
        await supertest
          .delete(`/api/index_lifecycle_management/policies/${frozenIlmName}`)
          .set('kbn-xsrf', 'foo')
          .send()
          .expect(200);
      });

      // Attach the policy to the test index
      await supertest
        .post('/api/index_lifecycle_management/index/add')
        .set('kbn-xsrf', 'foo')
        .send({
          indexName: index,
          policyName: frozenIlmName,
          alias: '',
        })
        .expect(200);

      addCleanOperation(async () => {
        await supertest
          .post('/api/index_lifecycle_management/index/remove')
          .set('kbn-xsrf', 'foo')
          .send({
            indexNames: [`partial-${index}`],
          })
          .expect(200);
      });

      await retry.try(async () => {
        const response = await supertest
          .get(`${ruleExecutionsResultUrl}?start=${startDate}&end=9999-12-31T23:59:59Z`)
          .set('elastic-api-version', '1')
          .send()
          .expect(200);
        const { total, events } = response.body;
        expect(total).to.be.greaterThan(1);
        expect(events[0].status).to.be.equal('success');
        expect(events[0].frozen_indices_queried_count).to.eql(1);
      });
    });
  });
};
