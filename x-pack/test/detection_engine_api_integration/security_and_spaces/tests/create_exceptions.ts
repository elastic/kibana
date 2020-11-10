/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';
import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request/rule_schemas';
import { getCreateExceptionListItemMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_item_schema.mock';
import { deleteAllExceptions } from '../../../lists_api_integration/utils';
import { RulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/response';
import { getCreateExceptionListMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_schema.mock';
import { CreateExceptionListItemSchema } from '../../../../plugins/lists/common';
import { EXCEPTION_LIST_URL } from '../../../../plugins/lists/common/constants';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  downgradeImmutableRule,
  createRule,
  waitForRuleSuccess,
  installPrePackagedRules,
  getRule,
  createExceptionList,
  createExceptionListItem,
  waitForSignalsToBePresent,
  getAllSignals,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('create_rules_with_exceptions', () => {
    describe('creating rules with exceptions', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
        await deleteAllExceptions(es);
      });

      it('should create a single rule with a rule_id and add an exception list to the rule', async () => {
        const {
          body: { id, list_id, namespace_type, type },
        } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const ruleWithException: CreateRulesSchema = {
          ...getSimpleRule(),
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        };

        const rule = await createRule(supertest, ruleWithException);
        const expected: Partial<RulesSchema> = {
          ...getSimpleRuleOutput(),
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        };
        const bodyToCompare = removeServerGeneratedProperties(rule);
        expect(bodyToCompare).to.eql(expected);
      });

      it('should create a single rule with an exception list and validate it ran successfully', async () => {
        const {
          body: { id, list_id, namespace_type, type },
        } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const ruleWithException: CreateRulesSchema = {
          ...getSimpleRule(),
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        };

        const rule = await createRule(supertest, ruleWithException);
        await waitForRuleSuccess(supertest, rule.id);
        const bodyToCompare = removeServerGeneratedProperties(rule);

        const expected: Partial<RulesSchema> = {
          ...getSimpleRuleOutput(),
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        };
        expect(bodyToCompare).to.eql(expected);
      });

      it('should allow removing an exception list from an immutable rule through patch', async () => {
        await installPrePackagedRules(supertest);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to use
        const immutableRule = await getRule(supertest, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one exceptions_list

        // remove the exceptions list as a user is allowed to remove it from an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306', exceptions_list: [] })
          .expect(200);

        const immutableRuleSecondTime = await getRule(
          supertest,
          '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
        );
        expect(immutableRuleSecondTime.exceptions_list.length).to.eql(0);
      });

      it('should allow adding a second exception list to an immutable rule through patch', async () => {
        await installPrePackagedRules(supertest);

        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          getCreateExceptionListMinimalSchemaMock()
        );

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to use
        const immutableRule = await getRule(supertest, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306',
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

        const immutableRuleSecondTime = await getRule(
          supertest,
          '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
        );

        expect(immutableRuleSecondTime.exceptions_list.length).to.eql(2);
      });

      it('should override any updates to pre-packaged rules if the user removes the exception list through the API but the new version of a rule has an exception list again', async () => {
        await installPrePackagedRules(supertest);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to use
        const immutableRule = await getRule(supertest, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one

        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306', exceptions_list: [] })
          .expect(200);

        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        await installPrePackagedRules(supertest);
        const immutableRuleSecondTime = await getRule(
          supertest,
          '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
        );

        // We should have a length of 1 and it should be the same as our original before we tried to remove it using patch
        expect(immutableRuleSecondTime.exceptions_list.length).to.eql(1);
        expect(immutableRuleSecondTime.exceptions_list).to.eql(immutableRule.exceptions_list);
      });

      it('should merge back an exceptions_list if it was removed from the immutable rule through PATCH', async () => {
        await installPrePackagedRules(supertest);

        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          getCreateExceptionListMinimalSchemaMock()
        );

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const immutableRule = await getRule(supertest, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one

        // remove the exception list and only have a single list that is not an endpoint_list
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306',
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

        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        await installPrePackagedRules(supertest);
        const immutableRuleSecondTime = await getRule(
          supertest,
          '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
        );

        expect(immutableRuleSecondTime.exceptions_list).to.eql([
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
        await installPrePackagedRules(supertest);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const immutableRule = await getRule(supertest, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one

        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        await installPrePackagedRules(supertest);

        const immutableRuleSecondTime = await getRule(
          supertest,
          '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
        );

        // The installed rule should have both the original immutable exceptions list back and the
        // new list the user added.
        expect(immutableRuleSecondTime.exceptions_list).to.eql([...immutableRule.exceptions_list]);
      });

      it('should NOT allow updates to pre-packaged rules to overwrite existing exception based rules when the user adds an additional exception list', async () => {
        await installPrePackagedRules(supertest);

        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          getCreateExceptionListMinimalSchemaMock()
        );

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const immutableRule = await getRule(supertest, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306',
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

        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
        await installPrePackagedRules(supertest);
        const immutableRuleSecondTime = await getRule(
          supertest,
          '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
        );

        // It should be the same as what the user added originally
        expect(immutableRuleSecondTime.exceptions_list).to.eql([
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
        await installPrePackagedRules(supertest);

        // Create a new exception list
        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          getCreateExceptionListMinimalSchemaMock()
        );

        // Rule id of "eb079c62-4481-4d6e-9643-3ca499df7aaa" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/external_alerts.json
        // since this rule does not have existing exceptions_list that we are going to use for tests
        const immutableRule = await getRule(supertest, 'eb079c62-4481-4d6e-9643-3ca499df7aaa');
        expect(immutableRule.exceptions_list.length).eql(0); // make sure we have no exceptions_list

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: 'eb079c62-4481-4d6e-9643-3ca499df7aaa',
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

        await downgradeImmutableRule(es, 'eb079c62-4481-4d6e-9643-3ca499df7aaa');
        await installPrePackagedRules(supertest);
        const immutableRuleSecondTime = await getRule(
          supertest,
          'eb079c62-4481-4d6e-9643-3ca499df7aaa'
        );

        expect(immutableRuleSecondTime.exceptions_list).to.eql([
          {
            id,
            list_id,
            namespace_type,
            type,
          },
        ]);
      });

      describe('tests with auditbeat data', () => {
        beforeEach(async () => {
          await createSignalsIndex(supertest);
          await esArchiver.load('auditbeat/hosts');
        });

        afterEach(async () => {
          await deleteSignalsIndex(supertest);
          await deleteAllAlerts(es);
          await deleteAllExceptions(es);
          await esArchiver.unload('auditbeat/hosts');
        });

        it('should be able to execute against an exception list that does not include valid entries and get back 10 signals', async () => {
          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            getCreateExceptionListMinimalSchemaMock()
          );

          const exceptionListItem: CreateExceptionListItemSchema = {
            ...getCreateExceptionListItemMinimalSchemaMock(),
            entries: [
              {
                field: 'some.none.existent.field', // non-existent field where we should not exclude anything
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
          };
          await createExceptionListItem(supertest, exceptionListItem);

          const ruleWithException: CreateRulesSchema = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'query',
            from: '1900-01-01T00:00:00.000Z',
            query: 'host.name: "suricata-sensor-amsterdam"',
            exceptions_list: [
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          };
          await createRule(supertest, ruleWithException);
          await waitForSignalsToBePresent(supertest, 10);
          const signalsOpen = await getAllSignals(supertest);
          expect(signalsOpen.hits.hits.length).equal(10);
        });

        it('should be able to execute against an exception list that does include valid entries and get back 0 signals', async () => {
          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            getCreateExceptionListMinimalSchemaMock()
          );

          const exceptionListItem: CreateExceptionListItemSchema = {
            ...getCreateExceptionListItemMinimalSchemaMock(),
            entries: [
              {
                field: 'host.name', // This matches the query below which will exclude everything
                operator: 'included',
                type: 'match',
                value: 'suricata-sensor-amsterdam',
              },
            ],
          };
          await createExceptionListItem(supertest, exceptionListItem);

          const ruleWithException: CreateRulesSchema = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'query',
            from: '1900-01-01T00:00:00.000Z',
            query: 'host.name: "suricata-sensor-amsterdam"',
            exceptions_list: [
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          };
          const rule = await createRule(supertest, ruleWithException);
          await waitForRuleSuccess(supertest, rule.id);
          const signalsOpen = await getAllSignals(supertest);
          expect(signalsOpen.hits.hits.length).equal(0);
        });
      });
    });
  });
};
