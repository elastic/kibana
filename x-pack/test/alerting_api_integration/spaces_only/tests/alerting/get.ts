/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest, Test } from 'supertest';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const getTestUtils = (
  describeType: 'internal' | 'public',
  objectRemover: ObjectRemover,
  supertest: SuperTest<Test>
) => {
  describe(describeType, () => {
    afterEach(() => objectRemover.removeAll());
    it('should handle get alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/${
          describeType === 'public' ? 'api' : 'internal'
        }/alerting/rule/${createdAlert.id}`
      );

      expect(response.status).to.eql(200);
      expect(response.body).to.eql({
        id: createdAlert.id,
        name: 'abc',
        tags: ['foo'],
        rule_type_id: 'test.noop',
        consumer: 'alertsFixture',
        schedule: { interval: '1m' },
        enabled: true,
        actions: [],
        params: {},
        created_by: null,
        scheduled_task_id: response.body.scheduled_task_id,
        updated_by: null,
        api_key_owner: null,
        throttle: '1m',
        notify_when: 'onThrottleInterval',
        mute_all: false,
        muted_alert_ids: [],
        created_at: response.body.created_at,
        updated_at: response.body.updated_at,
        execution_status: response.body.execution_status,
        ...(describeType === 'internal'
          ? { monitoring: response.body.monitoring, snooze_end_time: response.body.snooze_end_time }
          : {}),
      });
      expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
    });

    it(`shouldn't find alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await supertest
        .get(
          `${getUrlPrefix(Spaces.other.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rule/${createdAlert.id}`
        )
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
    });

    it(`should handle get alert request appropriately when alert doesn't exist`, async () => {
      await supertest
        .get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rule/1`
        )
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);
    afterEach(() => objectRemover.removeAll());

    getTestUtils('public', objectRemover, supertest);
    getTestUtils('internal', objectRemover, supertest);

    describe('legacy', () => {
      it('should handle get alert request appropriately', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}`
        );

        expect(response.status).to.eql(200);
        expect(response.body).to.eql({
          id: createdAlert.id,
          name: 'abc',
          tags: ['foo'],
          alertTypeId: 'test.noop',
          consumer: 'alertsFixture',
          schedule: { interval: '1m' },
          enabled: true,
          actions: [],
          params: {},
          createdBy: null,
          scheduledTaskId: response.body.scheduledTaskId,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          notifyWhen: 'onThrottleInterval',
          muteAll: false,
          mutedInstanceIds: [],
          createdAt: response.body.createdAt,
          updatedAt: response.body.updatedAt,
          executionStatus: response.body.executionStatus,
        });
        expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
        expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
      });
    });
  });
}
