/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('find', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    async function createAlert(overwrites = {}) {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData(overwrites))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');
      return createdAlert;
    }

    it('should handle find alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(
          Spaces.space1.id
        )}/api/alerting/rules/_find?search=test.noop&search_fields=alertTypeId`
      );

      expect(response.status).to.eql(200);
      expect(response.body.page).to.equal(1);
      expect(response.body.per_page).to.be.greaterThan(0);
      expect(response.body.total).to.be.greaterThan(0);
      const match = response.body.data.find((obj: any) => obj.id === createdAlert.id);
      expect(match).to.eql({
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
        api_key_owner: null,
        scheduled_task_id: match.scheduled_task_id,
        updated_by: null,
        throttle: '1m',
        notify_when: 'onThrottleInterval',
        mute_all: false,
        muted_alert_ids: [],
        created_at: match.created_at,
        updated_at: match.updated_at,
        execution_status: match.execution_status,
      });
      expect(Date.parse(match.created_at)).to.be.greaterThan(0);
      expect(Date.parse(match.updated_at)).to.be.greaterThan(0);
    });

    it(`shouldn't find alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await supertest
        .get(
          `${getUrlPrefix(
            Spaces.other.id
          )}/api/alerting/rules/_find?search=test.noop&search_fields=alertTypeId`
        )
        .expect(200, {
          page: 1,
          per_page: 10,
          total: 0,
          data: [],
        });
    });

    it('should filter on string parameters', async () => {
      await Promise.all([
        createAlert({ params: { strValue: 'my a' } }),
        createAlert({ params: { strValue: 'my b' } }),
        createAlert({ params: { strValue: 'my c' } }),
      ]);

      const response = await supertest.get(
        `${getUrlPrefix(
          Spaces.space1.id
        )}/api/alerting/rules/_find?filter=alert.attributes.params.strValue:"my b"`
      );

      expect(response.status).to.eql(200);
      expect(response.body.total).to.equal(1);
      expect(response.body.data[0].params.strValue).to.eql('my b');
    });

    describe('legacy', () => {
      it('should handle find alert request appropriately', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestAlertData())
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest.get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerts/_find?search=test.noop&search_fields=alertTypeId`
        );

        expect(response.status).to.eql(200);
        expect(response.body.page).to.equal(1);
        expect(response.body.perPage).to.be.greaterThan(0);
        expect(response.body.total).to.be.greaterThan(0);
        const match = response.body.data.find((obj: any) => obj.id === createdAlert.id);
        expect(match).to.eql({
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
          apiKeyOwner: null,
          scheduledTaskId: match.scheduledTaskId,
          updatedBy: null,
          throttle: '1m',
          notifyWhen: 'onThrottleInterval',
          muteAll: false,
          mutedInstanceIds: [],
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          executionStatus: match.executionStatus,
        });
        expect(Date.parse(match.createdAt)).to.be.greaterThan(0);
        expect(Date.parse(match.updatedAt)).to.be.greaterThan(0);
      });
    });
  });
}
