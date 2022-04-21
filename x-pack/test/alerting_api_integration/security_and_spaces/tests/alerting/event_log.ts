/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover, getEventLog } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { validateEvent } from '../../../spaces_only/tests/alerting/event_log';

// eslint-disable-next-line import/no-default-export
export default function eventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('eventLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should generate events for alert decrypt errors', async () => {
      const spaceId = Spaces[0].id;
      const response = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.noop',
            schedule: { interval: '1s' },
            throttle: null,
          })
        );

      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(spaceId, alertId, 'rule', 'alerting');

      await retry.try(async () => {
        // break AAD
        await supertest
          .put(`${getUrlPrefix(spaceId)}/api/alerts_fixture/saved_object/alert/${alertId}`)
          .set('kbn-xsrf', 'foo')
          .send({
            attributes: {
              name: 'bar',
            },
          })
          .expect(200);
      });

      const events = await retry.try(async () => {
        // there can be a successful execute before the error one
        const someEvents = await getEventLog({
          getService,
          spaceId,
          type: 'alert',
          id: alertId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });
        const errorEvents = someEvents.filter(
          (event) => event?.kibana?.alerting?.status === 'error'
        );
        if (errorEvents.length === 0) {
          throw new Error('no execute/error events yet');
        }
        return errorEvents;
      });

      const event = events[0];
      expect(event).to.be.ok();

      validateEvent(event, {
        spaceId,
        savedObjects: [{ type: 'alert', id: alertId, rel: 'primary', type_id: 'test.noop' }],
        outcome: 'failure',
        message: `test.noop:${alertId}: execution failed`,
        errorMessage: 'Unable to decrypt attribute "apiKey"',
        status: 'error',
        reason: 'decrypt',
        shouldHaveTask: true,
        ruleTypeId: response.body.rule_type_id,
        consumer: 'alertsFixture',
        rule: {
          id: alertId,
          category: response.body.rule_type_id,
          license: 'basic',
          ruleset: 'alertsFixture',
        },
      });
    });
  });
}
