/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '@kbn/security-solution-plugin/common/constants';
import expect from 'expect';
import {
  BulkAction,
  BulkActionEditType,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_management';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleMlRule,
  getSimpleRule,
  installPrePackagedRules,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  const postDryRunBulkAction = () =>
    supertest
      .post(DETECTION_ENGINE_RULES_BULK_ACTION)
      .set('kbn-xsrf', 'true')
      .query({ dry_run: true });

  const fetchRule = (ruleId: string) =>
    supertest.get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`).set('kbn-xsrf', 'true');

  const findRules = () =>
    supertest.get(`${DETECTION_ENGINE_RULES_URL}/_find`).set('kbn-xsrf', 'true');

  describe('perform_bulk_action dry_run', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    it('should not support export action', async () => {
      await createRule(supertest, log, getSimpleRule());

      const { body } = await postDryRunBulkAction().send({ action: BulkAction.export }).expect(400);

      expect(body).toEqual({
        message: "Export action doesn't support dry_run mode",
        status_code: 400,
      });
    });

    it('should handle delete action', async () => {
      const ruleId = 'ruleId';
      const testRule = getSimpleRule(ruleId);
      await createRule(supertest, log, testRule);

      const { body } = await postDryRunBulkAction().send({ action: BulkAction.delete }).expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, succeeded: 1, total: 1 });
      // dry_run mode shouldn't return any rules in results
      expect(body.attributes.results).toEqual({ updated: [], created: [], deleted: [] });

      // Check that rule wasn't deleted
      await fetchRule(ruleId).expect(200);
    });

    it('should handle enable action', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId));

      const { body } = await postDryRunBulkAction().send({ action: BulkAction.enable }).expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, succeeded: 1, total: 1 });
      // dry_run mode shouldn't return any rules in results
      expect(body.attributes.results).toEqual({ updated: [], created: [], deleted: [] });

      // Check that the updates have not been persisted
      const { body: ruleBody } = await fetchRule(ruleId).expect(200);
      expect(ruleBody.enabled).toBe(false);
    });

    it('should handle disable action', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId, true));

      const { body } = await postDryRunBulkAction()
        .send({ action: BulkAction.disable })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, succeeded: 1, total: 1 });
      // dry_run mode shouldn't return any rules in results
      expect(body.attributes.results).toEqual({ updated: [], created: [], deleted: [] });

      // Check that the updates have not been persisted
      const { body: ruleBody } = await fetchRule(ruleId).expect(200);
      expect(ruleBody.enabled).toBe(true);
    });

    it('should handle duplicate action', async () => {
      const ruleId = 'ruleId';
      const ruleToDuplicate = getSimpleRule(ruleId);
      await createRule(supertest, log, ruleToDuplicate);

      const { body } = await postDryRunBulkAction()
        .send({ action: BulkAction.disable })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, succeeded: 1, total: 1 });
      // dry_run mode shouldn't return any rules in results
      expect(body.attributes.results).toEqual({ updated: [], created: [], deleted: [] });

      // Check that the rule wasn't duplicated
      const { body: rulesResponse } = await findRules().expect(200);

      expect(rulesResponse.total).toBe(1);
    });

    describe('edit action', () => {
      it('should handle edit action', async () => {
        const ruleId = 'ruleId';
        const tags = ['tag1', 'tag2'];
        await createRule(supertest, log, { ...getSimpleRule(ruleId), tags });

        const { body } = await postDryRunBulkAction()
          .send({
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.set_tags,
                value: ['reset-tag'],
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({ failed: 0, succeeded: 1, total: 1 });
        // dry_run mode shouldn't return any rules in results
        expect(body.attributes.results).toEqual({ updated: [], created: [], deleted: [] });

        // Check that the updates have not been persisted
        const { body: ruleBody } = await fetchRule(ruleId).expect(200);
        expect(ruleBody.tags).toEqual(tags);
      });

      it('should validate immutable rule edit', async () => {
        await installPrePackagedRules(supertest, log);
        const { body: findBody } = await findRules()
          .query({ per_page: 1, filter: 'alert.attributes.params.immutable: true' })
          .send()
          .expect(200);

        const immutableRule = findBody.data[0];

        const { body } = await postDryRunBulkAction()
          .send({
            ids: [immutableRule.id],
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.set_tags,
                value: ['reset-tag'],
              },
            ],
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({ failed: 1, succeeded: 0, total: 1 });
        expect(body.attributes.results).toEqual({ updated: [], created: [], deleted: [] });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          err_code: 'IMMUTABLE',
          message: "Elastic rule can't be edited",
          status_code: 500,
          rules: [
            {
              id: immutableRule.id,
              name: immutableRule.name,
            },
          ],
        });
      });

      describe('validate updating index pattern for machine learning rule', () => {
        const actions = [
          BulkActionEditType.add_index_patterns,
          BulkActionEditType.set_index_patterns,
          BulkActionEditType.delete_index_patterns,
        ];

        actions.forEach((editAction) => {
          it(`should return error if ${editAction} action is applied to machine learning rule`, async () => {
            const mlRule = await createRule(supertest, log, getSimpleMlRule());

            const { body } = await postDryRunBulkAction()
              .send({
                ids: [mlRule.id],
                action: BulkAction.edit,
                [BulkAction.edit]: [
                  {
                    type: editAction,
                    value: [],
                  },
                ],
              })
              .expect(500);

            expect(body.attributes.summary).toEqual({ failed: 1, succeeded: 0, total: 1 });
            expect(body.attributes.results).toEqual({ updated: [], created: [], deleted: [] });

            expect(body.attributes.errors).toHaveLength(1);
            expect(body.attributes.errors[0]).toEqual({
              err_code: 'MACHINE_LEARNING_INDEX_PATTERN',
              message: "Machine learning rule doesn't have index patterns",
              status_code: 500,
              rules: [
                {
                  id: mlRule.id,
                  name: mlRule.name,
                },
              ],
            });
          });
        });
      });
    });
  });
};
