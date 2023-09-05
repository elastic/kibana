/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { Spaces } from '../../scenarios';
import { getEventLog, getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('max queued actions circuit breaker', () => {
    const objectRemover = new ObjectRemover(supertest);
    const retry = getService('retry');

    after(() => objectRemover.removeAll());

    it('completes execution and reports back whether it reached the limit', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        });

      expect(response.status).to.eql(200);
      const actionId = response.body.id;
      objectRemover.add(Spaces.space1.id, actionId, 'action', 'actions');

      const actions = [];
      for (let i = 0; i < 510; i++) {
        actions.push({
          id: actionId,
          group: 'default',
          params: {
            index: ES_TEST_INDEX_NAME,
            reference: 'test',
            message: '',
          },
          frequency: {
            summary: false,
            throttle: null,
            notify_when: 'onActiveAlert',
          },
        });
      }

      const resp = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing-alert-as-data',
            schedule: { interval: '10m' },
            throttle: undefined,
            notify_when: undefined,
            params: {
              index: ES_TEST_INDEX_NAME,
              reference: 'test',
            },
            actions,
          })
        );

      expect(resp.status).to.eql(200);
      const ruleId = resp.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      // check that there's a warning in the execute event
      const executeEvent = events[0];
      expect(executeEvent?.event?.outcome).to.eql('success');
      expect(executeEvent?.event?.reason).to.eql('maxQueuedActions');
      expect(executeEvent?.kibana?.alerting?.status).to.eql('warning');
      expect(executeEvent?.message).to.eql(
        'The maximum number of queued actions was reached; excess actions were not triggered.'
      );
    });
  });
}
