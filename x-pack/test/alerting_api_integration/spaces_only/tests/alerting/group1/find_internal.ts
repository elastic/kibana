/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Agent as SuperTestAgent } from 'supertest';
import { fromKueryExpression } from '@kbn/es-query';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

async function createAlert(
  objectRemover: ObjectRemover,
  supertest: SuperTestAgent,
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

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('find internal API', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    describe('handle find alert request', function () {
      this.tags('skipFIPS');

      it('should handle find alert request appropriately', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY action',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);

        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              actions: [
                {
                  group: 'default',
                  id: createdAction.id,
                  params: {},
                  frequency: {
                    summary: false,
                    notify_when: 'onThrottleInterval',
                    throttle: '1m',
                  },
                },
              ],
              notify_when: undefined,
              throttle: undefined,
            })
          )
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            search: 'test.noop',
            search_fields: 'alertTypeId',
          });

        expect(response.status).to.eql(200);
        expect(response.body.page).to.equal(1);
        expect(response.body.per_page).to.be.greaterThan(0);
        expect(response.body.total).to.be.greaterThan(0);
        const match = response.body.data.find((obj: any) => obj.id === createdAlert.id);
        const activeSnoozes = match.active_snoozes;
        const hasActiveSnoozes = !!(activeSnoozes || []).filter((obj: any) => obj).length;
        expect(match).to.eql({
          id: createdAlert.id,
          name: 'abc',
          tags: ['foo'],
          rule_type_id: 'test.noop',
          revision: 0,
          running: false,
          consumer: 'alertsFixture',
          schedule: { interval: '1m' },
          enabled: true,
          actions: [
            {
              group: 'default',
              id: createdAction.id,
              connector_type_id: 'test.noop',
              params: {},
              frequency: {
                summary: false,
                notify_when: 'onThrottleInterval',
                throttle: '1m',
              },
              uuid: match.actions[0].uuid,
            },
          ],
          params: {},
          created_by: null,
          api_key_owner: null,
          api_key_created_by_user: null,
          scheduled_task_id: match.scheduled_task_id,
          updated_by: null,
          throttle: null,
          notify_when: null,
          mute_all: false,
          muted_alert_ids: [],
          created_at: match.created_at,
          updated_at: match.updated_at,
          execution_status: match.execution_status,
          ...(match.next_run ? { next_run: match.next_run } : {}),
          ...(match.last_run ? { last_run: match.last_run } : {}),
          monitoring: match.monitoring,
          snooze_schedule: match.snooze_schedule,
          ...(hasActiveSnoozes && { active_snoozes: activeSnoozes }),
          is_snoozed_until: null,
        });
        expect(Date.parse(match.created_at)).to.be.greaterThan(0);
        expect(Date.parse(match.updated_at)).to.be.greaterThan(0);
      });
    });

    it(`shouldn't find alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await supertest
        .post(`${getUrlPrefix(Spaces.other.id)}/internal/alerting/rules/_find`)
        .set('kbn-xsrf', 'foo')
        .send({
          search: 'test.noop',
          search_fields: 'alertTypeId',
        })
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

      it(`it should allow filter on monitoring attributes`, async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            filter: 'alert.attributes.monitoring.run.calculated_metrics.success_ratio>50',
          });

        expect(response.status).to.eql(200);
      });

      it(`it should allow ordering on monitoring attributes`, async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            sort_field: 'monitoring.run.calculated_metrics.success_ratio',
          });

        expect(response.status).to.eql(200);
      });

      it(`it should allow search_fields on monitoring attributes`, async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            search_fields: 'monitoring.run.calculated_metrics.success_ratio',
            search: '50',
          });

        expect(response.status).to.eql(200);
      });

      it('should filter on string parameters', async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            filter: 'alert.attributes.params.strValue:"my b"',
          });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.strValue).to.eql('my b');
      });

      it('should filter on kueryNode parameters', async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            filter: JSON.stringify(fromKueryExpression('alert.attributes.params.strValue:"my b"')),
          });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.strValue).to.eql('my b');
      });

      it('should sort by parameters', async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            sort_field: 'params.severity',
            sort_order: 'asc',
          });
        expect(response.body.data[0].params.severity).to.equal('low');
        expect(response.body.data[1].params.severity).to.equal('medium');
        expect(response.body.data[2].params.severity).to.equal('high');
      });

      it('should search by parameters', async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            search_fields: 'params.severity',
            search: 'medium',
          });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.severity).to.eql('medium');
      });

      it('should filter on parameters', async () => {
        const response = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .send({
            filter: 'alert.attributes.params.risk_score:40',
          });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].params.risk_score).to.eql(40);
      });
    });

    it('should filter rules by rule type IDs', async () => {
      await createAlert(objectRemover, supertest, {
        rule_type_id: 'test.noop',
        consumer: 'alertsFixture',
      });

      await createAlert(objectRemover, supertest, {
        rule_type_id: 'test.restricted-noop',
        consumer: 'alertsRestrictedFixture',
      });

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
        .set('kbn-xsrf', 'foo')
        .send({
          rule_type_ids: ['test.restricted-noop'],
        });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.equal(1);
      expect(response.body.data[0].rule_type_id).to.eql('test.restricted-noop');
    });

    it('should filter rules by consumers', async () => {
      await createAlert(objectRemover, supertest, {
        rule_type_id: 'test.noop',
        consumer: 'alertsFixture',
      });

      await createAlert(objectRemover, supertest, {
        rule_type_id: 'test.restricted-noop',
        consumer: 'alertsRestrictedFixture',
      });

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
        .set('kbn-xsrf', 'foo')
        .send({
          consumers: ['alertsRestrictedFixture'],
        });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.equal(1);
      expect(response.body.data[0].consumer).to.eql('alertsRestrictedFixture');
    });

    describe('legacy', function () {
      this.tags('skipFIPS');
      it('should handle find alert request appropriately', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/_find`);

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
          apiKeyCreatedByUser: null,
          scheduledTaskId: match.scheduledTaskId,
          updatedBy: null,
          throttle: '1m',
          notifyWhen: 'onThrottleInterval',
          muteAll: false,
          mutedInstanceIds: [],
          createdAt: match.createdAt,
          updatedAt: match.updatedAt,
          executionStatus: match.executionStatus,
          revision: 0,
          running: false,
          ...(match.nextRun ? { nextRun: match.nextRun } : {}),
          ...(match.lastRun ? { lastRun: match.lastRun } : {}),
        });
        expect(Date.parse(match.createdAt)).to.be.greaterThan(0);
        expect(Date.parse(match.updatedAt)).to.be.greaterThan(0);
      });
    });
  });
}
