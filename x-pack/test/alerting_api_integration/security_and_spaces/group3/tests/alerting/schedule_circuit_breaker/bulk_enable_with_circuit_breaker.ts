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
export default function bulkEnableWithCircuitBreakerTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Bulk enable with circuit breaker', () => {
    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should prevent rules from being bulk enabled if max schedules have been reached', async () => {
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
            schedule: { interval: '20s' },
          })
        )
        .expect(200);
      objectRemover.add('space1', createdRule2.id, 'rule', 'alerting');

      const { body: createdRule3 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: false,
            schedule: { interval: '10s' },
          })
        )
        .expect(200);
      objectRemover.add('space1', createdRule3.id, 'rule', 'alerting');

      const { body } = await supertest
        .patch(`${getUrlPrefix('space1')}/internal/alerting/rules/_bulk_enable`)
        .set('kbn-xsrf', 'foo')
        .send({ ids: [createdRule2.id, createdRule3.id] })
        .expect(200);

      expect(body.errors.length).eql(2);
      expect(body.errors[0].message).eql(
        'Error validating circuit breaker - Rules cannot be bulk enabled. The maximum number of runs per minute would be exceeded. - The rules have 9 runs per minute; there are only 4 runs per minute available. Before you can modify these rules, you must disable other rules or change their check intervals so they run less frequently.'
      );
    });
  });
}
