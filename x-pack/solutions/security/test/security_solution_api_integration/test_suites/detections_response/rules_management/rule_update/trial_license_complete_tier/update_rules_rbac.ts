/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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
  });
};
