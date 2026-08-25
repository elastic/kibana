/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import {
  getCreateExceptionListDetectionSchemaMock,
  getCreateExceptionListMinimalSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { deleteAndReCreateUserRole } from '../../../../../config/services/common';

import { deleteAllExceptions } from '../../../utils';

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const exceptionsApi = getService('exceptionsApi');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  const createList = (overrides: Record<string, unknown> = {}) =>
    supertest
      .post(EXCEPTION_LIST_URL)
      .set('kbn-xsrf', 'true')
      .send({ ...getCreateExceptionListMinimalSchemaMock(), ...overrides })
      .expect(200);

  // The minimal mock creates an `endpoint` list. Rule-reference scenarios need a
  // `detection` list, which is the shared type a user attaches to several rules.
  const createDetectionList = async (listId: string) => {
    const { body } = await supertest
      .post(EXCEPTION_LIST_URL)
      .set('kbn-xsrf', 'true')
      .send({ ...getCreateExceptionListDetectionSchemaMock(), list_id: listId })
      .expect(200);
    return body;
  };

  const createRuleReferencingList = async (
    ruleId: string,
    name: string,
    list: { id: string; list_id: string }
  ) => {
    const { body } = await detectionsApi
      .createRule({
        body: {
          description: 'Rule used to verify exception list reference checks',
          // Disabled so the rule never executes; only its references matter here.
          enabled: false,
          exceptions_list: [
            {
              id: list.id,
              list_id: list.list_id,
              namespace_type: 'single' as const,
              type: ExceptionListTypeEnum.DETECTION,
            },
          ],
          index: ['auditbeat-*'],
          name,
          query: 'host.name: *',
          risk_score: 1,
          rule_id: ruleId,
          severity: 'high',
          type: 'query' as const,
        },
      })
      .expect(200);
    return body;
  };

  const getList = (listId: string) =>
    supertest.get(`${EXCEPTION_LIST_URL}?list_id=${listId}`).set('kbn-xsrf', 'true');

  describe('@ess @serverless @serverlessQA bulk_delete_exception_lists', () => {
    describe('bulk delete exception lists', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('should delete multiple exception lists by id and leave others untouched', async () => {
        const { body: list1 } = await createList({ list_id: 'list-1' });
        const { body: list2 } = await createList({ list_id: 'list-2' });
        await createList({ list_id: 'list-3' });

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list1.id, list2.id] } })
          .expect(200);

        expect(body.success).to.eql(true);
        expect(body.errors).to.eql([]);
        expect(body.results.map((list: { list_id: string }) => list.list_id).sort()).to.eql([
          'list-1',
          'list-2',
        ]);
        expect(body.summary).to.eql({ total: 2, succeeded: 2, failed: 0, skipped: 0 });

        // the third list should still exist
        await supertest
          .get(`${EXCEPTION_LIST_URL}?list_id=list-3`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should deduplicate repeated ids', async () => {
        const { body: list } = await createList({ list_id: 'list-1' });

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id, list.id] } })
          .expect(200);

        expect(body.success).to.eql(true);
        expect(body.errors).to.eql([]);
        expect(body.results).to.have.length(1);
        expect(body.results[0].id).to.eql(list.id);
        expect(body.summary).to.eql({ total: 1, succeeded: 1, failed: 0, skipped: 1 });
      });

      it('should reject an exception list item saved object id without deleting its list or item', async () => {
        const item = { ...getCreateExceptionListItemMinimalSchemaMock(), list_id: 'list-1' };
        await createList({ list_id: 'list-1' });
        const { body: createdItem } = await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(item)
          .expect(200);

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [createdItem.id] } })
          .expect(200);

        expect(body.success).to.eql(false);
        expect(body.results).to.eql([]);
        expect(body.errors).to.eql([
          {
            lists: [{ id: createdItem.id }],
            message: `exception list id: "${createdItem.id}" does not exist`,
            status_code: 404,
          },
        ]);
        await supertest
          .get(`${EXCEPTION_LIST_URL}?list_id=list-1`)
          .set('kbn-xsrf', 'true')
          .expect(200);
        await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${item.item_id}&namespace_type=single`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should report a partial failure when some lists do not exist', async () => {
        const { body: list1 } = await createList({ list_id: 'list-1' });

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({
            body: { action: 'delete', ids: [list1.id, 'does-not-exist'] },
          })
          .expect(200);

        expect(body.success).to.eql(false);
        expect(body.results).to.have.length(1);
        expect(body.results[0].list_id).to.eql('list-1');
        expect(body.errors).to.eql([
          {
            lists: [{ id: 'does-not-exist' }],
            message: 'exception list id: "does-not-exist" does not exist',
            status_code: 404,
          },
        ]);
        expect(body.summary).to.eql({ total: 2, succeeded: 1, failed: 1, skipped: 0 });
      });

      it('should return only errors when none of the lists exist', async () => {
        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({
            body: { action: 'delete', ids: ['does-not-exist-1', 'does-not-exist-2'] },
          })
          .expect(200);

        expect(body.success).to.eql(false);
        expect(body.results).to.eql([]);
        expect(body.errors).to.have.length(2);
        expect(body.summary).to.eql({ total: 2, succeeded: 0, failed: 2, skipped: 0 });
      });

      it('should return a 400 when the request body is empty', async () => {
        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: {} as never })
          .expect(400);

        expect(body.statusCode).to.eql(400);
      });

      it('should return a 400 when ids is empty', async () => {
        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [] } })
          .expect(400);

        expect(body.statusCode).to.eql(400);
      });

      it('should return a 400 for an unsupported action', async () => {
        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'archive', ids: ['list-1'] } as never })
          .expect(400);

        expect(body.statusCode).to.eql(400);
      });

      it('should return a 400 when the batch exceeds the maximum size', async () => {
        const ids = Array.from({ length: 101 }, (_, index) => `id-${index}`);

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids } })
          .expect(400);

        expect(body.statusCode).to.eql(400);
      });

      it('should cascade delete the items belonging to a deleted list', async () => {
        const item = { ...getCreateExceptionListItemMinimalSchemaMock(), list_id: 'list-1' };
        const { body: list } = await createList({ list_id: 'list-1' });
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(item)
          .expect(200);

        await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
          .expect(200);

        const { body } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${item.item_id}&namespace_type=single`)
          .set('kbn-xsrf', 'true')
          .expect(404);

        expect(body.status_code).to.eql(404);
      });

      it('should delete lists in the agnostic namespace', async () => {
        const { body: list } = await createList({ list_id: 'list-1', namespace_type: 'agnostic' });

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({
            body: { action: 'delete', ids: [list.id], namespace_type: 'agnostic' },
          })
          .expect(200);

        expect(body.success).to.eql(true);
        expect(body.errors).to.eql([]);
        expect(body.results).to.have.length(1);
      });

      // These cover the rule-reference safety gate: a list that one or more detection
      // rules point at must not be deleted. The gate is the endpoint's headline safety
      // feature and, before these tests existed, nothing exercised it end to end.
      describe('rule reference checks', () => {
        afterEach(async () => {
          // Rules hold references to the lists, so remove the rules first.
          await deleteAllRules(supertest, log);
        });

        it('should block deletion of a detection list referenced by a rule and leave the list intact', async () => {
          const list = await createDetectionList('referenced-list');
          const rule = await createRuleReferencingList(
            'bulk-delete-ref-rule-1',
            'Rule referencing one list',
            { id: list.id, list_id: list.list_id }
          );

          const { body } = await exceptionsApi
            .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
            .expect(200);

          expect(body.success).to.eql(false);
          expect(body.results).to.eql([]);
          expect(body.errors).to.have.length(1);

          const [error] = body.errors;
          expect(error.status_code).to.eql(409);
          expect(error.lists).to.eql([{ id: list.id, list_id: 'referenced-list' }]);
          expect(error.message).to.contain('linked to 1 rule');
          expect(error.rule_references).to.eql([
            {
              rule_id: 'bulk-delete-ref-rule-1',
              id: rule.id,
              name: 'Rule referencing one list',
            },
          ]);
          expect(body.summary).to.eql({ total: 1, succeeded: 0, failed: 1, skipped: 0 });

          // the list must survive the refused delete
          await getList('referenced-list').expect(200);
        });

        it('should name every referencing rule when more than one rule points at the list', async () => {
          const list = await createDetectionList('multi-referenced-list');
          const ruleA = await createRuleReferencingList('bulk-delete-ref-rule-a', 'Rule A', {
            id: list.id,
            list_id: list.list_id,
          });
          const ruleB = await createRuleReferencingList('bulk-delete-ref-rule-b', 'Rule B', {
            id: list.id,
            list_id: list.list_id,
          });

          const { body } = await exceptionsApi
            .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
            .expect(200);

          expect(body.success).to.eql(false);
          expect(body.errors).to.have.length(1);

          const [error] = body.errors;
          expect(error.status_code).to.eql(409);
          expect(error.message).to.contain('linked to 2 rules');
          expect(
            error.rule_references.map((reference: { id: string }) => reference.id).sort()
          ).to.eql([ruleA.id, ruleB.id].sort());

          await getList('multi-referenced-list').expect(200);
        });

        it('should delete an unreferenced detection list while refusing a referenced one in the same request', async () => {
          const referenced = await createDetectionList('referenced-list');
          const unreferenced = await createDetectionList('unreferenced-list');
          await createRuleReferencingList(
            'bulk-delete-ref-rule-2',
            'Rule referencing one of two lists',
            { id: referenced.id, list_id: referenced.list_id }
          );

          const { body } = await exceptionsApi
            .bulkDeleteExceptionLists({
              body: { action: 'delete', ids: [referenced.id, unreferenced.id] },
            })
            .expect(200);

          expect(body.success).to.eql(false);
          expect(body.results).to.have.length(1);
          expect(body.results[0].list_id).to.eql('unreferenced-list');
          expect(body.errors).to.have.length(1);
          expect(body.errors[0].status_code).to.eql(409);
          expect(body.errors[0].lists).to.eql([{ id: referenced.id, list_id: 'referenced-list' }]);
          expect(body.summary).to.eql({ total: 2, succeeded: 1, failed: 1, skipped: 0 });

          await getList('referenced-list').expect(200);
          await getList('unreferenced-list').expect(404);
        });

        // Guards against a fix that refuses everything: with no rule in the system the
        // reference check must find nothing and the delete must still go through.
        it('should delete a detection list that no rule references', async () => {
          const list = await createDetectionList('unreferenced-list');

          const { body } = await exceptionsApi
            .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
            .expect(200);

          expect(body.success).to.eql(true);
          expect(body.errors).to.eql([]);
          expect(body.results).to.have.length(1);
          expect(body.results[0].list_id).to.eql('unreferenced-list');
          expect(body.summary).to.eql({ total: 1, succeeded: 1, failed: 0, skipped: 0 });

          await getList('unreferenced-list').expect(404);
        });
      });

      describe('@skipInServerless with read rules and all exceptions role', () => {
        const role = ROLES.rules_read_exceptions_all;

        beforeEach(async () => {
          await deleteAndReCreateUserRole(getService, role);
        });

        it('should bulk delete exception lists', async () => {
          const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
          const restrictedApis = exceptionsApi.withUser(restrictedUser);

          const { body: list } = await createList({ list_id: 'list-1' });

          const { body } = await restrictedApis
            .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
            .expect(200);

          expect(body.results).to.have.length(1);
        });
      });

      describe('@skipInServerless with read rules and read exceptions role', () => {
        const role = ROLES.rules_read_exceptions_read;

        beforeEach(async () => {
          await deleteAndReCreateUserRole(getService, role);
        });

        it('should NOT bulk delete exception lists', async () => {
          const restrictedUser = { username: 'rules_read_exceptions_read', password: 'changeme' };
          const restrictedApis = exceptionsApi.withUser(restrictedUser);

          const { body: list } = await createList({ list_id: 'list-1' });

          await restrictedApis
            .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
            .expect(403);
        });
      });
    });
  });
};
