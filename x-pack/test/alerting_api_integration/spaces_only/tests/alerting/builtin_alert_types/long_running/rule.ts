/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { Spaces } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getEventLog } from '../../../../../common/lib';

const RULE_INTERVAL_SECONDS = 3;

// eslint-disable-next-line import/no-default-export
export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('long running rule', async () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('writes event log document for timeout for each rule execution that ends in timeout - every execution times out', async () => {
      const ruleId = await createRule({
        name: 'long running rule',
        ruleTypeId: 'test.patternLongRunning.cancelAlertsOnRuleTimeout',
        pattern: [true, true, true, true, true],
      });
      const errorStatuses: Array<{ status: string; error: { message: string; reason: string } }> =
        [];
      // get the events we're expecting
      const events = await retry.try(async () => {
        const { body: rule } = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`
        );
        if (rule.execution_status.status === 'error') {
          errorStatuses.push(rule.execution_status);
        }
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            ['execute', { gte: 4 }],
            // by the time we see 4 "execute" events, we should also see the following:
            ['execute-start', { gte: 4 }],
            ['execute-timeout', { gte: 4 }],
          ]),
        });
      });

      // no active|recovered|new instance events should exist
      expect(events.filter((event) => event?.event?.action === 'active-instance').length).to.equal(
        0
      );
      expect(events.filter((event) => event?.event?.action === 'new-instance').length).to.equal(0);
      expect(
        events.filter((event) => event?.event?.action === 'recovered-instance').length
      ).to.equal(0);

      // rule execution status should be in error with reason timeout
      const { status } = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`
      );
      expect(status).to.eql(200);

      expect(errorStatuses.length).to.be.greaterThan(0);
      const lastErrorStatus = errorStatuses.pop();
      expect(lastErrorStatus?.status).to.eql('error');
      expect(lastErrorStatus?.error.message).to.eql(
        `test.patternLongRunning.cancelAlertsOnRuleTimeout:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of 3s`
      );
      expect(lastErrorStatus?.error.reason).to.eql('timeout');
    });

    it('writes event log document for timeout for each rule execution that ends in timeout - some executions times out', async () => {
      const ruleId = await createRule({
        name: 'long running rule',
        ruleTypeId: 'test.patternLongRunning.cancelAlertsOnRuleTimeout',
        pattern: [false, true, false, false],
      });

      // get the events we're expecting
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            // make sure the counts of the # of events per type are as expected
            ['execute', { gte: 4 }],
            // by the time we see 4 "execute" events, we should also see the following:
            ['execute-start', { gte: 4 }],
            ['execute-timeout', { gte: 1 }],
            ['new-instance', { gte: 1 }],
            ['active-instance', { gte: 2 }],
          ]),
        });
      });

      const { status, body: rule } = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`
      );
      expect(status).to.eql(200);
      expect(rule.execution_status.status).to.eql('active');
    });

    it('still logs alert docs when rule exceeds timeout when cancelAlertsOnRuleTimeout is false on rule type', async () => {
      const ruleId = await createRule({
        name: 'long running rule',
        ruleTypeId: 'test.patternLongRunning',
        pattern: [true, true, true, true],
      });
      // get the events we're expecting
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            // make sure the counts of the # of events per type are as expected
            ['execute-start', { gte: 4 }],
            ['execute', { gte: 4 }],
            ['execute-timeout', { gte: 4 }],
            ['new-instance', { gte: 1 }],
            ['active-instance', { gte: 3 }],
          ]),
        });
      });
    });

    interface CreateRuleParams {
      name: string;
      ruleTypeId: string;
      pattern: boolean[];
    }

    async function createRule(params: CreateRuleParams): Promise<string> {
      const { status, body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: params.ruleTypeId,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            pattern: params.pattern,
          },
        });

      expect(status).to.be(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }
  });
}
