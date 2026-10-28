/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuid } from 'uuid';
import type TestAgent from 'supertest/lib/agent';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { createSupertestErrorLogger } from '../../../../edr_workflows/utils';
import {
  combineToNdJson,
  fetchRule,
  getCustomQueryRuleParams,
  getRuleSOById,
} from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import type { CustomRole } from '../../../../../config/services/types';

/**
 * A user with rule management and Saved Objects management privileges, but no Endpoint
 * response-action privilege, could import a hidden `alert` saved object carrying a
 * privileged response action through the generic `/api/saved_objects/_import` route
 * (which never runs the rule type's params authorizer), then activate it through the
 * generic enable routes (which didn't re-run it either).
 *
 * This is deliberately exercised through the *generic* Saved Objects and Alerting routes,
 * not the Detection Engine's own import/bulk-action routes: those already run the full
 * `createRule`/`updateRule` logic (see `import_rules_response_actions.ts`), so they were
 * never part of this bypass.
 */

const RULE_ENABLE_ONLY_ROLE: CustomRole = {
  name: 'rule_enable_object_management_all',
  privileges: {
    elasticsearch: {},
    kibana: [
      {
        feature: {
          securitySolutionRulesV4: ['read', 'security_solution_enable_disable_rules'],
          savedObjectsManagement: ['all'],
        },
        spaces: ['default'],
      },
    ],
  },
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @skipInServerlessMKI import rules with endpoint response actions via the generic Saved Objects API', () => {
    let superTestResponseActionsNoAuthz: TestAgent;

    before(async () => {
      superTestResponseActionsNoAuthz = await utils.createSuperTestWithCustomRole(
        RULE_ENABLE_ONLY_ROLE
      );
    });

    after(async () => {
      await utils.cleanUpCustomRoles();
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    /**
     * Builds the NDJSON line the generic Saved Objects importer expects: the raw `alert`
     * saved object, not the Detection Engine's own flat rule-export format. An `.endpoint`
     * isolate response action is injected into `params`. A fresh `ruleId` is assigned so the
     * object doesn't collide with the source rule it was cloned from.
     */
    const buildIsolateRuleSavedObject = async (sourceRuleId: string, importedRuleId: string) => {
      const { hits } = await getRuleSOById(es, sourceRuleId);
      const source = hits.hits[0]?._source as unknown as {
        alert: Record<string, unknown>;
        references: unknown[];
        coreMigrationVersion?: string;
        typeMigrationVersion?: string;
      };
      expect(source).toBeDefined();

      return {
        type: 'alert',
        id: importedRuleId,
        attributes: {
          ...source.alert,
          name: 'Imported isolate rule',
          params: {
            ...(source.alert.params as Record<string, unknown>),
            ruleId: importedRuleId,
            responseActions: [
              {
                actionTypeId: '.endpoint',
                params: { command: 'isolate', comment: 'some comment' },
              },
            ],
          },
        },
        references: source.references,
        coreMigrationVersion: source.coreMigrationVersion,
        typeMigrationVersion: source.typeMigrationVersion,
      };
    };

    const importRuleSavedObject = (agent: TestAgent, ruleSavedObject: unknown) =>
      agent
        .post('/api/saved_objects/_import')
        .query({ overwrite: true })
        .set('kbn-xsrf', 'true')
        .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
        .attach('file', Buffer.from(combineToNdJson(ruleSavedObject)), 'rules.ndjson');

    it('accepts the saved object through the generic import route regardless of response-action authz', async () => {
      const sourceRule = await createRule(supertest, log, getCustomQueryRuleParams());
      const importedRuleId = uuid();
      const ruleSavedObject = await buildIsolateRuleSavedObject(sourceRule.id, importedRuleId);

      const { body: importResponse } = await importRuleSavedObject(
        superTestResponseActionsNoAuthz,
        ruleSavedObject
      ).expect(200);

      expect(importResponse).toMatchObject({ success: true, successCount: 1 });

      const importedRule = await fetchRule(supertest, { id: importedRuleId });
      expect(importedRule.enabled).toBe(false);
      expect(importedRule.response_actions?.[0]).toMatchObject({
        action_type_id: '.endpoint',
        params: { command: 'isolate' },
      });
    });

    it('rejects enabling the imported rule through the generic enable route when the user lacks response-action authz', async () => {
      const sourceRule = await createRule(supertest, log, getCustomQueryRuleParams());
      const importedRuleId = uuid();
      const ruleSavedObject = await buildIsolateRuleSavedObject(sourceRule.id, importedRuleId);

      await importRuleSavedObject(superTestResponseActionsNoAuthz, ruleSavedObject).expect(200);

      const { body: enableResponse } = await superTestResponseActionsNoAuthz
        .post(`/api/alerting/rule/${importedRuleId}/_enable`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
        .expect(403);

      expect(enableResponse.message).toBe(
        'User is not authorized to create/update isolate response action'
      );

      const finalState = await fetchRule(supertest, { id: importedRuleId });
      expect(finalState.enabled).toBe(false);
    });

    it('skips the rule and records an error through the generic bulk-enable route when the user lacks response-action authz', async () => {
      const sourceRule = await createRule(supertest, log, getCustomQueryRuleParams());
      const importedRuleId = uuid();
      const ruleSavedObject = await buildIsolateRuleSavedObject(sourceRule.id, importedRuleId);

      await importRuleSavedObject(superTestResponseActionsNoAuthz, ruleSavedObject).expect(200);

      const { body: bulkEnableResponse } = await superTestResponseActionsNoAuthz
        .patch('/internal/alerting/rules/_bulk_enable')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send({ ids: [importedRuleId] })
        .expect(200);

      expect(bulkEnableResponse.rules).toEqual([]);
      expect(bulkEnableResponse.errors).toEqual([
        {
          message: 'User is not authorized to create/update isolate response action',
          rule: { id: importedRuleId, name: 'Imported isolate rule' },
        },
      ]);

      const finalState = await fetchRule(supertest, { id: importedRuleId });
      expect(finalState.enabled).toBe(false);
    });

    it('allows an authorized user to import and enable the same rule through the generic routes', async () => {
      const sourceRule = await createRule(supertest, log, getCustomQueryRuleParams());
      const importedRuleId = uuid();
      const ruleSavedObject = await buildIsolateRuleSavedObject(sourceRule.id, importedRuleId);

      await importRuleSavedObject(supertest, ruleSavedObject).expect(200);

      await supertest
        .post(`/api/alerting/rule/${importedRuleId}/_enable`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(204);

      const finalState = await fetchRule(supertest, { id: importedRuleId });
      expect(finalState.enabled).toBe(true);
      expect(finalState.response_actions?.[0]).toMatchObject({
        action_type_id: '.endpoint',
        params: { command: 'isolate' },
      });
    });
  });
};
