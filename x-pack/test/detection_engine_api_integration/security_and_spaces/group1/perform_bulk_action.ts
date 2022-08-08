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
} from '@kbn/security-solution-plugin/common/constants';
import {
  BulkAction,
  BulkActionEditType,
} from '@kbn/security-solution-plugin/common/detection_engine/schemas/common/schemas';
import { RulesSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/response';
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
  createLegacyRuleAction,
  getLegacyActionSO,
  installPrePackagedRules,
  getSimpleMlRule,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
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
      const testRule = getSimpleRule(ruleId);
      await createRule(supertest, log, testRule);

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.delete })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the deleted rule is returned with the response
      expect(body.attributes.results.deleted[0].name).to.eql(testRule.name);

      // Check that the updates have been persisted
      await fetchRule(ruleId).expect(404);
    });

    it('should delete rules and any associated legacy actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule1] = await Promise.all([
        supertest
          .post(`/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            connector_type_id: '.slack',
            secrets: {
              webhookUrl: 'http://localhost:1234',
            },
          }),
        createRule(supertest, log, getSimpleRule(ruleId, false)),
      ]);
      await createLegacyRuleAction(supertest, rule1.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).to.eql(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(rule1.id);

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.delete })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the deleted rule is returned with the response
      expect(body.attributes.results.deleted[0].name).to.eql(rule1.name);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

      // Check that the updates have been persisted
      await fetchRule(ruleId).expect(404);
    });

    it('should enable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId));

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.enable })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).to.eql(true);

      // Check that the updates have been persisted
      const { body: ruleBody } = await fetchRule(ruleId).expect(200);
      expect(ruleBody.enabled).to.eql(true);
    });

    it('should enable rules and migrate actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule1] = await Promise.all([
        supertest
          .post(`/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            connector_type_id: '.slack',
            secrets: {
              webhookUrl: 'http://localhost:1234',
            },
          }),
        createRule(supertest, log, getSimpleRule(ruleId, false)),
      ]);
      await createLegacyRuleAction(supertest, rule1.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).to.eql(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(rule1.id);

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.enable })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).to.eql(true);

      // Check that the updates have been persisted
      const { body: ruleBody } = await fetchRule(ruleId).expect(200);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

      expect(ruleBody.enabled).to.eql(true);
      expect(ruleBody.actions).to.eql([
        {
          action_type_id: '.slack',
          group: 'default',
          id: connector.body.id,
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
        },
      ]);
    });

    it('should disable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId, true));

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.disable })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).to.eql(false);

      // Check that the updates have been persisted
      const { body: ruleBody } = await fetchRule(ruleId).expect(200);
      expect(ruleBody.enabled).to.eql(false);
    });

    it('should disable rules and migrate actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule1] = await Promise.all([
        supertest
          .post(`/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            connector_type_id: '.slack',
            secrets: {
              webhookUrl: 'http://localhost:1234',
            },
          }),
        createRule(supertest, log, getSimpleRule(ruleId, true)),
      ]);
      await createLegacyRuleAction(supertest, rule1.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).to.eql(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(rule1.id);

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.disable })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).to.eql(false);

      // Check that the updates have been persisted
      const { body: ruleBody } = await fetchRule(ruleId).expect(200);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

      expect(ruleBody.enabled).to.eql(false);
      expect(ruleBody.actions).to.eql([
        {
          action_type_id: '.slack',
          group: 'default',
          id: connector.body.id,
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
        },
      ]);
    });

    it('should duplicate rules', async () => {
      const ruleId = 'ruleId';
      const ruleToDuplicate = getSimpleRule(ruleId);
      await createRule(supertest, log, ruleToDuplicate);

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.duplicate })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the duplicated rule is returned with the response
      expect(body.attributes.results.created[0].name).to.eql(`${ruleToDuplicate.name} [Duplicate]`);

      // Check that the updates have been persisted
      const { body: rulesResponse } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(rulesResponse.total).to.eql(2);
    });

    it('should duplicate rule with a legacy action and migrate new rules action', async () => {
      const ruleId = 'ruleId';
      const [connector, ruleToDuplicate] = await Promise.all([
        supertest
          .post(`/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            connector_type_id: '.slack',
            secrets: {
              webhookUrl: 'http://localhost:1234',
            },
          }),
        createRule(supertest, log, getSimpleRule(ruleId, true)),
      ]);
      await createLegacyRuleAction(supertest, ruleToDuplicate.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).to.eql(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(
        ruleToDuplicate.id
      );

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkAction.duplicate })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the duplicated rule is returned with the response
      expect(body.attributes.results.created[0].name).to.eql(`${ruleToDuplicate.name} [Duplicate]`);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

      // Check that the updates have been persisted
      const { body: rulesResponse } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(rulesResponse.total).to.eql(2);

      rulesResponse.data.forEach((rule: RulesSchema) => {
        expect(rule.actions).to.eql([
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
          },
        ]);
      });
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

        expect(setTagsBody.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(setTagsBody.attributes.results.updated[0].tags).to.eql(['reset-tag']);

        // Check that the updates have been persisted
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

        expect(addTagsBody.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(addTagsBody.attributes.results.updated[0].tags).to.eql(['reset-tag', ...tags]);

        // Check that the updates have been persisted
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

      it('should migrate legacy actions on edit', async () => {
        const ruleId = 'ruleId';
        const [connector, ruleToDuplicate] = await Promise.all([
          supertest
            .post(`/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: '.slack',
              secrets: {
                webhookUrl: 'http://localhost:1234',
              },
            }),
          createRule(supertest, log, getSimpleRule(ruleId, true)),
        ]);
        await createLegacyRuleAction(supertest, ruleToDuplicate.id, connector.body.id);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).to.eql(1);
        expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(
          ruleToDuplicate.id
        );

        const { body: setTagsBody } = await postBulkAction().send({
          query: '',
          action: BulkAction.edit,
          [BulkAction.edit]: [
            {
              type: BulkActionEditType.set_tags,
              value: ['reset-tag'],
            },
          ],
        });

        expect(setTagsBody.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

        // Check that the updates have been persisted
        const { body: setTagsRule } = await fetchRule(ruleId).expect(200);

        // Sidecar should be removed
        const sidecarActionsPostResults = await getLegacyActionSO(es);
        expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

        expect(setTagsRule.tags).to.eql(['reset-tag']);

        expect(setTagsRule.actions).to.eql([
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
          },
        ]);
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

        expect(setIndexBody.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(setIndexBody.attributes.results.updated[0].index).to.eql(['initial-index-*']);

        // Check that the updates have been persisted
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

        expect(addIndexBody.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(addIndexBody.attributes.results.updated[0].index).to.eql([
          'initial-index-*',
          ...indices,
        ]);

        // Check that the updates have been persisted
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

      it('should add an index pattern to a rule and overwrite the data view', async () => {
        const ruleId = 'ruleId';
        const dataViewId = 'index1-*';
        const simpleRule = {
          ...getSimpleRule(ruleId),
          index: undefined,
          data_view_id: dataViewId,
        };
        await createRule(supertest, log, simpleRule);

        const { body: setIndexBody } = await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.add_index_patterns,
                value: ['initial-index-*'],
                overwriteDataViews: true,
              },
            ],
          })
          .expect(200);

        expect(setIndexBody.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(setIndexBody.attributes.results.updated[0].index).to.eql(['initial-index-*']);
        expect(setIndexBody.attributes.results.updated[0].data_view_id).to.eql(undefined);

        // Check that the updates have been persisted
        const { body: setIndexRule } = await fetchRule(ruleId).expect(200);

        expect(setIndexRule.index).to.eql(['initial-index-*']);
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

        expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(body.attributes.results.updated[0].timeline_id).to.eql(timelineId);
        expect(body.attributes.results.updated[0].timeline_title).to.eql(timelineTitle);

        // Check that the updates have been persisted
        const { body: rule } = await fetchRule(ruleId).expect(200);

        expect(rule.timeline_id).to.eql(timelineId);
        expect(rule.timeline_title).to.eql(timelineTitle);
      });

      it('should correctly remove timeline', async () => {
        const timelineId = 'test-id';
        const timelineTitle = 'Test timeline template';
        const ruleId = 'ruleId';
        const createdRule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          timeline_id: 'test-id',
          timeline_title: 'Test timeline template',
        });

        // ensure rule has been created with timeline properties
        expect(createdRule.timeline_id).to.be(timelineId);
        expect(createdRule.timeline_title).to.be(timelineTitle);

        const { body } = await postBulkAction()
          .send({
            query: '',
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.set_timeline,
                value: {
                  timeline_id: '',
                  timeline_title: '',
                },
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(body.attributes.results.updated[0].timeline_id).to.be(undefined);
        expect(body.attributes.results.updated[0].timeline_title).to.be(undefined);

        // Check that the updates have been persisted
        const { body: rule } = await fetchRule(ruleId).expect(200);

        expect(rule.timeline_id).to.be(undefined);
        expect(rule.timeline_title).to.be(undefined);
      });

      it('should return error when trying to bulk edit immutable rule', async () => {
        await installPrePackagedRules(supertest, log);
        const { body: findBody } = await supertest
          .get(
            `${DETECTION_ENGINE_RULES_URL}/_find?per_page=1&filter=alert.attributes.params.immutable: true`
          )
          .set('kbn-xsrf', 'true')
          .send();
        const immutableRule = findBody.data[0];

        const { body } = await postBulkAction()
          .send({
            ids: [immutableRule.id],
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.add_tags,
                value: ['new-tag'],
              },
            ],
          })
          .expect(500);

        expect(body.attributes.summary).to.eql({ failed: 1, succeeded: 0, total: 1 });
        expect(body.attributes.errors[0]).to.eql({
          message: "Mutated params invalid: Elastic rule can't be edited",
          status_code: 500,
          rules: [
            {
              id: immutableRule.id,
              name: immutableRule.name,
            },
          ],
        });
      });

      it('should return error if index patterns action is applied to machine learning rule', async () => {
        const mlRule = await createRule(supertest, log, getSimpleMlRule());

        const { body } = await postBulkAction()
          .send({
            ids: [mlRule.id],
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.add_index_patterns,
                value: ['index-*'],
              },
            ],
          })
          .expect(500);

        expect(body.attributes.summary).to.eql({ failed: 1, succeeded: 0, total: 1 });
        expect(body.attributes.errors[0]).to.eql({
          message:
            "Index patterns can't be added. Machine learning rule doesn't have index patterns property",
          status_code: 500,
          rules: [
            {
              id: mlRule.id,
              name: mlRule.name,
            },
          ],
        });
      });

      it('should return error if all index patterns removed from a rule', async () => {
        const rule = await createRule(supertest, log, {
          ...getSimpleRule(),
          index: ['simple-index-*'],
        });

        const { body } = await postBulkAction()
          .send({
            ids: [rule.id],
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.delete_index_patterns,
                value: ['simple-index-*'],
              },
            ],
          })
          .expect(500);

        expect(body.attributes.summary).to.eql({ failed: 1, succeeded: 0, total: 1 });
        expect(body.attributes.errors[0]).to.eql({
          message: "Mutated params invalid: Index patterns can't be empty",
          status_code: 500,
          rules: [
            {
              id: rule.id,
              name: rule.name,
            },
          ],
        });
      });

      it('should increment version on rule bulk edit', async () => {
        const ruleId = 'ruleId';
        const rule = await createRule(supertest, log, getSimpleRule(ruleId));
        const { body } = await postBulkAction()
          .send({
            ids: [rule.id],
            action: BulkAction.edit,
            [BulkAction.edit]: [
              {
                type: BulkActionEditType.add_tags,
                value: ['test'],
              },
            ],
          })
          .expect(200);

        expect(body.attributes.results.updated[0].version).to.be(rule.version + 1);

        // Check that the updates have been persisted
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.version).to.be(rule.version + 1);
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

    it('should bulk update rule by id', async () => {
      const ruleId = 'ruleId';
      const timelineId = '91832785-286d-4ebe-b884-1a208d111a70';
      const timelineTitle = 'Test timeline';
      await createRule(supertest, log, getSimpleRule(ruleId));
      const {
        body: { id },
      } = await fetchRule(ruleId);

      const { body } = await postBulkAction()
        .send({
          ids: [id],
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

      expect(body.attributes.summary).to.eql({ failed: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].timeline_id).to.eql(timelineId);
      expect(body.attributes.results.updated[0].timeline_title).to.eql(timelineTitle);

      // Check that the updates have been persisted
      const { body: rule } = await fetchRule(ruleId).expect(200);

      expect(rule.timeline_id).to.eql(timelineId);
      expect(rule.timeline_title).to.eql(timelineTitle);
    });
  });
};
