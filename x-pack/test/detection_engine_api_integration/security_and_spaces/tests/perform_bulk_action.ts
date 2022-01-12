/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../plugins/security_solution/common/constants';
import {
  BulkAction,
  BulkActionEditType,
} from '../../../../plugins/security_solution/common/detection_engine/schemas/common/schemas';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  binaryToString,
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  const postBulkAction = () =>
    supertest.post(DETECTION_ENGINE_RULES_BULK_ACTION).set('kbn-xsrf', 'true');
  const fetchRule = (ruleId: string) =>
    supertest.get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`).set('kbn-xsrf', 'true');

  describe('perform_bulk_action', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    it('should export rules', async () => {
      await createRule(supertest, log, getSimpleRule());

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.export })
        .expect(200)
        .expect('Content-Type', 'application/ndjson')
        .expect('Content-Disposition', 'attachment; filename="rules_export.ndjson"')
        .parse(binaryToString);

      const [ruleJson, exportDetailsJson] = body.toString().split(/\n/);

      const rule = removeServerGeneratedProperties(JSON.parse(ruleJson));
      expect(rule).to.eql(getSimpleRuleOutput());

      const exportDetails = JSON.parse(exportDetailsJson);
      expect(exportDetails).to.eql({
        exported_exception_list_count: 0,
        exported_exception_list_item_count: 0,
        exported_count: 1,
        exported_rules_count: 1,
        missing_exception_list_item_count: 0,
        missing_exception_list_items: [],
        missing_exception_lists: [],
        missing_exception_lists_count: 0,
        missing_rules: [],
        missing_rules_count: 0,
      });
    });

    it('should delete rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId));

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.delete })
        .expect(200);

      expect(body).to.eql({ success: true, rules_count: 1 });

      await await fetchRule(ruleId).expect(404);
    });

    it('should enable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId));

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.enable })
        .expect(200);

      expect(body).to.eql({ success: true, rules_count: 1 });

      const { body: ruleBody } = await fetchRule(ruleId).expect(200);

      const referenceRule = getSimpleRuleOutput(ruleId);
      referenceRule.enabled = true;

      const storedRule = removeServerGeneratedProperties(ruleBody);

      expect(storedRule).to.eql(referenceRule);
    });

    it('should disable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId, true));

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.disable })
        .expect(200);

      expect(body).to.eql({ success: true, rules_count: 1 });

      const { body: ruleBody } = await fetchRule(ruleId).expect(200);

      const referenceRule = getSimpleRuleOutput(ruleId);
      const storedRule = removeServerGeneratedProperties(ruleBody);

      expect(storedRule).to.eql(referenceRule);
    });

    it('should duplicate rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId));

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.duplicate })
        .expect(200);

      expect(body).to.eql({ success: true, rules_count: 1 });

      const { body: rulesResponse } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(rulesResponse.total).to.eql(2);
    });

    describe('edit action', () => {
      it('should set, add and delete tags in rules', async () => {
        const ruleId = 'ruleId';
        const tags = ['tag1', 'tag2'];
        await createRule(supertest, log, getSimpleRule(ruleId));

        const { body: setTagsBody } = await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.set_tags,
                value: ['reset-tag'],
              },
            ],
          })
          .expect(200);

        expect(setTagsBody).to.eql({ success: true, rules_count: 1 });

        const { body: setTagsRule } = await fetchRule(ruleId).expect(200);

        expect(setTagsRule.tags).to.eql(['reset-tag']);

        const { body: addTagsBody } = await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.add_tags,
                value: tags,
              },
            ],
          })
          .expect(200);

        expect(addTagsBody).to.eql({ success: true, rules_count: 1 });

        const { body: addedTagsRule } = await fetchRule(ruleId).expect(200);

        expect(addedTagsRule.tags).to.eql(['reset-tag', ...tags]);

        await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.delete_tags,
                value: ['reset-tag', 'tag1'],
              },
            ],
          })
          .expect(200);

        const { body: deletedTagsRule } = await fetchRule(ruleId).expect(200);

        expect(deletedTagsRule.tags).to.eql(['tag2']);
      });

      it('should set, add and delete index patterns in rules', async () => {
        const ruleId = 'ruleId';
        const indices = ['index1-*', 'index2-*'];
        await createRule(supertest, log, getSimpleRule(ruleId));

        const { body: setIndexBody } = await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.set_index_patterns,
                value: ['initial-index-*'],
              },
            ],
          })
          .expect(200);

        expect(setIndexBody).to.eql({ success: true, rules_count: 1 });

        const { body: setIndexRule } = await fetchRule(ruleId).expect(200);

        expect(setIndexRule.index).to.eql(['initial-index-*']);

        const { body: addIndexBody } = await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.add_index_patterns,
                value: indices,
              },
            ],
          })
          .expect(200);

        expect(addIndexBody).to.eql({ success: true, rules_count: 1 });

        const { body: addIndexRule } = await fetchRule(ruleId).expect(200);

        expect(addIndexRule.index).to.eql(['initial-index-*', ...indices]);

        await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.delete_index_patterns,
                value: ['index1-*'],
              },
            ],
          })
          .expect(200);

        const { body: deleteIndexRule } = await fetchRule(ruleId).expect(200);

        expect(deleteIndexRule.index).to.eql(['initial-index-*', 'index2-*']);
      });

      it('should set timeline values in rule', async () => {
        const ruleId = 'ruleId';
        const timelineId = '91832785-286d-4ebe-b884-1a208d111a70';
        const timelineTitle = 'Test timeline';
        await createRule(supertest, log, getSimpleRule(ruleId));

        const { body } = await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.set_timeline,
                value: {
                  timeline_id: timelineId,
                  timeline_title: timelineTitle,
                },
              },
            ],
          })
          .expect(200);

        expect(body).to.eql({ success: true, rules_count: 1 });

        const { body: rule } = await fetchRule(ruleId).expect(200);

        expect(rule.timeline_id).to.eql(timelineId);
        expect(rule.timeline_title).to.eql(timelineTitle);
      });
    });

    it('should limit concurrent requests to 5', async () => {
      const ruleId = 'ruleId';
      const timelineId = '91832785-286d-4ebe-b884-1a208d111a70';
      const timelineTitle = 'Test timeline';
      await createRule(supertest, log, getSimpleRule(ruleId));

      const responses = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          postBulkAction().send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.set_timeline,
                value: {
                  timeline_id: timelineId,
                  timeline_title: timelineTitle,
                },
              },
            ],
          })
        )
      );

      expect(responses.filter((r) => r.body.statusCode === 429).length).to.eql(5);
    });
  });
};
