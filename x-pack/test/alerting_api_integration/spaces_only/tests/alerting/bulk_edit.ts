/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import { Spaces } from '../../scenarios';
import {
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  createWaitForExecutionCount,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const getSnoozeSchedule = () => {
  return {
    id: uuidv4(),
    duration: 28800000,
    rRule: {
      dtstart: '2022-09-19T11:49:59.329Z',
      count: 1,
      tzid: 'America/Vancouver',
    },
  };
};

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const waitForExecutionCount = createWaitForExecutionCount(supertest, Spaces.space1.id);

  // Failing: See https://github.com/elastic/kibana/issues/138050
  describe.skip('bulkEdit', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should bulk edit rule with tags operation', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false, tags: ['default'] }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'add',
            field: 'tags',
            value: ['tag-1'],
          },
        ],
      };

      const bulkEditResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(1);
      expect(bulkEditResponse.body.rules[0].tags).to.eql(['default', 'tag-1']);

      const { body: updatedRule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo');

      expect(updatedRule.tags).to.eql(['default', 'tag-1']);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should bulk edit multiple rules with tags operation', async () => {
      const rules: SanitizedRule[] = (
        await Promise.all(
          Array.from({ length: 10 }).map(() =>
            supertest
              .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getTestRuleData({ enabled: false, tags: [`multiple-rules-edit`] }))
              .expect(200)
          )
        )
      ).map((res) => res.body);

      rules.forEach((rule) => {
        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');
      });

      const payload = {
        filter: `alert.attributes.tags: "multiple-rules-edit"`,
        operations: [
          {
            operation: 'set',
            field: 'tags',
            value: ['rewritten'],
          },
        ],
      };

      const bulkEditResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkEditResponse.body.total).to.be(10);
      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(10);
      bulkEditResponse.body.rules.every((rule: { tags: string[] }) =>
        expect(rule.tags).to.eql([`rewritten`])
      );

      const updatedRules: SanitizedRule[] = (
        await Promise.all(
          rules.map((rule) =>
            supertest
              .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${rule.id}`)
              .set('kbn-xsrf', 'foo')
          )
        )
      ).map((res) => res.body);

      updatedRules.forEach((rule) => {
        expect(rule.tags).to.eql([`rewritten`]);
      });
    });

    it('should bulk edit rule with schedule operation', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false, schedule: { interval: '10m' } }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'set',
            field: 'schedule',
            value: { interval: '1h' },
          },
        ],
      };

      const bulkEditResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(1);
      expect(bulkEditResponse.body.rules[0].schedule).to.eql({ interval: '1h' });

      const { body: updatedRule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo');

      expect(updatedRule.schedule).to.eql({ interval: '1h' });

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should bulk edit rule with throttle operation', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'set',
            field: 'throttle',
            value: '1h',
          },
        ],
      };

      const bulkEditResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(1);
      expect(bulkEditResponse.body.rules[0]).property('throttle', '1h');

      const { body: updatedRule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo');

      expect(updatedRule).property('throttle', '1h');

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should bulk edit rule with notifyWhen operation', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false, throttle: '1h' }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'set',
            field: 'notifyWhen',
            value: 'onActionGroupChange',
          },
        ],
      };

      const bulkEditResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(1);
      expect(bulkEditResponse.body.rules[0]).property('notify_when', 'onActionGroupChange');

      const { body: updatedRule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
        .set('kbn-xsrf', 'foo');

      expect(updatedRule).property('notify_when', 'onActionGroupChange');

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should bulk snooze rule with snoozeSchedule operation', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: {
              duration: 28800000,
              rRule: {
                dtstart: '2022-09-19T11:49:59.329Z',
                count: 1,
                tzid: 'America/Vancouver',
              },
            },
          },
        ],
      };

      const bulkSnoozeResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkSnoozeResponse.body.errors).to.have.length(0);
      expect(bulkSnoozeResponse.body.rules).to.have.length(1);
      expect(bulkSnoozeResponse.body.rules[0].snooze_schedule.length).to.eql(1);
      expect(bulkSnoozeResponse.body.rules[0].snooze_schedule[0].duration).to.eql(28800000);

      const bulkUnsnoozeResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...payload,
          operations: [
            {
              operation: 'delete',
              field: 'snoozeSchedule',
            },
          ],
        });

      expect(bulkUnsnoozeResponse.body.errors).to.have.length(0);
      expect(bulkUnsnoozeResponse.body.rules).to.have.length(1);
      expect(bulkUnsnoozeResponse.body.rules[0].snooze_schedule).empty();

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should bulk snooze schedule rule with snoozeSchedule operation', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: getSnoozeSchedule(),
          },
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: getSnoozeSchedule(),
          },
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: getSnoozeSchedule(),
          },
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: getSnoozeSchedule(),
          },
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: getSnoozeSchedule(),
          },
        ],
      };

      const bulkSnoozeResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkSnoozeResponse.body.errors).to.have.length(0);
      expect(bulkSnoozeResponse.body.rules).to.have.length(1);
      expect(bulkSnoozeResponse.body.rules[0].snooze_schedule.length).to.eql(5);

      // Try adding more than 5 schedules
      const bulkSnoozeError = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...payload,
          operations: [
            {
              operation: 'set',
              field: 'snoozeSchedule',
              value: getSnoozeSchedule(),
            },
          ],
        });

      expect(bulkSnoozeError.body.errors).to.have.length(1);
      expect(bulkSnoozeError.body.rules).to.have.length(0);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should ignore bulk snooze and snooze schedule rule for SIEM rules', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false, consumer: 'siem' }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: getSnoozeSchedule(),
          },
        ],
      };

      const bulkSnoozeResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkSnoozeResponse.body.errors).to.have.length(0);
      expect(bulkSnoozeResponse.body.rules).to.have.length(1);
      expect(bulkSnoozeResponse.body.rules[0].snooze_schedule).empty();

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: createdRule.id,
      });
    });

    it('should bulk update API key with apiKey operation', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: false,
          })
        );

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'set',
            field: 'apiKey',
          },
        ],
      };

      const bulkApiKeyResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkApiKeyResponse.body.errors).to.have.length(0);
      expect(bulkApiKeyResponse.body.rules).to.have.length(1);
      expect(bulkApiKeyResponse.body.rules[0].api_key_owner).to.eql(null);
    });

    it(`shouldn't bulk edit rule from another space`, async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ enabled: false, tags: ['default'] }));

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'add',
            field: 'tags',
            value: ['tag-1'],
          },
        ],
      };

      await supertest
        .post(`${getUrlPrefix(Spaces.other.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload)
        .expect(200, { rules: [], errors: [], total: 0 });
    });

    it('should return mapped params after bulk edit', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: false,
            tags: ['default'],
            params: { risk_score: 40, severity: 'medium' },
          })
        );

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'add',
            field: 'tags',
            value: ['tag-1'],
          },
        ],
      };

      const bulkEditResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send(payload);

      expect(bulkEditResponse.body.errors).to.have.length(0);
      expect(bulkEditResponse.body.rules).to.have.length(1);
      expect(bulkEditResponse.body.rules[0].mapped_params).to.eql({
        risk_score: 40,
        severity: '40-medium',
      });
    });

    it('should not overwrite internal field monitoring', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: true,
            tags: ['default'],
            params: { risk_score: 40, severity: 'medium' },
          })
        );

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForExecutionCount(1, createdRule.id);

      const monitoringData = (
        await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`
        )
      ).body.monitoring;

      // single rule execution is recorded in monitoring history
      expect(monitoringData.execution.history).to.have.length(1);

      const payload = {
        ids: [createdRule.id],
        operations: [
          {
            operation: 'add',
            field: 'tags',
            value: ['tag-1'],
          },
        ],
      };

      const bulkEditResponse = await retry.try(
        async () =>
          await supertest
            .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .send(payload)
            .expect(200)
      );

      // after applying bulk edit action monitoring still available
      expect(bulkEditResponse.body.rules[0].monitoring).to.eql(monitoringData);

      // test if monitoring data persistent
      const getRuleResponse = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`
      );

      expect(getRuleResponse.body.monitoring).to.eql(monitoringData);
    });
  });
}
