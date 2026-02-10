/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getCustomQueryRuleParams, fetchRule } from '../../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../../../config/services/common';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Bulk enable/disable', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('should enable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({ rule_id: ruleId, enabled: false })
      );

      const { body } = await detectionsApi.performRulesBulkAction({
        query: {},
        body: { action: BulkActionTypeEnum.enable },
      });

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).toEqual(true);

      // Check that the updates have been persisted
      const ruleBody = await fetchRule(supertest, { ruleId });
      expect(ruleBody.enabled).toEqual(true);
    });

    it('should disable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({ rule_id: ruleId, enabled: true })
      );

      const { body } = await detectionsApi.performRulesBulkAction({
        query: {},
        body: { action: BulkActionTypeEnum.disable },
      });

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).toEqual(false);

      // Check that the updates have been persisted
      const ruleBody = await fetchRule(supertest, { ruleId });
      expect(ruleBody.enabled).toEqual(false);
    });

    describe('RBAC', () => {
      describe('@skipInServerless with rules_read_enable_disable_all user role', () => {
        const role = ROLES.rules_read_enable_disable_all;

        beforeEach(async () => {
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should allow bulk enabling rules', async () => {
          const ruleId = 'ruleId';
          await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({ rule_id: ruleId, enabled: false })
          );

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);

          const { body } = await restrictedApis.performRulesBulkAction({
            query: {},
            body: { action: BulkActionTypeEnum.enable },
          });

          expect(body.attributes.summary).toEqual({
            failed: 0,
            skipped: 0,
            succeeded: 1,
            total: 1,
          });

          // Check that the updated rule is returned with the response
          expect(body.attributes.results.updated[0].enabled).toEqual(true);
        });

        it('should allow bulk disabling rules', async () => {
          const ruleId = 'ruleId';
          await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({ rule_id: ruleId, enabled: true })
          );

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);

          const { body } = await restrictedApis.performRulesBulkAction({
            query: {},
            body: { action: BulkActionTypeEnum.disable },
          });

          expect(body.attributes.summary).toEqual({
            failed: 0,
            skipped: 0,
            succeeded: 1,
            total: 1,
          });

          // Check that the updated rule is returned with the response
          expect(body.attributes.results.updated[0].enabled).toEqual(false);
        });
      });

      describe('@skipInServerless without enableDisableRules subfeature permission', () => {
        const role = ROLES.rules_read_investigation_guide_all;

        beforeEach(async () => {
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should fail bulk enabling rules', async () => {
          const ruleId = 'ruleId';
          const createdRule = await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({ rule_id: ruleId, enabled: false })
          );

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);

          const { body } = await restrictedApis.performRulesBulkAction({
            query: {},
            body: { action: BulkActionTypeEnum.enable },
          });

          expect(body.attributes.summary).toEqual({
            failed: 1,
            skipped: 0,
            succeeded: 0,
            total: 1,
          });
          expect(body.attributes.errors[0]).toEqual({
            err_code: 'USER_INSUFFICIENT_RULE_PRIVILEGES',
            message: 'User does not have permission to enable rules',
            status_code: 500,
            rules: [
              {
                id: createdRule.id,
                name: createdRule.name,
              },
            ],
          });
        });

        it('should fail bulk disabling rules', async () => {
          const ruleId = 'ruleId';
          const createdRule = await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({ rule_id: ruleId, enabled: true })
          );

          const restrictedUser = { username: role, password: 'changeme' };
          const restrictedApis = detectionsApi.withUser(restrictedUser);

          const { body } = await restrictedApis.performRulesBulkAction({
            query: {},
            body: { action: BulkActionTypeEnum.disable },
          });

          expect(body.attributes.summary).toEqual({
            failed: 1,
            skipped: 0,
            succeeded: 0,
            total: 1,
          });
          expect(body.attributes.errors[0]).toEqual({
            err_code: 'USER_INSUFFICIENT_RULE_PRIVILEGES',
            message: 'User does not have permission to disable rules',
            status_code: 500,
            rules: [
              {
                id: createdRule.id,
                name: createdRule.name,
              },
            ],
          });
        });
      });
    });
  });
};
