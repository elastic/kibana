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

import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createUserAndRole, deleteUserAndRole } from '../../../../../config/services/common';
import { getSimpleRule } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI patch_rules RBAC', () => {
    describe('@skipInServerless with rules_read_exceptions_all user role', () => {
      const role = ROLES.rules_read_exceptions_all;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should overwrite exception list value on patch', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              exceptions_list: [
                {
                  id: '1',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
          })
          .expect(200);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              exceptions_list: [
                {
                  id: '2',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.DETECTION,
                },
              ],
            },
          })
          .expect(200);

        expect(body.exceptions_list).to.eql([
          { id: '2', list_id: '123', namespace_type: 'single', type: 'detection' },
        ]);
      });

      it('should throw error when patching exception list and non-valid read authz field', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              query: 'this should fail in the patch route',
              exceptions_list: [
                {
                  id: '1',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
          })
          .expect(403);
        expect(body.message).to.eql('Unauthorized by "siem" to update "siem.queryRule" rule');
      });

      it('should throw error when patching one non-valid read authz field', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              query: 'this should fail in the patch route',
            },
          })
          .expect(403);
        expect(body.message).to.eql('Unauthorized by "siem" to update "siem.queryRule" rule');
      });
    });

    describe('@skipInServerless with rules_read_exceptions_read user role', () => {
      const role = ROLES.rules_read_exceptions_read;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should return unauthorized when patching exception list value', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: 'rules_read_exceptions_read', password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              exceptions_list: [
                {
                  id: '1',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.RULE_DEFAULT,
                },
              ],
            },
          })
          .expect(403);
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

      it('should allow patching note field', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              note: 'Updated investigation guide content',
            },
          })
          .expect(200);

        expect(body.note).to.eql('Updated investigation guide content');
      });

      it('should not allow patching non-investigation-guide fields', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              name: 'This should fail',
            },
          })
          .expect(403);
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

      it('should allow patching investigation_fields', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              investigation_fields: { field_names: ['host.name', 'user.name'] },
            },
          })
          .expect(200);

        expect(body.investigation_fields).to.eql({ field_names: ['host.name', 'user.name'] });
      });

      it('should not allow patching non-custom-highlighted-fields fields', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              name: 'This should fail',
            },
          })
          .expect(403);
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

      it('should allow patching enabled field', async () => {
        await createRule(supertest, log, { ...getSimpleRule('rule-1'), enabled: false });

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              enabled: true,
            },
          })
          .expect(200);

        expect(body.enabled).to.eql(true);
      });

      it('should allow disabling a rule', async () => {
        await createRule(supertest, log, { ...getSimpleRule('rule-1'), enabled: true });

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              enabled: false,
            },
          })
          .expect(200);

        expect(body.enabled).to.eql(false);
      });

      it('should not allow patching non-enabled fields', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              name: 'This should fail',
            },
          })
          .expect(403);
      });
    });

    describe('@skipInServerless with rules_read_multiple_subfeatures_all user role', () => {
      const role = ROLES.rules_read_subfeatures_all;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await createUserAndRole(getService, role);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, role);
      });

      it('should allow patching multiple subfeature fields at once', async () => {
        await createRule(supertest, log, { ...getSimpleRule('rule-1'), enabled: false });

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              note: 'Updated investigation guide',
              investigation_fields: { field_names: ['host.name', 'user.name'] },
              enabled: true,
            },
          })
          .expect(200);

        expect(body.note).to.eql('Updated investigation guide');
        expect(body.investigation_fields).to.eql({ field_names: ['host.name', 'user.name'] });
        expect(body.enabled).to.eql(true);
      });

      it('should allow patching a subset of subfeature fields', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              note: 'Just updating the note',
            },
          })
          .expect(200);

        expect(body.note).to.eql('Just updating the note');
      });

      it('should not allow patching non-subfeature fields even with multiple subfeature permissions', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              note: 'This is allowed',
              name: 'But this should fail',
            },
          })
          .expect(403);
      });

      it('should return 403 with specific error when patching a read-auth field without that subfeature permission', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const restrictedUser = { username: role, password: 'changeme' };
        const restrictedApis = detectionsApi.withUser(restrictedUser);
        const { body } = await restrictedApis
          .patchRule({
            body: {
              rule_id: 'rule-1',
              note: 'This is allowed',
              // User doesn't have exception list edit capabilities
              exceptions_list: [
                {
                  id: '1',
                  list_id: '123',
                  namespace_type: 'single',
                  type: ExceptionListTypeEnum.DETECTION,
                },
              ],
            },
          })
          .expect(403);

        expect(body.message).to.eql(
          'The current user does not have the permissions to edit the following fields: exceptions_list'
        );
      });
    });
  });
};
