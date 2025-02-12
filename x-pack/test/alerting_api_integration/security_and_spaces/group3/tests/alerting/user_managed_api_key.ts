/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { generateAPIKeyName } from '@kbn/alerting-plugin/server/rules_client/common';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import {
  checkAAD,
  getEventLog,
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { SuperuserAtSpace1 } from '../../../scenarios';

// eslint-disable-next-line import/no-default-export
export default function userManagedApiKeyTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const superTestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertest);
  const retry = getService('retry');

  describe('user managed api key', () => {
    let apiKey: string;

    before(async () => {
      // Create API key
      const { body: createdApiKey } = await supertest
        .post(`/internal/security/api_key`)
        .set('kbn-xsrf', 'foo')
        .send({ name: 'test user managed key' })
        .expect(200);

      apiKey = createdApiKey.encoded;
    });

    after(() => objectRemover.removeAll());

    it('should successfully create rule using API key authorization', async () => {
      const testRuleData = getTestRuleData({});
      const response = await superTestWithoutAuth
        .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .set('Authorization', `ApiKey ${apiKey}`)
        .send(testRuleData);

      expect(response.status).to.eql(200);
      const ruleId = response.body.id;
      objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');

      expect(response.body.api_key_created_by_user).to.eql(true);
      expect(apiKeyExists(testRuleData.rule_type_id, testRuleData.name)).to.eql(false);

      // Make sure rule runs successfully
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: SuperuserAtSpace1.space.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            // make sure the counts of the # of events per type are as expected
            ['execute', { gte: 1 }],
          ]),
        });
      });

      const executeEvent = events.find(
        (event: IValidatedEvent) => event?.event?.action === 'execute'
      );
      expect(executeEvent?.event?.outcome).to.eql('success');
    });

    describe('rule operations', () => {
      it('should successfully update rule with user managed API key', async () => {
        const ruleId = await createRule(apiKey, 'test_update1');
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const updatedData = {
          name: 'updated_rule_user_managed',
          tags: ['bar'],
          params: {
            foo: true,
          },
          schedule: { interval: '12s' },
          actions: [],
          throttle: '1m',
          notify_when: 'onThrottleInterval',
        };

        const response = await superTestWithoutAuth
          .put(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule/${ruleId}`)
          .set('kbn-xsrf', 'foo')
          .set('Authorization', `ApiKey ${apiKey}`)
          .send(updatedData);

        expect(response.status).to.eql(200);
        expect(response.body).to.eql({
          ...updatedData,
          id: ruleId,
          rule_type_id: 'test.noop',
          running: false,
          consumer: 'alertsFixture',
          created_by: 'elastic',
          enabled: true,
          updated_by: 'elastic',
          api_key_owner: 'elastic',
          api_key_created_by_user: true,
          mute_all: false,
          muted_alert_ids: [],
          actions: [],
          scheduled_task_id: ruleId,
          created_at: response.body.created_at,
          updated_at: response.body.updated_at,
          execution_status: response.body.execution_status,
          revision: 1,
          ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
          ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
        });

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure no API key was generated
        expect(apiKeyExists('test.noop', updatedData.name)).to.eql(false);
      });

      it('should successfully update rule and regenerate API key', async () => {
        const ruleId = await createRule(apiKey, 'test_update2');
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const updatedData = {
          name: 'update_rule_regenerated',
          tags: ['bar'],
          params: {
            foo: true,
          },
          schedule: { interval: '12s' },
          actions: [],
          throttle: '1m',
          notify_when: 'onThrottleInterval',
        };

        const response = await supertest
          .put(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule/${ruleId}`)
          .set('kbn-xsrf', 'foo')
          .send(updatedData);

        expect(response.status).to.eql(200);
        expect(response.body).to.eql({
          ...updatedData,
          id: ruleId,
          rule_type_id: 'test.noop',
          running: false,
          consumer: 'alertsFixture',
          created_by: 'elastic',
          enabled: true,
          updated_by: 'elastic',
          api_key_owner: 'elastic',
          api_key_created_by_user: false,
          mute_all: false,
          muted_alert_ids: [],
          actions: [],
          scheduled_task_id: ruleId,
          created_at: response.body.created_at,
          updated_at: response.body.updated_at,
          execution_status: response.body.execution_status,
          revision: 1,
          ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
          ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
        });

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure an API key was generated
        expect(apiKeyExists('test.noop', updatedData.name)).to.eql(true);
      });

      it('should successfully clone rule with user managed API key', async () => {
        const ruleId = await createRule(apiKey, 'test_clone1');
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const response = await superTestWithoutAuth
          .post(
            `${getUrlPrefix(SuperuserAtSpace1.space.id)}/internal/alerting/rule/${ruleId}/_clone`
          )
          .set('kbn-xsrf', 'foo')
          .set('Authorization', `ApiKey ${apiKey}`)
          .send();
        expect(response.status).to.eql(200);
        objectRemover.add(SuperuserAtSpace1.space.id, response.body.id, 'rule', 'alerting');

        expect(response.body).to.eql({
          id: response.body.id,
          name: 'test_clone1 [Clone]',
          tags: ['foo'],
          actions: [],
          enabled: true,
          rule_type_id: 'test.noop',
          running: false,
          consumer: 'alertsFixture',
          params: {},
          created_by: 'elastic',
          schedule: { interval: '1m' },
          scheduled_task_id: response.body.scheduled_task_id,
          created_at: response.body.created_at,
          updated_at: response.body.updated_at,
          throttle: '1m',
          notify_when: 'onThrottleInterval',
          updated_by: 'elastic',
          api_key_created_by_user: true,
          api_key_owner: 'elastic',
          mute_all: false,
          muted_alert_ids: [],
          execution_status: response.body.execution_status,
          revision: 0,
          last_run: {
            alerts_count: {
              active: 0,
              ignored: 0,
              new: 0,
              recovered: 0,
            },
            outcome: 'succeeded',
            outcome_msg: null,
            outcome_order: 0,
            warning: null,
          },
          next_run: response.body.next_run,
          monitoring: {
            run: {
              history: [],
              calculated_metrics: {
                success_ratio: 0,
              },
              last_run: {
                timestamp: response.body.monitoring.run.last_run.timestamp,
                metrics: {
                  duration: 0,
                  total_search_duration_ms: null,
                  total_indexing_duration_ms: null,
                  total_alerts_detected: null,
                  total_alerts_created: null,
                  gap_duration_s: null,
                  // TODO: uncomment after intermidiate release
                  // gap_range: null,
                },
              },
            },
          },
          snooze_schedule: [],
        });

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: response.body.id,
        });

        // Ensure no API key was generated
        expect(apiKeyExists(response.body.rule_type_id, response.body.name)).to.eql(false);
      });

      it('should successfully clone rule and regenerate API key', async () => {
        const ruleId = await createRule(apiKey, 'test_clone2');
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const response = await supertest
          .post(
            `${getUrlPrefix(SuperuserAtSpace1.space.id)}/internal/alerting/rule/${ruleId}/_clone`
          )
          .set('kbn-xsrf', 'foo')
          .send();
        expect(response.status).to.eql(200);
        objectRemover.add(SuperuserAtSpace1.space.id, response.body.id, 'rule', 'alerting');

        expect(response.body).to.eql({
          id: response.body.id,
          name: 'test_clone2 [Clone]',
          tags: ['foo'],
          actions: [],
          enabled: true,
          rule_type_id: 'test.noop',
          running: false,
          consumer: 'alertsFixture',
          params: {},
          created_by: 'elastic',
          schedule: { interval: '1m' },
          scheduled_task_id: response.body.scheduled_task_id,
          created_at: response.body.created_at,
          updated_at: response.body.updated_at,
          throttle: '1m',
          notify_when: 'onThrottleInterval',
          updated_by: 'elastic',
          api_key_created_by_user: false,
          api_key_owner: 'elastic',
          mute_all: false,
          muted_alert_ids: [],
          execution_status: response.body.execution_status,
          revision: 0,
          last_run: {
            alerts_count: {
              active: 0,
              ignored: 0,
              new: 0,
              recovered: 0,
            },
            outcome: 'succeeded',
            outcome_msg: null,
            outcome_order: 0,
            warning: null,
          },
          next_run: response.body.next_run,
          monitoring: {
            run: {
              history: [],
              calculated_metrics: {
                success_ratio: 0,
              },
              last_run: {
                timestamp: response.body.monitoring.run.last_run.timestamp,
                metrics: {
                  duration: 0,
                  total_search_duration_ms: null,
                  total_indexing_duration_ms: null,
                  total_alerts_detected: null,
                  total_alerts_created: null,
                  gap_duration_s: null,
                  // TODO: uncomment after intermidiate release
                  // gap_range: null,
                },
              },
            },
          },
          snooze_schedule: [],
        });

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: response.body.id,
        });

        // Ensure an API key was generated
        expect(apiKeyExists(response.body.rule_type_id, response.body.name)).to.eql(true);
      });

      it('should successfully bulk edit rule with user managed API key', async () => {
        const ruleId = await createRule(apiKey, 'test_bulk_edit1');
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const payload = {
          ids: [ruleId],
          operations: [
            {
              operation: 'add',
              field: 'tags',
              value: ['another-tag'],
            },
          ],
        };

        const response = await superTestWithoutAuth
          .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .set('Authorization', `ApiKey ${apiKey}`)
          .send(payload);

        expect(response.status).to.eql(200);
        expect(response.body.rules[0].tags).to.eql(['foo', 'another-tag']);
        expect(response.body.rules[0].api_key_created_by_user).to.eql(true);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure no API key was generated
        expect(apiKeyExists('test.noop', 'test_bulk_edit1')).to.eql(false);
      });

      it('should successfully bulk edit rule and regenerate API key', async () => {
        const ruleId = await createRule(apiKey, 'test_bulk_edit2');
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const payload = {
          ids: [ruleId],
          operations: [
            {
              operation: 'add',
              field: 'tags',
              value: ['another-tag'],
            },
          ],
        };

        const response = await supertest
          .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send(payload);

        expect(response.status).to.eql(200);
        expect(response.body.rules[0].tags).to.eql(['foo', 'another-tag']);
        expect(response.body.rules[0].api_key_created_by_user).to.eql(false);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure an API key was generated
        expect(apiKeyExists('test.noop', 'test_bulk_edit2')).to.eql(true);
      });

      it('should successfully update api key for rule with user managed API key', async () => {
        const ruleId = await createRule(apiKey, 'test_update_api_key1');
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const response = await superTestWithoutAuth
          .post(
            `${getUrlPrefix(
              SuperuserAtSpace1.space.id
            )}/api/alerting/rule/${ruleId}/_update_api_key`
          )
          .set('kbn-xsrf', 'foo')
          .set('Authorization', `ApiKey ${apiKey}`);
        expect(response.status).to.eql(204);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure no API key was generated
        expect(apiKeyExists('test.noop', 'test_update_api_key1')).to.eql(false);
      });

      it('should successfully update api key for rule and regenerate API key', async () => {
        const ruleId = await createRule(apiKey, 'test_update_api_key2');
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const response = await supertest
          .post(
            `${getUrlPrefix(
              SuperuserAtSpace1.space.id
            )}/api/alerting/rule/${ruleId}/_update_api_key`
          )
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure an API key was generated
        expect(apiKeyExists('test.noop', 'test_update_api_key2')).to.eql(true);
      });

      it('should successfully enable rule with user managed API key', async () => {
        const ruleId = await createRule(apiKey, 'test_enable1', false);
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const response = await superTestWithoutAuth
          .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule/${ruleId}/_enable`)
          .set('kbn-xsrf', 'foo')
          .set('Authorization', `ApiKey ${apiKey}`);
        expect(response.status).to.eql(204);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure no API key was generated
        expect(apiKeyExists('test.noop', 'test_enable1')).to.eql(false);
      });

      it('should successfully enable rule and generate API key', async () => {
        const ruleId = await createRule(apiKey, 'test_enable2', false);
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const response = await supertest
          .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule/${ruleId}/_enable`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure an API key was generated
        expect(apiKeyExists('test.noop', 'test_enable2')).to.eql(true);
      });

      it('should successfully bulk enable rule with user managed API key', async () => {
        const ruleId = await createRule(apiKey, 'test_bulk_enable1', false);
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const response = await superTestWithoutAuth
          .patch(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .set('Authorization', `ApiKey ${apiKey}`)
          .send({ ids: [ruleId] });
        expect(response.status).to.eql(200);
        expect(response.body.rules[0].enabled).to.eql(true);
        expect(response.body.rules[0].api_key_created_by_user).to.eql(true);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure no API key was generated
        expect(apiKeyExists('test.noop', 'test_bulk_enable1')).to.eql(false);
      });

      it('should successfully bulk enable rule and generate API key', async () => {
        const ruleId = await createRule(apiKey, 'test_bulk_enable2', false);
        objectRemover.add(SuperuserAtSpace1.space.id, ruleId, 'rule', 'alerting');
        const response = await supertest
          .patch(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/internal/alerting/rules/_bulk_enable`)
          .set('kbn-xsrf', 'foo')
          .send({ ids: [ruleId] });
        expect(response.status).to.eql(200);
        expect(response.body.rules[0].enabled).to.eql(true);
        expect(response.body.rules[0].api_key_created_by_user).to.eql(false);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: SuperuserAtSpace1.space.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
        });

        // Ensure an API key was generated
        expect(apiKeyExists('test.noop', 'test_bulk_enable2')).to.eql(true);
      });

      it('should successfully delete rule with user managed API key', async () => {
        const ruleId = await createRule(apiKey, 'test_delete1');
        const response = await superTestWithoutAuth
          .delete(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule/${ruleId}`)
          .set('kbn-xsrf', 'foo')
          .set('Authorization', `ApiKey ${apiKey}`);
        expect(response.statusCode).to.eql(204);

        const invalidateResponse = await es.security.invalidateApiKey({
          body: { ids: ['abc'], owner: false },
        });
        expect(invalidateResponse.previously_invalidated_api_keys).to.eql([]);
      });

      it('should successfully delete rule', async () => {
        const ruleId = await createRule(apiKey, 'test_delete2');
        const response = await supertest
          .delete(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule/${ruleId}`)
          .set('kbn-xsrf', 'foo');
        expect(response.status).to.eql(204);

        const invalidateResponse = await es.security.invalidateApiKey({
          body: { ids: ['abc'], owner: false },
        });
        expect(invalidateResponse.previously_invalidated_api_keys).to.eql([]);
      });

      it('should successfully bulk delete rule with user managed api key', async () => {
        const ruleId = await createRule(apiKey, 'test_bulk_delete1');
        const response = await superTestWithoutAuth
          .patch(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/internal/alerting/rules/_bulk_delete`)
          .set('kbn-xsrf', 'foo')
          .set('Authorization', `ApiKey ${apiKey}`)
          .send({ ids: [ruleId] });
        expect(response.statusCode).to.eql(200);

        const invalidateResponse = await es.security.invalidateApiKey({
          body: { ids: ['abc'], owner: false },
        });
        expect(invalidateResponse.previously_invalidated_api_keys).to.eql([]);
      });

      it('should successfully bulk delete rule', async () => {
        const ruleId = await createRule(apiKey, 'test_bulk_delete');
        const response = await supertest
          .patch(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/internal/alerting/rules/_bulk_delete`)
          .set('kbn-xsrf', 'foo')
          .send({ ids: [ruleId] });
        expect(response.status).to.eql(200);

        const invalidateResponse = await es.security.invalidateApiKey({
          body: { ids: ['abc'], owner: false },
        });
        expect(invalidateResponse.previously_invalidated_api_keys).to.eql([]);
      });
    });
  });

  async function apiKeyExists(ruleTypeId: string, ruleName: string) {
    // Typically an API key is created using the rule type id and the name so check
    // that this does not exist
    const generatedApiKeyName = generateAPIKeyName(ruleTypeId, ruleName);

    const { body: allApiKeys } = await supertest
      .post(`/internal/security/api_key/_query`)
      .send({ query: { match: { name: generatedApiKeyName } } })
      .set('kbn-xsrf', 'foo')
      .expect(200);

    return !!allApiKeys.apiKeys.find((key: { name: string }) => key.name === generatedApiKeyName);
  }

  async function createRule(apiKey: string, ruleName: string, enabled: boolean = true) {
    const testRuleData = getTestRuleData({});
    // Create rule and make sure it runs once successfully
    const response = await superTestWithoutAuth
      .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .set('Authorization', `ApiKey ${apiKey}`)
      .send({ ...testRuleData, name: ruleName, enabled });

    expect(response.status).to.eql(200);
    const ruleId = response.body.id;

    if (enabled) {
      // Make sure rule runs successfully
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: SuperuserAtSpace1.space.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            // make sure the counts of the # of events per type are as expected
            ['execute', { gte: 1 }],
          ]),
        });
      });
      const executeEvent = events.find(
        (event: IValidatedEvent) => event?.event?.action === 'execute'
      );
      expect(executeEvent?.event?.outcome).to.eql('success');
    }

    return ruleId;
  }
}
