/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { checkAAD, getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle update alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const updatedData = {
        name: 'bcd',
        tags: ['bar'],
        params: {
          foo: true,
          risk_score: 40,
          severity: 'medium',
        },
        schedule: { interval: '12s' },
        actions: [],
        throttle: '1m',
        notify_when: 'onThrottleInterval',
      };
      let response = await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send(updatedData)
        .expect(200);

      expect(response.body).to.eql({
        ...updatedData,
        id: createdAlert.id,
        tags: ['bar'],
        rule_type_id: 'test.noop',
        consumer: 'alertsFixture',
        created_by: null,
        enabled: true,
        updated_by: null,
        api_key_owner: null,
        mute_all: false,
        muted_alert_ids: [],
        notify_when: 'onThrottleInterval',
        scheduled_task_id: createdAlert.scheduled_task_id,
        created_at: response.body.created_at,
        updated_at: response.body.updated_at,
        execution_status: response.body.execution_status,
      });
      expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
      expect(Date.parse(response.body.updated_at)).to.be.greaterThan(
        Date.parse(response.body.created_at)
      );

      response = await supertest.get(
        `${getUrlPrefix(
          Spaces.space1.id
        )}/internal/alerting/rules/_find?filter=alert.attributes.params.risk_score:40`
      );

      expect(response.body.data[0].mapped_params).to.eql({
        risk_score: 40,
        severity: '40-medium',
      });

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdAlert.id,
      });
    });

    it(`shouldn't update alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await supertest
        .put(`${getUrlPrefix(Spaces.other.id)}/api/alerting/rule/${createdAlert.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'bcd',
          tags: ['foo'],
          params: {
            foo: true,
          },
          schedule: { interval: '12s' },
          actions: [],
          throttle: '1m',
          notify_when: 'onThrottleInterval',
        })
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
    });

    describe('legacy', () => {
      it('should handle update alert request appropriately', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const updatedData = {
          name: 'bcd',
          tags: ['bar'],
          params: {
            foo: true,
          },
          schedule: { interval: '12s' },
          actions: [],
          throttle: '1m',
          notifyWhen: 'onThrottleInterval',
        };

        const response = await supertest
          .put(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${createdAlert.id}`)
          .set('kbn-xsrf', 'foo')
          .send(updatedData)
          .expect(200);

        expect(response.body).to.eql({
          ...updatedData,
          id: createdAlert.id,
          tags: ['bar'],
          alertTypeId: 'test.noop',
          consumer: 'alertsFixture',
          createdBy: null,
          enabled: true,
          updatedBy: null,
          apiKeyOwner: null,
          muteAll: false,
          mutedInstanceIds: [],
          notifyWhen: 'onThrottleInterval',
          scheduledTaskId: createdAlert.scheduled_task_id,
          createdAt: response.body.createdAt,
          updatedAt: response.body.updatedAt,
          executionStatus: response.body.executionStatus,
        });
        expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
        expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
        expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(
          Date.parse(response.body.createdAt)
        );

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdAlert.id,
        });
      });
    });
  });
}
