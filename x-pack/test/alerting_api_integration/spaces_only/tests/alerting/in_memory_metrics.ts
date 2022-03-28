/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  createWaitForExecutionCount,
  ESTestIndexTool,
  getEventLog,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createEsDocuments } from './builtin_alert_types/lib/create_test_data';

const NODE_RULES_MONITORING_COLLECTION_URL = `/api/monitoring_collection/node_rules`;
const RULE_INTERVAL_SECONDS = 6;
const RULE_INTERVALS_TO_WRITE = 5;
const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;
const ES_GROUPS_TO_WRITE = 3;

// eslint-disable-next-line import/no-default-export
export default function inMemoryMetricsAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const waitForExecutionCount = createWaitForExecutionCount(supertest, Spaces.space1.id);

  describe('inMemoryMetrics', () => {
    let endDate: string;
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      // write documents in the future, figure out the end date
      const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
      endDate = new Date(endDateMillis).toISOString();
    });

    after(async () => await objectRemover.removeAll());

    it('should count executions', async () => {
      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '1s' } }));
      expect(createResponse.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, createResponse.body.id, 'rule', 'alerting');

      await waitForExecutionCount(1, createResponse.body.id);

      // We can't really separate this test from other tests running
      // so we can't get an accurate count of executions/failures/timeouts but
      // we can test that they are at least there

      const getResponse = await supertest.get(NODE_RULES_MONITORING_COLLECTION_URL);
      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.node_rules.executions).to.greaterThan(0);
    });

    it('should count failures', async () => {
      const pattern = [false]; // Once we start failing, the rule type doesn't update state so the failures have to be at the end
      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternSuccessOrFailure',
            schedule: { interval: '1s' },
            params: {
              pattern,
            },
          })
        );
      expect(createResponse.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, createResponse.body.id, 'rule', 'alerting');

      await waitForExecutionCount(1, createResponse.body.id);

      // We can't really separate this test from other tests running
      // so we can't get an accurate count of executions/failures/timeouts but
      // we can test that they are at least there

      const getResponse = await supertest.get(NODE_RULES_MONITORING_COLLECTION_URL);
      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.node_rules.failures).to.greaterThan(0);
    });

    it('should count timeouts', async () => {
      const body = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        return;
      }

      await createEsDocuments(
        es,
        esTestIndexTool,
        endDate,
        RULE_INTERVALS_TO_WRITE,
        RULE_INTERVAL_MILLIS,
        ES_GROUPS_TO_WRITE
      );
      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.cancellableRule',
            schedule: { interval: '4s' },
            params: {
              doLongSearch: true,
              doLongPostProcessing: false,
            },
          })
        );
      expect(createResponse.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, createResponse.body.id, 'rule', 'alerting');

      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createResponse.body.id,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      // We can't really separate this test from other tests running
      // so we can't get an accurate count of executions/failures/timeouts but
      // we can test that they are at least there

      const getResponse = await supertest.get(NODE_RULES_MONITORING_COLLECTION_URL);
      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.node_rules.timeouts).to.greaterThan(0);
    });
  });
}
