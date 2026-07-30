/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidV4 } from 'uuid';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { deleteAllRules, createRule } from '@kbn/detections-response-ftr-services';
import { getSimpleRule } from '../../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../../../config/services/common';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @skipInServerlessMKI update_rules RBAC', () => {
    describe('@skipInServerless with rules_read_exceptions_all user role', () => {
      const role = ROLES.rules_read_exceptions_all;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should allow updating exceptions_list', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = {
          ...existingRule,
          id: undefined,
          exceptions_list: [
            {
              id: '1',
              list_id: '123',
              namespace_type: 'single' as const,
              type: ExceptionListTypeEnum.DETECTION,
            },
          ],
        };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.exceptions_list).to.eql([
          { id: '1', list_id: '123', namespace_type: 'single', type: 'detection' },
        ]);
      });

      it('should not allow updating non-exceptions fields', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = { ...existingRule, id: undefined, name: 'This should fail' };

        await restrictedApis.updateRule({ body: ruleUpdate }).expect(403);
      });
    });

    describe('@skipInServerless with rules_read_investigation_guide_all user role', () => {
      const role = ROLES.rules_read_investigation_guide_all;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should allow updating note field', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = {
          ...existingRule,
          id: undefined,
          note: 'Updated investigation guide content',
        };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.note).to.eql('Updated investigation guide content');
      });

      it('should allow unsetting note field', async () => {
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          note: 'Initial investigation guide',
        });

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = {
          ...existingRule,
          id: undefined,
          note: undefined,
        };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.note).to.eql(undefined);
      });

      it('should not allow updating non-investigation-guide fields', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = { ...existingRule, id: undefined, name: 'This should fail' };

        await restrictedApis.updateRule({ body: ruleUpdate }).expect(403);
      });
    });

    describe('@skipInServerless with rules_read_custom_highlighted_fields_all user role', () => {
      const role = ROLES.rules_read_custom_highlighted_fields_all;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should allow updating investigation_fields', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = {
          ...existingRule,
          id: undefined,
          investigation_fields: { field_names: ['host.name', 'user.name'] },
        };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.investigation_fields).to.eql({ field_names: ['host.name', 'user.name'] });
      });

      it('should allow unsetting investigation_fields', async () => {
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          investigation_fields: { field_names: ['host.name', 'user.name'] },
        });

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = {
          ...existingRule,
          id: undefined,
          investigation_fields: undefined,
        };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.investigation_fields).to.eql(undefined);
      });

      it('should not allow updating non-custom-highlighted-fields fields', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = { ...existingRule, id: undefined, name: 'This should fail' };

        await restrictedApis.updateRule({ body: ruleUpdate }).expect(403);
      });
    });

    describe('@skipInServerless with rules_read_enable_disable_all user role', () => {
      const role = ROLES.rules_read_enable_disable_all;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should allow updating enabled field', async () => {
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          enabled: false,
        });

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = { ...existingRule, id: undefined, enabled: true };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.enabled).to.eql(true);
      });

      it('should allow disabling a rule', async () => {
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          enabled: true,
        });

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = { ...existingRule, id: undefined, enabled: false };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.enabled).to.eql(false);
      });

      it('should not allow updating non-enabled fields', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = { ...existingRule, id: undefined, name: 'This should fail' };

        await restrictedApis.updateRule({ body: ruleUpdate }).expect(403);
      });
    });

    describe('@skipInServerless with rules_read_subfeatures_all user role', () => {
      const role = ROLES.rules_read_subfeatures_all;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should allow updating multiple subfeature fields at once', async () => {
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          enabled: false,
        });

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = {
          ...existingRule,
          id: undefined,
          note: 'Updated investigation guide',
          investigation_fields: { field_names: ['host.name', 'user.name'] },
          enabled: true,
        };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.note).to.eql('Updated investigation guide');
        expect(body.investigation_fields).to.eql({ field_names: ['host.name', 'user.name'] });
        expect(body.enabled).to.eql(true);
      });

      it('should allow updating a subset of subfeature fields', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = { ...existingRule, id: undefined, note: 'Just updating the note' };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(200);

        expect(body.note).to.eql('Just updating the note');
      });

      it('should not allow updating non-subfeature fields even with multiple subfeature permissions', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = {
          ...existingRule,
          id: undefined,
          note: 'This is allowed',
          name: 'But this should fail',
        };

        await restrictedApis.updateRule({ body: ruleUpdate }).expect(403);
      });

      it('should return 403 with specific error when updating a read-auth field without that subfeature permission', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);

        const ruleUpdate = {
          ...existingRule,
          id: undefined,
          note: 'This is allowed',
          // User doesn't have exception list edit capabilities
          exceptions_list: [
            {
              id: '1',
              list_id: '123',
              namespace_type: 'single' as const,
              type: ExceptionListTypeEnum.DETECTION,
            },
          ],
        };

        const { body } = await restrictedApis.updateRule({ body: ruleUpdate }).expect(403);

        expect(body.message).to.eql(
          'The current user does not have the permissions to edit the following fields: exceptions_list'
        );
      });
    });

    // Exception-list edits through the generic Alerting API require exceptions-edit.
    describe('@skipInServerless read-auth params via the generic Alerting API', () => {
      const role = ROLES.rules_all_exceptions_none;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      const exceptionsList = [
        {
          id: '1',
          list_id: '123',
          namespace_type: 'single' as const,
          type: ExceptionListTypeEnum.DETECTION,
        },
      ];

      const exceptionsListModified = [
        {
          id: '2',
          list_id: '456',
          namespace_type: 'single' as const,
          type: ExceptionListTypeEnum.DETECTION,
        },
      ];

      const getAlertingRuleBody = (current: Record<string, unknown>, params: unknown) => ({
        name: current.name,
        tags: current.tags,
        schedule: current.schedule,
        throttle: current.throttle ?? null,
        notify_when: current.notify_when ?? null,
        actions: current.actions,
        params,
      });

      it('rejects attaching exception lists via PUT /api/alerting/rule when the user lacks exceptions-edit', async () => {
        const existingRule = await createRule(supertest, log, getSimpleRule('rule-1'));
        const restrictedSupertest = await utils.createSuperTest(role);

        const { body: current } = await restrictedSupertest
          .get(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { body } = await restrictedSupertest
          .put(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .send(getAlertingRuleBody(current, { ...current.params, exceptionsList }))
          .expect(403);

        expect(body.message).to.eql(
          'The current user does not have the permissions to edit the following fields: exceptions_list'
        );
      });

      it('rejects removing exception lists via PUT /api/alerting/rule when the user lacks exceptions-edit', async () => {
        // Clearing a rule's exception lists is a privileged edit too.
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          exceptions_list: exceptionsList,
        });
        const restrictedSupertest = await utils.createSuperTest(role);

        const { body: current } = await restrictedSupertest
          .get(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { body } = await restrictedSupertest
          .put(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .send(getAlertingRuleBody(current, { ...current.params, exceptionsList: [] }))
          .expect(403);

        expect(body.message).to.eql(
          'The current user does not have the permissions to edit the following fields: exceptions_list'
        );
      });

      it('rejects modifying exception lists via PUT /api/alerting/rule when the user lacks exceptions-edit', async () => {
        // Replacing the attached exception lists with different ones is gated too.
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          exceptions_list: exceptionsList,
        });
        const restrictedSupertest = await utils.createSuperTest(role);

        const { body: current } = await restrictedSupertest
          .get(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { body } = await restrictedSupertest
          .put(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .send(getAlertingRuleBody(current, { ...current.params, exceptionsList: exceptionsListModified }))
          .expect(403);

        expect(body.message).to.eql(
          'The current user does not have the permissions to edit the following fields: exceptions_list'
        );
      });

      it('allows editing other rule params via the Alerting API when exception lists are unchanged', async () => {
        // Rule already has exceptions; editing an unrelated field leaves them untouched.
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          exceptions_list: exceptionsList,
        });
        const restrictedSupertest = await utils.createSuperTest(role);

        const { body: current } = await restrictedSupertest
          .get(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { body } = await restrictedSupertest
          .put(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .send({ ...getAlertingRuleBody(current, current.params), name: 'renamed via alerting' })
          .expect(200);

        expect(body.params.exceptionsList).to.eql(current.params.exceptionsList);
      });

      it('allows creating a rule with exception lists via the Alerting API without exceptions-edit', async () => {
        // Create is not gated: import and duplication set exception lists at create time.
        const seed = await createRule(supertest, log, getSimpleRule('seed-rule'));
        const { body: seedAlerting } = await supertest
          .get(`/api/alerting/rule/${seed.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const restrictedSupertest = await utils.createSuperTest(role);

        const { body } = await restrictedSupertest
          .post(`/api/alerting/rule`)
          .set('kbn-xsrf', 'true')
          .send({
            rule_type_id: seedAlerting.rule_type_id,
            consumer: seedAlerting.consumer,
            name: 'created via alerting without exceptions-edit',
            enabled: false,
            tags: [],
            schedule: seedAlerting.schedule,
            actions: [],
            params: { ...seedAlerting.params, ruleId: uuidV4(), exceptionsList },
          })
          .expect(200);

        expect(body.params.exceptionsList).to.eql(exceptionsList);
      });
    });

    // With exceptions-edit, attach/modify/remove through the generic Alerting API are allowed.
    describe('@skipInServerless read-auth params via the generic Alerting API with exceptions-edit', () => {
      const role = ROLES.rules_all_exceptions_all;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      const exceptionsList = [
        {
          id: '1',
          list_id: '123',
          namespace_type: 'single' as const,
          type: ExceptionListTypeEnum.DETECTION,
        },
      ];

      const exceptionsListModified = [
        {
          id: '2',
          list_id: '456',
          namespace_type: 'single' as const,
          type: ExceptionListTypeEnum.DETECTION,
        },
      ];

      // Seeds a rule, then sets its exception lists to `nextExceptions` via the Alerting API.
      const editExceptionsViaAlerting = async (
        seededExceptions: typeof exceptionsList | undefined,
        nextExceptions: typeof exceptionsList
      ) => {
        const existingRule = await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          ...(seededExceptions ? { exceptions_list: seededExceptions } : {}),
        });
        const authorizedSupertest = await utils.createSuperTest(role);

        const { body: current } = await authorizedSupertest
          .get(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { body } = await authorizedSupertest
          .put(`/api/alerting/rule/${existingRule.id}`)
          .set('kbn-xsrf', 'true')
          .send({
            name: current.name,
            tags: current.tags,
            schedule: current.schedule,
            throttle: current.throttle ?? null,
            notify_when: current.notify_when ?? null,
            actions: current.actions,
            params: { ...current.params, exceptionsList: nextExceptions },
          })
          .expect(200);

        return body;
      };

      it('allows attaching exception lists via PUT /api/alerting/rule', async () => {
        const body = await editExceptionsViaAlerting(undefined, exceptionsList);
        expect(body.params.exceptionsList).to.eql(exceptionsList);
      });

      it('allows modifying exception lists via PUT /api/alerting/rule', async () => {
        const body = await editExceptionsViaAlerting(exceptionsList, exceptionsListModified);
        expect(body.params.exceptionsList).to.eql(exceptionsListModified);
      });

      it('allows removing exception lists via PUT /api/alerting/rule', async () => {
        const body = await editExceptionsViaAlerting(exceptionsList, []);
        expect(body.params.exceptionsList).to.eql([]);
      });
    });
  });
};
