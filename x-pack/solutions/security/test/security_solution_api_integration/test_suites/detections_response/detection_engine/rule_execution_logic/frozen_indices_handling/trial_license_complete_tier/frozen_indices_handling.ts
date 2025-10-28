/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import type { CreateRuleProps } from '@kbn/security-solution-test-api-clients/supertest/detections.gen';

import { dataGeneratorFactory } from '../../../../utils';
import {
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { moveIndexToFrozenDataTier } from '../../../../utils/frozen_data_tier';

type CleanupFn = () => Promise<void>;
type CleanupStack = ReturnType<typeof getCleanupStack>;
const getCleanupStack = () => {
  let cleanOperationsStack: CleanupFn[] = [];

  return {
    push(operation: CleanupFn) {
      cleanOperationsStack.push(operation);
    },
    async runCleanup() {
      for (let idx = cleanOperationsStack.length - 1; idx >= 0; idx--) {
        await cleanOperationsStack[idx]();
      }

      cleanOperationsStack = [];
    },
  };
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const detectionsApi = getService('detectionsApi');
  const retry = getService('retry');

  const indexSampleData = async (index: string) => {
    const { indexListOfDocuments } = dataGeneratorFactory({ es, index, log });
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const firstDoc = {
      id,
      '@timestamp': timestamp,
      foo: 'bar',
    };

    await indexListOfDocuments([firstDoc]);
  };

  const createTestRule = async (indices: string[]) => {
    const createRuleProps: CreateRuleProps = {
      body: {
        name: `spammy_rule`,
        description: 'Spammy query rule',
        enabled: true,
        risk_score: 1,
        rule_id: 'rule-1',
        severity: 'low',
        type: 'query',
        query: 'foo: *',
        index: indices,
        from: 'now-3600s',
      },
    };

    const { body: createdRuleResponse } = await detectionsApi
      .createRule(createRuleProps)
      .expect(200);

    return createdRuleResponse.id;
  };

  const getRuleExecutionResult = async (ruleId: string) => {
    const startDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const ruleExecutionsResultUrl = `/internal/detection_engine/rules/${ruleId}/execution/results`;
    return await supertest
      .get(`${ruleExecutionsResultUrl}?start=${startDate}&end=9999-12-31T23:59:59Z`)
      .set('elastic-api-version', '1')
      .send()
      .expect(200);
  };

  describe('@ess frozen indices queried', () => {
    let cleanupStack: CleanupStack;
    let ruleId: string;
    beforeEach(async () => {
      cleanupStack = getCleanupStack();
    });

    afterEach(async () => {
      await cleanupStack.runCleanup();
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('when an index that is not in the frozen data tier is queried', () => {
      const index = `test_idx-${uuidv4()}`;

      it('should not report that frozen indices were queried', async () => {
        await indexSampleData(index);

        ruleId = await createTestRule(['test_idx*']);

        // Wait for a successful execution. The counter should be zero at this point
        await retry.try(async () => {
          const response = await getRuleExecutionResult(ruleId);
          expect(response.statusCode).to.be.equal(200);
          const { total, events } = response.body;
          expect(total).to.be.equal(1);
          expect(events[0].status).to.be.equal('success');
          expect(events[0].frozen_indices_queried_count).to.be.equal(0);
        });

        cleanupStack.push(async () => {
          await es.indices.delete({
            index,
          });
        });
      });
    });

    describe('when an index that is in the frozen data tier is queried', () => {
      const index = `test_idx-${uuidv4()}`;

      it('should report that frozen indices were queried', async () => {
        await indexSampleData(index);

        const { newIndexName, snapshotRepositoryName, ilmPolicyName } =
          await moveIndexToFrozenDataTier({ es, index, retry });

        ruleId = await createTestRule(['test_idx*']);

        await retry.try(async () => {
          const response = await getRuleExecutionResult(ruleId);
          expect(response.statusCode).to.be.equal(200);
          const { total, events } = response.body;
          expect(total).to.be.equal(1);
          expect(events[0].status).to.be.equal('success');
          expect(events[0].frozen_indices_queried_count).to.be.equal(1);
        });

        cleanupStack.push(async () => {
          await es.snapshot.deleteRepository({
            name: snapshotRepositoryName,
          });
        });

        cleanupStack.push(async () => {
          await es.ilm.deleteLifecycle({
            name: ilmPolicyName,
          });
        });

        // We need to remove the index first before removing the snapshot. This is why we add it last
        cleanupStack.push(async () => {
          await es.indices.delete({
            index: newIndexName,
          });
        });
      });
    });

    describe('when an index with a name starting with "partial-" is queried', () => {
      const indexPrefixedWithPatial = `partial-some-other-index-${uuidv4()}`;

      it('should not report that frozen indices were queried', async () => {
        await indexSampleData(indexPrefixedWithPatial);

        ruleId = await createTestRule(['partial-*']);

        // Wait for a successful execution. The counter should be zero at this point
        await retry.try(async () => {
          const response = await getRuleExecutionResult(ruleId);
          expect(response.statusCode).to.be.equal(200);
          const { total, events } = response.body;
          expect(total).to.be.equal(1);
          expect(events[0].status).to.be.equal('success');
          expect(events[0].frozen_indices_queried_count).to.be.equal(0);
        });

        cleanupStack.push(async () => {
          await es.indices.delete({
            index: indexPrefixedWithPatial,
          });
        });
      });
    });
  });
};
