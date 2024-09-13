/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function enableWithCircuitBreakerTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Enable with circuit breaker', () => {
    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should prevent rules from being enabled if max schedules have been reached', async () => {
      const { body: createdRule1 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '10s' } }))
        .expect(200);
      objectRemover.add('space1', createdRule1.id, 'rule', 'alerting');

      const { body: createdRule2 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: false,
            schedule: { interval: '5s' },
          })
        )
        .expect(200);
      objectRemover.add('space1', createdRule2.id, 'rule', 'alerting');

      const { body } = await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/rule/${createdRule2.id}/_enable`)
        .set('kbn-xsrf', 'foo')
        .expect(400);

      expect(body.message).eql(
        `Error validating circuit breaker - Rule 'abc' cannot be enabled. The maximum number of runs per minute would be exceeded. - The rule has 12 runs per minute; there are only 4 runs per minute available. Before you can modify this rule, you must increase its check interval so that it runs less frequently. Alternatively, disable other rules or change their check intervals.`
      );
    });
  });
}
