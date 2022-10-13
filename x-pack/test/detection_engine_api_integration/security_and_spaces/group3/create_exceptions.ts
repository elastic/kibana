/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import type {
  CreateRulesSchema,
  EqlCreateSchema,
  QueryCreateSchema,
  ThreatMatchCreateSchema,
  ThresholdCreateSchema,
} from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
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
  waitForRuleSuccessOrStatus,
  installPrePackagedRules,
  getRule,
  createExceptionList,
  createExceptionListItem,
  waitForSignalsToBePresent,
  getSignalsByIds,
  findImmutableRuleById,
  getPrePackagedRulesStatus,
  getOpenSignals,
  createRuleWithExceptionEntries,
  getEqlRuleForSignalTesting,
  getThresholdRuleForSignalTesting,
} from '../../utils';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../lists_api_integration/utils';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('create_rules_with_exceptions', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    describe('creating rules with exceptions', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
        await deleteAllExceptions(supertest, log);
      });

      describe('elastic admin', () => {
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

          const rule = await createRule(supertest, log, ruleWithException);
          const expected = {
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
            enabled: true,
            exceptions_list: [
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          };

          const rule = await createRule(supertest, log, ruleWithException);
          await waitForRuleSuccessOrStatus(supertest, log, rule.id);
          const bodyToCompare = removeServerGeneratedProperties(rule);

          const expected = {
            ...getSimpleRuleOutput(),
            enabled: true,
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
          await installPrePackagedRules(supertest, log);

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint.json
          // This rule has an existing exceptions_list that we are going to use
          const immutableRule = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one exceptions_list

          // remove the exceptions list as a user is allowed to remove it from an immutable rule
          await supertest
            .patch(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({ rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306', exceptions_list: [] })
            .expect(200);

          const immutableRuleSecondTime = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          expect(immutableRuleSecondTime.exceptions_list.length).to.eql(0);
        });

        it('should allow adding a second exception list to an immutable rule through patch', async () => {
          await installPrePackagedRules(supertest, log);

          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            log,
            getCreateExceptionListMinimalSchemaMock()
          );

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint.json
          // This rule has an existing exceptions_list that we are going to use
          const immutableRule = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
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
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );

          expect(immutableRuleSecondTime.exceptions_list.length).to.eql(2);
        });

        it('should override any updates to pre-packaged rules if the user removes the exception list through the API but the new version of a rule has an exception list again', async () => {
          await installPrePackagedRules(supertest, log);

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint.json
          // This rule has an existing exceptions_list that we are going to use
          const immutableRule = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one

          await supertest
            .patch(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send({ rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306', exceptions_list: [] })
            .expect(200);

          await downgradeImmutableRule(es, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
          await installPrePackagedRules(supertest, log);
          const immutableRuleSecondTime = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );

          // We should have a length of 1 and it should be the same as our original before we tried to remove it using patch
          expect(immutableRuleSecondTime.exceptions_list.length).to.eql(1);
          expect(immutableRuleSecondTime.exceptions_list).to.eql(immutableRule.exceptions_list);
        });

        it('should merge back an exceptions_list if it was removed from the immutable rule through PATCH', async () => {
          await installPrePackagedRules(supertest, log);

          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            log,
            getCreateExceptionListMinimalSchemaMock()
          );

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint.json
          // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
          const immutableRule = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
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

          await downgradeImmutableRule(es, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
          await installPrePackagedRules(supertest, log);
          const immutableRuleSecondTime = await getRule(
            supertest,
            log,
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
          await installPrePackagedRules(supertest, log);

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint.json
          // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
          const immutableRule = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one

          await downgradeImmutableRule(es, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
          await installPrePackagedRules(supertest, log);

          const immutableRuleSecondTime = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );

          // The installed rule should have both the original immutable exceptions list back and the
          // new list the user added.
          expect(immutableRuleSecondTime.exceptions_list).to.eql([
            ...immutableRule.exceptions_list,
          ]);
        });

        it('should NOT allow updates to pre-packaged rules to overwrite existing exception based rules when the user adds an additional exception list', async () => {
          await installPrePackagedRules(supertest, log);

          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            log,
            getCreateExceptionListMinimalSchemaMock()
          );

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint.json
          // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
          const immutableRule = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );

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

          await downgradeImmutableRule(es, log, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');
          await installPrePackagedRules(supertest, log);
          const immutableRuleSecondTime = await getRule(
            supertest,
            log,
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
          await installPrePackagedRules(supertest, log);

          // Create a new exception list
          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            log,
            getCreateExceptionListMinimalSchemaMock()
          );

          // Rule id of "eb079c62-4481-4d6e-9643-3ca499df7aaa" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/external_alerts.json
          // since this rule does not have existing exceptions_list that we are going to use for tests
          const immutableRule = await getRule(
            supertest,
            log,
            'eb079c62-4481-4d6e-9643-3ca499df7aaa'
          );
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

          await downgradeImmutableRule(es, log, 'eb079c62-4481-4d6e-9643-3ca499df7aaa');
          await installPrePackagedRules(supertest, log);
          const immutableRuleSecondTime = await getRule(
            supertest,
            log,
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

        it('should not change the immutable tags when adding a second exception list to an immutable rule through patch', async () => {
          await installPrePackagedRules(supertest, log);

          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            log,
            getCreateExceptionListMinimalSchemaMock()
          );

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint.json
          // This rule has an existing exceptions_list that we are going to use
          const immutableRule = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
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

          const body = await findImmutableRuleById(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
          expect(body.data.length).to.eql(1); // should have only one length to the data set, otherwise we have duplicates or the tags were removed and that is incredibly bad.

          const bodyToCompare = removeServerGeneratedProperties(body.data[0]);
          expect(bodyToCompare.rule_id).to.eql(immutableRule.rule_id); // Rule id should not change with a a patch
          expect(bodyToCompare.immutable).to.eql(immutableRule.immutable); // Immutable should always stay the same which is true and never flip to false.
          expect(bodyToCompare.version).to.eql(immutableRule.version); // The version should never update on a patch
        });

        it('should not change count of prepacked rules when adding a second exception list to an immutable rule through patch. If this fails, suspect the immutable tags are not staying on the rule correctly.', async () => {
          await installPrePackagedRules(supertest, log);

          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            log,
            getCreateExceptionListMinimalSchemaMock()
          );

          // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
          // x-pack/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/content/prepackaged_rules/elastic_endpoint.json
          // This rule has an existing exceptions_list that we are going to use
          const immutableRule = await getRule(
            supertest,
            log,
            '9a1a2dae-0b5f-4c3d-8305-a268d404c306'
          );
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

          const status = await getPrePackagedRulesStatus(supertest, log);
          expect(status.rules_not_installed).to.eql(0);
        });
      });

      describe('t1_analyst', () => {
        const role = ROLES.t1_analyst;

        beforeEach(async () => {
          await createUserAndRole(getService, role);
        });

        afterEach(async () => {
          await deleteUserAndRole(getService, role);
        });

        it('should NOT be able to create an exception list', async () => {
          await supertestWithoutAuth
            .post(EXCEPTION_LIST_ITEM_URL)
            .auth(role, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(getCreateExceptionListItemMinimalSchemaMock())
            .expect(403);
        });

        it('should NOT be able to create an exception list item', async () => {
          await supertestWithoutAuth
            .post(EXCEPTION_LIST_ITEM_URL)
            .auth(role, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(getCreateExceptionListItemMinimalSchemaMock())
            .expect(403);
        });
      });

      describe('tests with auditbeat data', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        beforeEach(async () => {
          await createSignalsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteSignalsIndex(supertest, log);
          await deleteAllAlerts(supertest, log);
          await deleteAllExceptions(supertest, log);
        });

        it('should be able to execute against an exception list that does not include valid entries and get back 10 signals', async () => {
          const { id, list_id, namespace_type, type } = await createExceptionList(
            supertest,
            log,
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
          await createExceptionListItem(supertest, log, exceptionListItem);

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
          const { id: createdId } = await createRule(supertest, log, ruleWithException);
          await waitForRuleSuccessOrStatus(supertest, log, createdId);
          await waitForSignalsToBePresent(supertest, log, 10, [createdId]);
          const signalsOpen = await getSignalsByIds(supertest, log, [createdId]);
          expect(signalsOpen.hits.hits.length).equal(10);
        });

        it('should be able to execute against an exception list that does include valid entries and get back 0 signals', async () => {
          const rule: QueryCreateSchema = {
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
          };
          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'host.name', // This matches the query above which will exclude everything
                operator: 'included',
                type: 'match',
                value: 'suricata-sensor-amsterdam',
              },
            ],
          ]);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).equal(0);
        });

        it('generates no signals when an exception is added for an EQL rule', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['auditbeat-*']),
            query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
          };
          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'host.id',
                operator: 'included',
                type: 'match',
                value: '8cc95778cce5407c809480e8e32ad76b',
              },
            ],
          ]);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).equal(0);
        });

        it('generates no signals when an exception is added for a threshold rule', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
            threshold: {
              field: 'host.id',
              value: 700,
            },
          };
          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'host.id',
                operator: 'included',
                type: 'match',
                value: '8cc95778cce5407c809480e8e32ad76b',
              },
            ],
          ]);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).equal(0);
        });

        it('generates no signals when an exception is added for a threat match rule', async () => {
          const rule: ThreatMatchCreateSchema = {
            description: 'Detecting root and admin users',
            name: 'Query with a rule id',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threat_match',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: '*:*',
            threat_query: 'source.ip: "188.166.120.93"', // narrow things down with a query to a specific source ip
            threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
            threat_mapping: [
              // We match host.name against host.name
              {
                entries: [
                  {
                    field: 'host.name',
                    value: 'host.name',
                    type: 'mapping',
                  },
                ],
              },
            ],
            threat_filters: [],
          };

          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'source.ip',
                operator: 'included',
                type: 'match',
                value: '188.166.120.93',
              },
            ],
          ]);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).equal(0);
        });
        describe('rules with value list exceptions', () => {
          beforeEach(async () => {
            await createListsIndex(supertest, log);
          });

          afterEach(async () => {
            await deleteListsIndex(supertest, log);
          });

          it('generates no signals when a value list exception is added for a query rule', async () => {
            const valueListId = 'value-list-id';
            await importFile(supertest, log, 'keyword', ['suricata-sensor-amsterdam'], valueListId);
            const rule: QueryCreateSchema = {
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
            };
            const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field: 'host.name',
                  operator: 'included',
                  type: 'list',
                  list: {
                    id: valueListId,
                    type: 'keyword',
                  },
                },
              ],
            ]);
            const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
            expect(signalsOpen.hits.hits.length).equal(0);
          });

          it('generates no signals when a value list exception is added for a threat match rule', async () => {
            const valueListId = 'value-list-id';
            await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
            const rule: ThreatMatchCreateSchema = {
              description: 'Detecting root and admin users',
              name: 'Query with a rule id',
              severity: 'high',
              index: ['auditbeat-*'],
              type: 'threat_match',
              risk_score: 55,
              language: 'kuery',
              rule_id: 'rule-1',
              from: '1900-01-01T00:00:00.000Z',
              query: '*:*',
              threat_query: 'source.ip: "188.166.120.93"', // narrow things down with a query to a specific source ip
              threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
              threat_mapping: [
                // We match host.name against host.name
                {
                  entries: [
                    {
                      field: 'host.name',
                      value: 'host.name',
                      type: 'mapping',
                    },
                  ],
                },
              ],
              threat_filters: [],
            };

            const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field: 'host.name',
                  operator: 'included',
                  type: 'list',
                  list: {
                    id: valueListId,
                    type: 'keyword',
                  },
                },
              ],
            ]);
            const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
            expect(signalsOpen.hits.hits.length).equal(0);
          });

          it('generates no signals when a value list exception is added for a threshold rule', async () => {
            const valueListId = 'value-list-id';
            await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
            const rule: ThresholdCreateSchema = {
              description: 'Detecting root and admin users',
              name: 'Query with a rule id',
              severity: 'high',
              index: ['auditbeat-*'],
              type: 'threshold',
              risk_score: 55,
              language: 'kuery',
              rule_id: 'rule-1',
              from: '1900-01-01T00:00:00.000Z',
              query: 'host.name: "zeek-sensor-amsterdam"',
              threshold: {
                field: 'host.name',
                value: 1,
              },
            };

            const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field: 'host.name',
                  operator: 'included',
                  type: 'list',
                  list: {
                    id: valueListId,
                    type: 'keyword',
                  },
                },
              ],
            ]);
            const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
            expect(signalsOpen.hits.hits.length).equal(0);
          });

          it('generates no signals when a value list exception is added for an EQL rule', async () => {
            const valueListId = 'value-list-id';
            await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
            const rule: EqlCreateSchema = {
              ...getEqlRuleForSignalTesting(['auditbeat-*']),
              query: 'configuration where host.name=="zeek-sensor-amsterdam"',
            };

            const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
              [
                {
                  field: 'host.name',
                  operator: 'included',
                  type: 'list',
                  list: {
                    id: valueListId,
                    type: 'keyword',
                  },
                },
              ],
            ]);
            const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
            expect(signalsOpen.hits.hits.length).equal(0);
          });
        });
      });
    });
  });
};
