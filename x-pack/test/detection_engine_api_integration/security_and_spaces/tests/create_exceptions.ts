/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';
import { SearchResponse } from 'elasticsearch';
import { Signal } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';
import { getCreateExceptionListItemMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_item_schema.mock';
import { deleteAllExceptions } from '../../../lists_api_integration/utils';
import { RulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/response';
import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { getCreateExceptionListMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_schema.mock';
import { CreateExceptionListItemSchema } from '../../../../plugins/lists/common';
import {
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '../../../../plugins/lists/common/constants';

import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_STATUS_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_PREPACKAGED_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  waitFor,
  getQueryAllSignals,
  downgradeImmutableRule,
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

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleWithException)
          .expect(200);

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
        const bodyToCompare = removeServerGeneratedProperties(body);
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

        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(ruleWithException)
          .expect(200);

        // wait for Task Manager to execute the rule and update status
        await waitFor(async () => {
          const { body: statusBody } = await supertest
            .post(DETECTION_ENGINE_RULES_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .send({ ids: [body.id] })
            .expect(200);

          return statusBody[body.id]?.current_status?.status === 'succeeded';
        });

        const { body: statusBody } = await supertest
          .post(DETECTION_ENGINE_RULES_STATUS_URL)
          .set('kbn-xsrf', 'true')
          .send({ ids: [body.id] })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
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
        expect(statusBody[body.id].current_status.status).to.eql('succeeded');
      });

      it('should allow removing an exception list from an immutable rule through patch', async () => {
        // add all the immutable rules from the pre-packaged url
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to use
        const { body: immutableRule } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);
        expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one

        // remove the exceptions list as a user is allowed to remove it from an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306', exceptions_list: [] })
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        expect(body.exceptions_list.length).to.eql(0);
      });

      it('should allow adding a second exception list to an immutable rule through patch', async () => {
        // add all the immutable rules from the pre-packaged url
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Create a new exception list
        const {
          body: { id, list_id, namespace_type, type },
        } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to use
        const { body: immutableRule } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);
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

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        expect(body.exceptions_list.length).to.eql(2);
      });

      it('should override any updates to pre-packaged rules if the user removes the exception list through the API but the new version of a rule has an exception list again', async () => {
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to use
        const { body: immutableRule } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);
        expect(immutableRule.exceptions_list.length).greaterThan(0); // make sure we have at least one exception list

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        // remove the exceptions list as a user is allowed to remove it
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: '9a1a2dae-0b5f-4c3d-8305-a268d404c306', exceptions_list: [] })
          .expect(200);

        // downgrade the version number of the rule
        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');

        // re-add the pre-packaged rule to get the single upgrade to happen
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // get the pre-packaged rule after we upgraded it
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // We should have a length of 1 and it should be the same as our original before we tried to remove it using patch
        expect(body.exceptions_list.length).to.eql(1);
        expect(body.exceptions_list).to.eql(immutableRule.exceptions_list);
      });

      it('should merge back an exceptions_list if it was removed from the immutable rule through PATCH', async () => {
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Create a new exception list
        const {
          body: { id, list_id, namespace_type, type },
        } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const { body: immutableRule } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

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

        // downgrade the version number of the rule
        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');

        // re-add the pre-packaged rule to get the single upgrade to happen
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // get the immutable rule after we installed it a second time
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // The installed rule should have both the original immutable exceptions list back and the
        // new list the user added.
        expect(body.exceptions_list).to.eql([
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
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const { body: immutableRule } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // downgrade the version number of the rule
        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');

        // re-add the pre-packaged rule to get the single upgrade to happen
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // get the immutable rule after we installed it a second time
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // The installed rule should have both the original immutable exceptions list back and the
        // new list the user added.
        expect(body.exceptions_list).to.eql([...immutableRule.exceptions_list]);
      });

      it('should NOT allow updates to pre-packaged rules to overwrite existing exception based rules when the user adds an additional exception list', async () => {
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Create a new exception list
        const {
          body: { id, list_id, namespace_type, type },
        } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // Rule id of "9a1a2dae-0b5f-4c3d-8305-a268d404c306" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/elastic_endpoint.json
        // This rule has an existing exceptions_list that we are going to ensure does not stomp on our existing rule
        const { body: immutableRule } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

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

        // downgrade the version number of the rule
        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');

        // re-add the pre-packaged rule to get the single upgrade to happen
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=9a1a2dae-0b5f-4c3d-8305-a268d404c306`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        // It should be the same as what the user added originally
        expect(body.exceptions_list).to.eql([
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
        // add all the immutable rules from the pre-packaged url
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Create a new exception list
        const {
          body: { id, list_id, namespace_type, type },
        } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // Rule id of "6d3456a5-4a42-49d1-aaf2-7b1fd475b2c6" is from the file:
        // x-pack/plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/c2_reg_beacon.json
        // since this rule does not have existing exceptions_list that we are going to use for tests
        const { body: immutableRule } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=6d3456a5-4a42-49d1-aaf2-7b1fd475b2c6`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);
        expect(immutableRule.exceptions_list.length).eql(0); // make sure we have no exceptions_list

        // add a second exceptions list as a user is allowed to add a second list to an immutable rule
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            rule_id: '6d3456a5-4a42-49d1-aaf2-7b1fd475b2c6',
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

        // downgrade the version number of the rule
        await downgradeImmutableRule(es, '9a1a2dae-0b5f-4c3d-8305-a268d404c306');

        // re-add the pre-packaged rule to get the single upgrade of the rule to happen
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // ensure that the same exception is still on the rule
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=6d3456a5-4a42-49d1-aaf2-7b1fd475b2c6`)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        expect(body.exceptions_list).to.eql([
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
          const {
            body: { id, list_id, namespace_type, type },
          } = await supertest
            .post(EXCEPTION_LIST_URL)
            .set('kbn-xsrf', 'true')
            .send(getCreateExceptionListMinimalSchemaMock())
            .expect(200);

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
          await supertest
            .post(EXCEPTION_LIST_ITEM_URL)
            .set('kbn-xsrf', 'true')
            .send(exceptionListItem)
            .expect(200);

          const ruleWithException: CreateRulesSchema = {
            ...getSimpleRule(),
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

          await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(ruleWithException)
            .expect(200);

          // wait until rules show up and are present
          await waitFor(async () => {
            const {
              body: signalsOpen,
            }: { body: SearchResponse<{ signal: Signal }> } = await supertest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(getQueryAllSignals())
              .expect(200);
            return signalsOpen.hits.hits.length > 0;
          });

          const {
            body: signalsOpen,
          }: { body: SearchResponse<{ signal: Signal }> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAllSignals())
            .expect(200);

          // expect there to be 10
          expect(signalsOpen.hits.hits.length).equal(10);
        });

        it('should be able to execute against an exception list that does include valid entries and get back 0 signals', async () => {
          const {
            body: { id, list_id, namespace_type, type },
          } = await supertest
            .post(EXCEPTION_LIST_URL)
            .set('kbn-xsrf', 'true')
            .send(getCreateExceptionListMinimalSchemaMock())
            .expect(200);

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
          await supertest
            .post(EXCEPTION_LIST_ITEM_URL)
            .set('kbn-xsrf', 'true')
            .send(exceptionListItem)
            .expect(200);

          const ruleWithException: CreateRulesSchema = {
            ...getSimpleRule(),
            from: '1900-01-01T00:00:00.000Z',
            query: 'host.name: "suricata-sensor-amsterdam"', // this matches all the exceptions we should exclude
            exceptions_list: [
              {
                id,
                list_id,
                namespace_type,
                type,
              },
            ],
          };

          const { body: resBody } = await supertest
            .post(DETECTION_ENGINE_RULES_URL)
            .set('kbn-xsrf', 'true')
            .send(ruleWithException)
            .expect(200);

          // wait for Task Manager to finish executing the rule
          await waitFor(async () => {
            const { body } = await supertest
              .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
              .set('kbn-xsrf', 'true')
              .send({ ids: [resBody.id] })
              .expect(200);
            return body[resBody.id]?.current_status?.status === 'succeeded';
          });

          // Get the signals now that we are done running and expect the result to always be zero
          const {
            body: signalsOpen,
          }: { body: SearchResponse<{ signal: Signal }> } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAllSignals())
            .expect(200);

          // expect there to be 10
          expect(signalsOpen.hits.hits.length).equal(0);
        });
      });
    });
  });
};
