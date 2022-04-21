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

async function createAlert(
  objectRemover: ObjectRemover,
  supertest: SuperTest<Test>,
  overwrites = {}
) {
  const { body: createdAlert } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .send(getTestRuleData(overwrites))
    .expect(200);
  objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');
  return createdAlert;
}

const findTestUtils = (
  describeType: 'internal' | 'public',
  supertest: SuperTest<Test>,
  objectRemover: ObjectRemover
) => {
  describe(describeType, () => {
    afterEach(() => objectRemover.removeAll());
    it('should handle find alert request appropriately', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/${
          describeType === 'public' ? 'api' : 'internal'
        }/alerting/rules/_find?search=test.noop&search_fields=alertTypeId`
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
        ...(describeType === 'internal'
          ? { monitoring: match.monitoring, snooze_end_time: match.snooze_end_time }
          : {}),
      });
      expect(Date.parse(match.created_at)).to.be.greaterThan(0);
      expect(Date.parse(match.updated_at)).to.be.greaterThan(0);
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
          }/alerting/rules/_find?search=test.noop&search_fields=alertTypeId`
        )
        .expect(200, {
          page: 1,
          per_page: 10,
          total: 0,
          data: [],
        });
    });

    describe('basic functionality', () => {
      beforeEach(async () => {
        await Promise.all([
          createAlert(objectRemover, supertest, { params: { strValue: 'my a' } }),
          createAlert(objectRemover, supertest, { params: { strValue: 'my b' } }),
          createAlert(objectRemover, supertest, { params: { strValue: 'my c' } }),
          createAlert(objectRemover, supertest, {
            params: {
              risk_score: 60,
              severity: 'high',
            },
          }),
          createAlert(objectRemover, supertest, {
            params: {
              risk_score: 40,
              severity: 'medium',
            },
          }),
          createAlert(objectRemover, supertest, {
            params: {
              risk_score: 20,
              severity: 'low',
            },
          }),
        ]);
      });

      it(`it should${
        describeType === 'public' ? ' NOT' : ''
      } allow filter on monitoring attributes`, async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rules/_find?filter=alert.attributes.monitoring.execution.calculated_metrics.success_ratio>50`
        );

        expect(response.status).to.eql(describeType === 'internal' ? 200 : 400);
        if (describeType === 'public') {
          expect(response.body.message).to.eql(
            'Error find rules: Filter is not supported on this field alert.attributes.monitoring.execution.calculated_metrics.success_ratio'
          );
        }
      });

      it(`it should${
        describeType === 'public' ? ' NOT' : ''
      } allow ordering on monitoring attributes`, async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rules/_find?sort_field=monitoring.execution.calculated_metrics.success_ratio`
        );

        expect(response.status).to.eql(describeType === 'internal' ? 200 : 400);
        if (describeType === 'public') {
          expect(response.body.message).to.eql(
            'Error find rules: Sort is not supported on this field monitoring.execution.calculated_metrics.success_ratio'
          );
        }
      });

      it(`it should${
        describeType === 'public' ? ' NOT' : ''
      } allow search_fields on monitoring attributes`, async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rules/_find?search_fields=monitoring.execution.calculated_metrics.success_ratio&search=50`
        );

        expect(response.status).to.eql(describeType === 'internal' ? 200 : 400);
        if (describeType === 'public') {
          expect(response.body.message).to.eql(
            'Error find rules: Search field monitoring.execution.calculated_metrics.success_ratio not supported'
          );
        }
      });

      it('should filter on string parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rules/_find?filter=alert.attributes.params.strValue:"my b"`
        );

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.strValue).to.eql('my b');
      });

      it('should sort by parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rules/_find?sort_field=params.severity&sort_order=asc`
        );
        expect(response.body.data[0].params.severity).to.equal('low');
        expect(response.body.data[1].params.severity).to.equal('medium');
        expect(response.body.data[2].params.severity).to.equal('high');
      });

      it('should search by parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rules/_find?search_fields=params.severity&search=medium`
        );

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.severity).to.eql('medium');
      });

      it('should filter on parameters', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rules/_find?filter=alert.attributes.params.risk_score:40`
        );

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.risk_score).to.eql(40);

        if (describeType === 'public') {
          expect(response.body.data[0].mapped_params).to.eql(undefined);
        }
      });

      it('should error if filtering on mapped parameters directly using the public API', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rules/_find?filter=alert.attributes.mapped_params.risk_score:40`
        );

        if (describeType === 'public') {
          expect(response.status).to.eql(400);
          expect(response.body.message).to.eql(
            'Error find rules: Filter is not supported on this field alert.attributes.mapped_params.risk_score'
          );
        } else {
          expect(response.status).to.eql(200);
        }
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('find', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    findTestUtils('public', supertest, objectRemover);
    findTestUtils('internal', supertest, objectRemover);

    describe('legacy', () => {
      it('should handle find alert request appropriately', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
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
