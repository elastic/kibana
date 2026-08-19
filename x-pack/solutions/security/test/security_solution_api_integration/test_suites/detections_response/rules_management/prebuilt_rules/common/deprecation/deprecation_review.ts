/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { REVIEW_RULE_DEPRECATION_URL } from '@kbn/security-solution-plugin/common/api/detection_engine/prebuilt_rules';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  createDeprecatedPrebuiltRuleAssetSavedObjects,
  deleteAllPrebuiltRuleAssets,
  getCustomQueryRuleParams,
  installPrebuiltRules,
  reviewRuleDeprecation,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const log = getService('log');
  const security = getService('security');

  describe('@ess @serverless @skipInServerlessMKI Review rule deprecation endpoint', () => {
    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    describe('No ids filter (returns all installed deprecated rules)', () => {
      it('returns empty rules array when no deprecated rule assets exist', async () => {
        const response = await reviewRuleDeprecation(es, supertest);
        expect(response.rules).toEqual([]);
      });

      it('returns empty when deprecated assets exist but no matching rules are installed', async () => {
        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'deprecated-rule-1', version: 2 },
        ]);

        const response = await reviewRuleDeprecation(es, supertest);
        expect(response.rules).toEqual([]);
      });

      it('returns only installed rules that have deprecated assets (intersection)', async () => {
        // Install rule-a and rule-b
        await createPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-a', version: 1, name: 'Rule A' }),
          createRuleAssetSavedObject({ rule_id: 'rule-b', version: 1, name: 'Rule B' }),
        ]);
        await installPrebuiltRules(es, supertest);

        // Deprecate rule-a (installed) and rule-c (not installed)
        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'rule-a', version: 2 },
          { rule_id: 'rule-c', version: 1 },
        ]);

        const response = await reviewRuleDeprecation(es, supertest);

        expect(response.rules).toHaveLength(1);
        expect(response.rules[0]).toMatchObject({ rule_id: 'rule-a' });
      });

      it('includes deprecated_reason when present on the deprecated asset', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        ]);
        await installPrebuiltRules(es, supertest);

        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'rule-1', version: 2, deprecated_reason: 'Replaced by rule-2' },
        ]);

        const response = await reviewRuleDeprecation(es, supertest);

        expect(response.rules).toHaveLength(1);
        expect(response.rules[0].deprecated_reason).toBe('Replaced by rule-2');
      });

      it('does not include deprecated_reason when absent from the deprecated asset', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        ]);
        await installPrebuiltRules(es, supertest);

        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'rule-1', version: 2 },
        ]);

        const response = await reviewRuleDeprecation(es, supertest);

        expect(response.rules).toHaveLength(1);
        expect(response.rules[0]).not.toHaveProperty('deprecated_reason');
      });

      it('returns the installed rule name, not the deprecated asset name', async () => {
        const customizedName = 'My Customized Rule Name';

        await createPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'Original Name' }),
        ]);
        await installPrebuiltRules(es, supertest);

        // Rename the installed rule to simulate a user customization
        await supertest
          .patch('/api/detection_engine/rules')
          .set('kbn-xsrf', 'true')
          .send({ rule_id: 'rule-1', name: customizedName })
          .expect(200);

        // Add a deprecated asset with a different name
        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'rule-1', version: 2, name: 'Package Stub Name' },
        ]);

        const response = await reviewRuleDeprecation(es, supertest);

        expect(response.rules).toHaveLength(1);
        expect(response.rules[0].name).toBe(customizedName);
      });

      it('returns the installed SO id, not the deprecated asset id', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        ]);
        const installResult = await installPrebuiltRules(es, supertest);
        const installedRuleId = installResult.results.created[0].id;

        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'rule-1', version: 2 },
        ]);

        const response = await reviewRuleDeprecation(es, supertest);

        expect(response.rules).toHaveLength(1);
        expect(response.rules[0].id).toBe(installedRuleId);
      });

      it('returns empty when package has no deprecated rule assets', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        ]);
        await installPrebuiltRules(es, supertest);

        const response = await reviewRuleDeprecation(es, supertest);
        expect(response.rules).toEqual([]);
      });

      it('ignores installed custom rules whose rule_id matches a deprecated asset', async () => {
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({ rule_id: 'rule-1', name: 'Custom rule' })
        );

        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'rule-1', version: 2 },
        ]);

        const response = await reviewRuleDeprecation(es, supertest);
        expect(response.rules).toEqual([]);
      });
    });

    describe('With ids filter', () => {
      it('returns only the rule matching the provided SO id', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-a', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-b', version: 1 }),
        ]);
        const installResult = await installPrebuiltRules(es, supertest);
        const ruleAId = installResult.results.created.find((r) => r.rule_id === 'rule-a')?.id;

        // Deprecate both rules
        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'rule-a', version: 2 },
          { rule_id: 'rule-b', version: 2 },
        ]);

        // Filter to only rule-a
        const response = await reviewRuleDeprecation(es, supertest, { ids: [ruleAId!] });

        expect(response.rules).toHaveLength(1);
        expect(response.rules[0].id).toBe(ruleAId);
        expect(response.rules[0].rule_id).toBe('rule-a');
      });

      it('returns empty when the filtered rule is not deprecated', async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
        ]);
        const installResult = await installPrebuiltRules(es, supertest);
        const installedRuleId = installResult.results.created[0].id;

        // No deprecated asset for rule-1
        const response = await reviewRuleDeprecation(es, supertest, {
          ids: [installedRuleId],
        });

        expect(response.rules).toEqual([]);
      });

      it('ignores a custom rule looked up by SO id whose rule_id matches a deprecated asset', async () => {
        const customRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({ rule_id: 'rule-1', name: 'Custom rule' })
        );

        await createDeprecatedPrebuiltRuleAssetSavedObjects(es, [
          { rule_id: 'rule-1', version: 2 },
        ]);

        const response = await reviewRuleDeprecation(es, supertest, { ids: [customRule.id] });
        expect(response.rules).toEqual([]);
      });

      it('returns 400 when the filtered id does not exist', async () => {
        const response = await reviewRuleDeprecation(
          es,
          supertest,
          { ids: ['non-existent-so-id'] },
          400
        );

        expect(response).toMatchObject({
          message: 'No rules found for bulk get',
          status_code: 400,
        });
      });
    });

    describe('Authorization', () => {
      const roleName = 'no_kibana_privileges_deprecation_test';
      let noPrivilegesUser: { username: string; password: string };

      before(async () => {
        noPrivilegesUser = { username: 'test_no_privileges_user', password: 'changeme' };

        // Create a role with no Kibana privileges so the user cannot access any Security Solution route
        await security.role.create(roleName, {
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [],
        });

        await security.user.create(noPrivilegesUser.username, {
          password: noPrivilegesUser.password,
          roles: [roleName],
          full_name: 'No Privileges User',
        });
      });

      after(async () => {
        await security.user.delete(noPrivilegesUser.username);
        await security.role.delete(roleName);
      });

      it('returns 403 Forbidden when user lacks rules read privileges', async () => {
        await supertestWithoutAuth
          .post(REVIEW_RULE_DEPRECATION_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .set('x-elastic-internal-origin', 'foo')
          .auth(noPrivilegesUser.username, noPrivilegesUser.password)
          .send(null)
          .expect(403);
      });
    });
  });
};
