/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from 'expect';

import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ELASTIC_SECURITY_RULE_ID } from '@kbn/security-solution-plugin/common';

import {
  fetchRule,
  createExceptionList,
  removeServerGeneratedProperties,
  downgradeImmutableRule,
  installMockPrebuiltRules,
  findImmutableRuleById,
  getPrebuiltRulesAndTimelinesStatus,
  SAMPLE_PREBUILT_RULES,
} from '../../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @ess exceptions workflows for prebuilt rules', () => {
    describe('creating rules with exceptions', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await deleteAllExceptions(supertest, log);
      });

      it('should allow removing an exception list from an immutable rule through patch', async () => {
        await installMockPrebuiltRules(supertest, es);

        // This rule has an existing exceptions_list that we are going to use
        const immutableRule = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });
        expect(immutableRule.exceptions_list.length).toBeGreaterThan(0); // make sure we have at least one exceptions_list

        // remove the exceptions list as a user is allowed to remove it from an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: ELASTIC_SECURITY_RULE_ID, exceptions_list: [] })
          .expect(200);

        const immutableRuleSecondTime = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });
        expect(immutableRuleSecondTime.exceptions_list.length).toEqual(0);
      });

      it('should allow adding a second exception list to an immutable rule through patch', async () => {
        await installMockPrebuiltRules(supertest, es);

        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          log,
          getCreateExceptionListMinimalSchemaMock()
        );

        // This rule has an existing exceptions_list that we are going to use
        const immutableRule = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });
        expect(immutableRule.exceptions_list.length).toBeGreaterThan(0); // make sure we have at least one

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        const immutableRuleSecondTime = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });

        expect(immutableRuleSecondTime.exceptions_list.length).toEqual(2);
      });

      it('should override any updates to pre-packaged rules if the user removes the exception list through the API but the new version of a rule has an exception list again', async () => {
        await installMockPrebuiltRules(supertest, es);

        // This rule has an existing exceptions_list that we are going to use
        const immutableRule = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });
        expect(immutableRule.exceptions_list.length).toBeGreaterThan(0); // make sure we have at least one

        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({ rule_id: ELASTIC_SECURITY_RULE_ID, exceptions_list: [] })
          .expect(200);

        await downgradeImmutableRule(es, log, ELASTIC_SECURITY_RULE_ID);
        await installMockPrebuiltRules(supertest, es);
        const immutableRuleSecondTime = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });

        // We should have a length of 1 and it should be the same as our original before we tried to remove it using patch
        expect(immutableRuleSecondTime.exceptions_list.length).toEqual(1);
        expect(immutableRuleSecondTime.exceptions_list).toEqual(immutableRule.exceptions_list);
      });

      it('should merge back an exceptions_list if it was removed from the immutable rule through PATCH', async () => {
        await installMockPrebuiltRules(supertest, es);

        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          log,
          getCreateExceptionListMinimalSchemaMock()
        );

        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const immutableRule = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });
        expect(immutableRule.exceptions_list.length).toBeGreaterThan(0); // make sure we have at least one

        // remove the exception list and only have a single list that is not an endpoint_list
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await downgradeImmutableRule(es, log, ELASTIC_SECURITY_RULE_ID);
        await installMockPrebuiltRules(supertest, es);
        const immutableRuleSecondTime = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });

        expect(immutableRuleSecondTime.exceptions_list).toEqual([
          ...immutableRule.exceptions_list,
          {
            id,
            list_id,
            namespace_type,
            type,
          },
        ]);
      });

      it('should NOT add an extra exceptions_list that already exists on a rule during an upgrade', async () => {
        await installMockPrebuiltRules(supertest, es);

        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const immutableRule = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });
        expect(immutableRule.exceptions_list.length).toBeGreaterThan(0); // make sure we have at least one

        await downgradeImmutableRule(es, log, ELASTIC_SECURITY_RULE_ID);
        await installMockPrebuiltRules(supertest, es);

        const immutableRuleSecondTime = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });

        // The installed rule should have both the original immutable exceptions list back and the
        // new list the user added.
        expect(immutableRuleSecondTime.exceptions_list).toEqual([...immutableRule.exceptions_list]);
      });

      it('should NOT allow updates to pre-packaged rules to overwrite existing exception based rules when the user adds an additional exception list', async () => {
        await installMockPrebuiltRules(supertest, es);

        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          log,
          getCreateExceptionListMinimalSchemaMock()
        );

        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const immutableRule = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await downgradeImmutableRule(es, log, ELASTIC_SECURITY_RULE_ID);
        await installMockPrebuiltRules(supertest, es);
        const immutableRuleSecondTime = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });

        // It should be the same as what the user added originally
        expect(immutableRuleSecondTime.exceptions_list).toEqual([
          ...immutableRule.exceptions_list,
          {
            id,
            list_id,
            namespace_type,
            type,
          },
        ]);
      });

      it('should not remove any exceptions added to a pre-packaged/immutable rule during an update if that rule has no existing exception lists', async () => {
        await installMockPrebuiltRules(supertest, es);

        // Create a new exception list
        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          log,
          getCreateExceptionListMinimalSchemaMock()
        );

        // Find a rule without exceptions_list
        const ruleWithoutExceptionList = SAMPLE_PREBUILT_RULES.find(
          (rule) => !rule['security-rule'].exceptions_list
        );
        const ruleId = ruleWithoutExceptionList?.['security-rule'].rule_id;
        if (!ruleId) {
          throw new Error('Cannot find a rule without exceptions_list in the sample data');
        }

        const immutableRule = await fetchRule(supertest, { ruleId });
        expect(immutableRule.exceptions_list.length).toEqual(0); // make sure we have no exceptions_list

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            rule_id: ruleId,
            exceptions_list: [
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        await downgradeImmutableRule(es, log, ruleId);
        await installMockPrebuiltRules(supertest, es);
        const immutableRuleSecondTime = await fetchRule(supertest, { ruleId });

        expect(immutableRuleSecondTime.exceptions_list).toEqual([
          {
            id,
            list_id,
            namespace_type,
            type,
          },
        ]);
      });

      it('should not change the immutable tags when adding a second exception list to an immutable rule through patch', async () => {
        await installMockPrebuiltRules(supertest, es);

        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          log,
          getCreateExceptionListMinimalSchemaMock()
        );

        // This rule has an existing exceptions_list that we are going to use
        const immutableRule = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });
        expect(immutableRule.exceptions_list.length).toBeGreaterThan(0); // make sure we have at least one

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        const body = await findImmutableRuleById(supertest, log, ELASTIC_SECURITY_RULE_ID);
        expect(body.data.length).toEqual(1); // should have only one length to the data set, otherwise we have duplicates or the tags were removed and that is incredibly bad.

        const bodyToCompare = removeServerGeneratedProperties(body.data[0]);
        expect(bodyToCompare.rule_id).toEqual(immutableRule.rule_id); // Rule id should not change with a a patch
        expect(bodyToCompare.immutable).toEqual(immutableRule.immutable); // Immutable should always stay the same which is true and never flip to false.
        expect(bodyToCompare.version).toEqual(immutableRule.version); // The version should never update on a patch
      });

      it('should not change count of prepacked rules when adding a second exception list to an immutable rule through patch. If this fails, suspect the immutable tags are not staying on the rule correctly.', async () => {
        await installMockPrebuiltRules(supertest, es);

        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          log,
          getCreateExceptionListMinimalSchemaMock()
        );

        // This rule has an existing exceptions_list that we are going to use
        const immutableRule = await fetchRule(supertest, {
          ruleId: ELASTIC_SECURITY_RULE_ID,
        });
        expect(immutableRule.exceptions_list.length).toBeGreaterThan(0); // make sure we have at least one

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            rule_id: ELASTIC_SECURITY_RULE_ID,
            exceptions_list: [
              ...immutableRule.exceptions_list,
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          })
          .expect(200);

        const status = await getPrebuiltRulesAndTimelinesStatus(es, supertest);
        expect(status.rules_not_installed).toEqual(0);
      });
    });
  });
};
