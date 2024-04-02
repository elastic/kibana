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
  NOTIFICATION_THROTTLE_RULE,
} from '@kbn/security-solution-plugin/common/constants';
import {
  BulkActionTypeEnum,
  BulkActionEditTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { getCreateExceptionListDetectionSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { WebhookAuthType } from '@kbn/stack-connectors-plugin/common/webhook/constants';
import {
  binaryToString,
  getSimpleMlRule,
  getSimpleRule,
  getSimpleRuleOutput,
  getSlackAction,
  getWebHookAction,
  installMockPrebuiltRules,
  removeServerGeneratedProperties,
  updateUsername,
} from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  // TODO: add a new service for pulling kibana username, similar to getService('es')
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  const postBulkAction = () =>
    supertest
      .post(DETECTION_ENGINE_RULES_BULK_ACTION)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31');

  const fetchRule = (ruleId: string) =>
    supertest
      .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31');

  const fetchPrebuiltRule = async () => {
    const { body: findBody } = await supertest
      .get(
        `${DETECTION_ENGINE_RULES_URL}/_find?per_page=1&filter=alert.attributes.params.immutable: true`
      )
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31');

    return findBody.data[0];
  };

  /**
   * allows to get access to internal property: notifyWhen
   */
  const fetchRuleByAlertApi = (ruleId: string) =>
    supertest.get(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'true');

  const createConnector = async (payload: Record<string, unknown>) =>
    (await supertest.post('/api/actions/action').set('kbn-xsrf', 'true').send(payload).expect(200))
      .body;

  const createWebHookConnector = () => createConnector(getWebHookAction());
  const createSlackConnector = () => createConnector(getSlackAction());

  describe('@ess @serverless @brokenInServerless @skipInQA perform_bulk_action', () => {
    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    it('should export rules', async () => {
      await createRule(supertest, log, getSimpleRule());

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkActionTypeEnum.export })
        .expect(200)
        .expect('Content-Type', 'application/ndjson')
        .expect('Content-Disposition', 'attachment; filename="rules_export.ndjson"')
        .parse(binaryToString);

      const [ruleJson, exportDetailsJson] = body.toString().split(/\n/);

      const rule = removeServerGeneratedProperties(JSON.parse(ruleJson));
      const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);
      expect(rule).to.eql(expectedRule);

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
        excluded_action_connection_count: 0,
        excluded_action_connections: [],
        exported_action_connector_count: 0,
        missing_action_connection_count: 0,
        missing_action_connections: [],
      });
    });
    it('should export rules with actions connectors', async () => {
      // create new actions
      const webHookAction = await createWebHookConnector();

      const defaultRuleAction = {
        id: webHookAction.id,
        action_type_id: '.webhook',
        group: 'default',
        params: {
          body: '{"test":"a default action"}',
        },
      };

      const ruleId = 'rule-1';
      await createRule(supertest, log, {
        ...getSimpleRule(ruleId),
        actions: [defaultRuleAction],
      });
      const exportedConnectors = {
        attributes: {
          actionTypeId: '.webhook',
          config: {
            authType: WebhookAuthType.Basic,
            hasAuth: true,
            method: 'post',
            url: 'http://localhost',
          },
          isMissingSecrets: true,
          name: 'Some connector',
          secrets: {},
        },
        coreMigrationVersion: '8.7.0',
        id: webHookAction.id,
        migrationVersion: {
          action: '8.3.0',
        },
        references: [],
        type: 'action',
      };

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkActionTypeEnum.export })
        .expect(200)
        .expect('Content-Type', 'application/ndjson')
        .expect('Content-Disposition', 'attachment; filename="rules_export.ndjson"')
        .parse(binaryToString);

      const [ruleJson, connectorsJson, exportDetailsJson] = body.toString().split(/\n/);

      const rule = removeServerGeneratedProperties(JSON.parse(ruleJson));
      const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

      expect(rule).to.eql({
        ...expectedRule,
        actions: [
          {
            action_type_id: '.webhook',
            group: 'default',
            id: webHookAction.id,
            params: {
              body: '{"test":"a default action"}',
            },
            uuid: rule.actions[0].uuid,
            frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
          },
        ],
      });
      const { attributes, id, type } = JSON.parse(connectorsJson);
      expect(attributes.actionTypeId).to.eql(exportedConnectors.attributes.actionTypeId);
      expect(id).to.eql(exportedConnectors.id);
      expect(type).to.eql(exportedConnectors.type);
      expect(attributes.name).to.eql(exportedConnectors.attributes.name);
      expect(attributes.secrets).to.eql(exportedConnectors.attributes.secrets);
      expect(attributes.isMissingSecrets).to.eql(exportedConnectors.attributes.isMissingSecrets);
      const exportDetails = JSON.parse(exportDetailsJson);
      expect(exportDetails).to.eql({
        exported_exception_list_count: 0,
        exported_exception_list_item_count: 0,
        exported_count: 2,
        exported_rules_count: 1,
        missing_exception_list_item_count: 0,
        missing_exception_list_items: [],
        missing_exception_lists: [],
        missing_exception_lists_count: 0,
        missing_rules: [],
        missing_rules_count: 0,
        excluded_action_connection_count: 0,
        excluded_action_connections: [],
        exported_action_connector_count: 1,
        missing_action_connection_count: 0,
        missing_action_connections: [],
      });
    });

    it('should delete rules', async () => {
      const ruleId = 'ruleId';
      const testRule = getSimpleRule(ruleId);
      await createRule(supertest, log, testRule);

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkActionTypeEnum.delete })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the deleted rule is returned with the response
      expect(body.attributes.results.deleted[0].name).to.eql(testRule.name);

      // Check that the updates have been persisted
      await fetchRule(ruleId).expect(404);
    });

    it('should enable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId));

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkActionTypeEnum.enable })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).to.eql(true);

      // Check that the updates have been persisted
      const { body: ruleBody } = await fetchRule(ruleId).expect(200);
      expect(ruleBody.enabled).to.eql(true);
    });

    it('should disable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId, true));

      const { body } = await postBulkAction()
        .send({ query: '', action: BulkActionTypeEnum.disable })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).to.eql(false);

      // Check that the updates have been persisted
      const { body: ruleBody } = await fetchRule(ruleId).expect(200);
      expect(ruleBody.enabled).to.eql(false);
    });

    it('should duplicate rules', async () => {
      const ruleId = 'ruleId';
      const ruleToDuplicate = getSimpleRule(ruleId);
      await createRule(supertest, log, ruleToDuplicate);

      const { body } = await postBulkAction()
        .send({
          query: '',
          action: BulkActionTypeEnum.duplicate,
          duplicate: { include_exceptions: false, include_expired_exceptions: false },
        })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the duplicated rule is returned with the response
      expect(body.attributes.results.created[0].name).to.eql(`${ruleToDuplicate.name} [Duplicate]`);

      // Check that the updates have been persisted
      const { body: rulesResponse } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      expect(rulesResponse.total).to.eql(2);
    });

    it('should duplicate rules with exceptions - expired exceptions included', async () => {
      await deleteAllExceptions(supertest, log);

      const expiredDate = new Date(Date.now() - 1000000).toISOString();

      // create an exception list
      const { body: exceptionList } = await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListDetectionSchemaMock())
        .expect(200);
      // create an exception list item
      await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateExceptionListItemMinimalSchemaMock(), expire_time: expiredDate })
        .expect(200);

      const ruleId = 'ruleId';
      const ruleToDuplicate = {
        ...getSimpleRule(ruleId),
        exceptions_list: [
          {
            type: exceptionList.type,
            list_id: exceptionList.list_id,
            id: exceptionList.id,
            namespace_type: exceptionList.namespace_type,
          },
        ],
      };
      const newRule = await createRule(supertest, log, ruleToDuplicate);

      // add an exception item to the rule
      await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/${newRule.id}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({
          items: [
            {
              description: 'Exception item for rule default exception list',
              entries: [
                {
                  field: 'some.not.nested.field',
                  operator: 'included',
                  type: 'match',
                  value: 'some value',
                },
              ],
              name: 'Sample exception item',
              type: 'simple',
              expire_time: expiredDate,
            },
          ],
        })
        .expect(200);

      const { body } = await postBulkAction()
        .send({
          query: '',
          action: BulkActionTypeEnum.duplicate,
          duplicate: { include_exceptions: true, include_expired_exceptions: true },
        })
        .expect(200);

      const { body: foundItems } = await supertest
        .get(
          `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${body.attributes.results.created[0].exceptions_list[1].list_id}`
        )
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      // Item should have been duplicated, even if expired
      expect(foundItems.total).to.eql(1);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the duplicated rule is returned with the response
      expect(body.attributes.results.created[0].name).to.eql(`${ruleToDuplicate.name} [Duplicate]`);

      // Check that the exceptions are duplicated
      expect(body.attributes.results.created[0].exceptions_list).to.eql([
        {
          type: exceptionList.type,
          list_id: exceptionList.list_id,
          id: exceptionList.id,
          namespace_type: exceptionList.namespace_type,
        },
        {
          id: body.attributes.results.created[0].exceptions_list[1].id,
          list_id: body.attributes.results.created[0].exceptions_list[1].list_id,
          namespace_type: 'single',
          type: 'rule_default',
        },
      ]);

      // Check that the updates have been persisted
      const { body: rulesResponse } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      expect(rulesResponse.total).to.eql(2);
    });

    it('should duplicate rules with exceptions - expired exceptions excluded', async () => {
      await deleteAllExceptions(supertest, log);

      const expiredDate = new Date(Date.now() - 1000000).toISOString();

      // create an exception list
      const { body: exceptionList } = await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListDetectionSchemaMock())
        .expect(200);
      // create an exception list item
      await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...getCreateExceptionListItemMinimalSchemaMock(), expire_time: expiredDate })
        .expect(200);

      const ruleId = 'ruleId';
      const ruleToDuplicate = {
        ...getSimpleRule(ruleId),
        exceptions_list: [
          {
            type: exceptionList.type,
            list_id: exceptionList.list_id,
            id: exceptionList.id,
            namespace_type: exceptionList.namespace_type,
          },
        ],
      };
      const newRule = await createRule(supertest, log, ruleToDuplicate);

      // add an exception item to the rule
      await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/${newRule.id}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({
          items: [
            {
              description: 'Exception item for rule default exception list',
              entries: [
                {
                  field: 'some.not.nested.field',
                  operator: 'included',
                  type: 'match',
                  value: 'some value',
                },
              ],
              name: 'Sample exception item',
              type: 'simple',
              expire_time: expiredDate,
            },
          ],
        })
        .expect(200);

      const { body } = await postBulkAction()
        .send({
          query: '',
          action: BulkActionTypeEnum.duplicate,
          duplicate: { include_exceptions: true, include_expired_exceptions: false },
        })
        .expect(200);

      const { body: foundItems } = await supertest
        .get(
          `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${body.attributes.results.created[0].exceptions_list[1].list_id}`
        )
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      // Item should NOT have been duplicated, since it is expired
      expect(foundItems.total).to.eql(0);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the duplicated rule is returned with the response
      expect(body.attributes.results.created[0].name).to.eql(`${ruleToDuplicate.name} [Duplicate]`);

      // Check that the exceptions are duplicted
      expect(body.attributes.results.created[0].exceptions_list).to.eql([
        {
          type: exceptionList.type,
          list_id: exceptionList.list_id,
          id: exceptionList.id,
          namespace_type: exceptionList.namespace_type,
        },
        {
          id: body.attributes.results.created[0].exceptions_list[1].id,
          list_id: body.attributes.results.created[0].exceptions_list[1].list_id,
          namespace_type: 'single',
          type: 'rule_default',
        },
      ]);

      // Check that the updates have been persisted
      const { body: rulesResponse } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('elastic-api-version', '2023-10-31')
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(rulesResponse.total).to.eql(2);
    });

    describe('edit action', () => {
      describe('tags actions', () => {
        const overwriteTagsCases = [
          {
            caseName: '3 existing tags overwritten with 2 of them = 2 existing tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToOverwrite: ['tag1', 'tag2'],
            resultingTags: ['tag1', 'tag2'],
          },
          {
            caseName: '3 existing tags overwritten with 2 other tags = 2 other tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToOverwrite: ['new-tag1', 'new-tag2'],
            resultingTags: ['new-tag1', 'new-tag2'],
          },
          {
            caseName:
              '3 existing tags overwritten with 1 of them + 2 other tags = 1 existing tag + 2 other tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToOverwrite: ['tag1', 'new-tag1', 'new-tag2'],
            resultingTags: ['tag1', 'new-tag1', 'new-tag2'],
          },
          {
            caseName: '0 existing tags overwritten with 2 tags = 2 tags',
            existingTags: [],
            tagsToOverwrite: ['new-tag1', 'new-tag2'],
            resultingTags: ['new-tag1', 'new-tag2'],
          },
          {
            caseName: '3 existing tags overwritten with 0 tags = 0 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToOverwrite: [],
            resultingTags: [],
          },
        ];

        overwriteTagsCases.forEach(({ caseName, existingTags, tagsToOverwrite, resultingTags }) => {
          it(`should set tags in rules, case: "${caseName}"`, async () => {
            const ruleId = 'ruleId';

            await createRule(supertest, log, { ...getSimpleRule(ruleId), tags: existingTags });

            const { body: bulkEditResponse } = await postBulkAction()
              .send({
                query: '',
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.set_tags,
                    value: tagsToOverwrite,
                  },
                ],
              })
              .expect(200);

            expect(bulkEditResponse.attributes.summary).to.eql({
              failed: 0,
              skipped: 0,
              succeeded: 1,
              total: 1,
            });

            // Check that the updated rule is returned with the response
            expect(bulkEditResponse.attributes.results.updated[0].tags).to.eql(resultingTags);

            // Check that the updates have been persisted
            const { body: updatedRule } = await fetchRule(ruleId).expect(200);

            expect(updatedRule.tags).to.eql(resultingTags);
          });
        });

        const deleteTagsCases = [
          {
            caseName: '3 existing tags - 2 of them = 1 tag',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToDelete: ['tag1', 'tag2'],
            resultingTags: ['tag3'],
          },
          {
            caseName: '3 existing tags - 1 of them - 2 other tags(none of them) = 2 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToDelete: ['tag3', 'tag4', 'tag5'],
            resultingTags: ['tag1', 'tag2'],
          },
          {
            caseName: '3 existing tags - 3 of them = 0 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToDelete: ['tag1', 'tag2', 'tag3'],
            resultingTags: [],
          },
        ];

        deleteTagsCases.forEach(({ caseName, existingTags, tagsToDelete, resultingTags }) => {
          it(`should delete tags in rules, case: "${caseName}"`, async () => {
            const ruleId = 'ruleId';

            await createRule(supertest, log, { ...getSimpleRule(ruleId), tags: existingTags });

            const { body: bulkEditResponse } = await postBulkAction()
              .send({
                query: '',
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.delete_tags,
                    value: tagsToDelete,
                  },
                ],
              })
              .expect(200);

            expect(bulkEditResponse.attributes.summary).to.eql({
              failed: 0,
              skipped: 0,
              succeeded: 1,
              total: 1,
            });

            // Check that the updated rule is returned with the response
            expect(bulkEditResponse.attributes.results.updated[0].tags).to.eql(resultingTags);

            // Check that the updates have been persisted
            const { body: updatedRule } = await fetchRule(ruleId).expect(200);

            expect(updatedRule.tags).to.eql(resultingTags);
          });
        });

        const addTagsCases = [
          {
            caseName: '3 existing tags + 2 other tags(none of them) = 5 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            addedTags: ['tag4', 'tag5'],
            resultingTags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
          },
          {
            caseName: '3 existing tags + 1 of them + 2 other tags(none of them) = 5 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            addedTags: ['tag4', 'tag5', 'tag1'],
            resultingTags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
          },
          {
            caseName: '0 existing tags + 2 tags = 2 tags',
            existingTags: [],
            addedTags: ['tag4', 'tag5'],
            resultingTags: ['tag4', 'tag5'],
          },
        ];

        addTagsCases.forEach(({ caseName, existingTags, addedTags, resultingTags }) => {
          it(`should add tags to rules, case: "${caseName}"`, async () => {
            const ruleId = 'ruleId';
            await createRule(supertest, log, { ...getSimpleRule(ruleId), tags: existingTags });

            const { body: bulkEditResponse } = await postBulkAction()
              .send({
                query: '',
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.add_tags,
                    value: addedTags,
                  },
                ],
              })
              .expect(200);

            expect(bulkEditResponse.attributes.summary).to.eql({
              failed: 0,
              skipped: 0,
              succeeded: 1,
              total: 1,
            });

            // Check that the updated rule is returned with the response
            expect(bulkEditResponse.attributes.results.updated[0].tags).to.eql(resultingTags);

            // Check that the updates have been persisted
            const { body: updatedRule } = await fetchRule(ruleId).expect(200);

            expect(updatedRule.tags).to.eql(resultingTags);
          });
        });

        const skipTagsUpdateCases = [
          // Delete no-ops
          {
            caseName: '3 existing tags - 0 tags = 3 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToUpdate: [],
            resultingTags: ['tag1', 'tag2', 'tag3'],
            operation: BulkActionEditTypeEnum.delete_tags,
          },
          {
            caseName: '0 existing tags - 2 tags = 0 tags',
            existingTags: [],
            tagsToUpdate: ['tag4', 'tag5'],
            resultingTags: [],
            operation: BulkActionEditTypeEnum.delete_tags,
          },
          {
            caseName: '3 existing tags - 2 other tags (none of them) = 3 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToUpdate: ['tag4', 'tag5'],
            resultingTags: ['tag1', 'tag2', 'tag3'],
            operation: BulkActionEditTypeEnum.delete_tags,
          },
          // Add no-ops
          {
            caseName: '3 existing tags + 2 of them = 3 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToUpdate: ['tag1', 'tag2'],
            resultingTags: ['tag1', 'tag2', 'tag3'],
            operation: BulkActionEditTypeEnum.add_tags,
          },
          {
            caseName: '3 existing tags + 0 tags = 3 tags',
            existingTags: ['tag1', 'tag2', 'tag3'],
            tagsToUpdate: [],
            resultingTags: ['tag1', 'tag2', 'tag3'],
            operation: BulkActionEditTypeEnum.add_tags,
          },
        ];

        skipTagsUpdateCases.forEach(
          ({ caseName, existingTags, tagsToUpdate, resultingTags, operation }) => {
            it(`should skip rule updated for tags, case: "${caseName}"`, async () => {
              const ruleId = 'ruleId';

              await createRule(supertest, log, { ...getSimpleRule(ruleId), tags: existingTags });

              const { body: bulkEditResponse } = await postBulkAction()
                .send({
                  query: '',
                  action: BulkActionTypeEnum.edit,
                  [BulkActionTypeEnum.edit]: [
                    {
                      type: operation,
                      value: tagsToUpdate,
                    },
                  ],
                })
                .expect(200);

              expect(bulkEditResponse.attributes.summary).to.eql({
                failed: 0,
                skipped: 1,
                succeeded: 0,
                total: 1,
              });

              // Check that the rules is returned as skipped with expected skip reason
              expect(bulkEditResponse.attributes.results.skipped[0].skip_reason).to.eql(
                'RULE_NOT_MODIFIED'
              );

              // Check that the no changes have been persisted
              const { body: updatedRule } = await fetchRule(ruleId).expect(200);

              expect(updatedRule.tags).to.eql(resultingTags);
            });
          }
        );
      });

      describe('index patterns actions', () => {
        it('should set index patterns in rules', async () => {
          const ruleId = 'ruleId';
          await createRule(supertest, log, getSimpleRule(ruleId));

          const { body: bulkEditResponse } = await postBulkAction()
            .send({
              query: '',
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_index_patterns,
                  value: ['initial-index-*'],
                },
              ],
            })
            .expect(200);

          expect(bulkEditResponse.attributes.summary).to.eql({
            failed: 0,
            skipped: 0,
            succeeded: 1,
            total: 1,
          });

          // Check that the updated rule is returned with the response
          expect(bulkEditResponse.attributes.results.updated[0].index).to.eql(['initial-index-*']);

          // Check that the updates have been persisted
          const { body: updatedRule } = await fetchRule(ruleId).expect(200);

          expect(updatedRule.index).to.eql(['initial-index-*']);
        });

        it('should add index patterns to rules', async () => {
          const ruleId = 'ruleId';
          const indexPatterns = ['index1-*', 'index2-*'];
          const resultingIndexPatterns = ['index1-*', 'index2-*', 'index3-*'];
          await createRule(supertest, log, { ...getSimpleRule(ruleId), index: indexPatterns });

          const { body: bulkEditResponse } = await postBulkAction()
            .send({
              query: '',
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.add_index_patterns,
                  value: ['index3-*'],
                },
              ],
            })
            .expect(200);

          expect(bulkEditResponse.attributes.summary).to.eql({
            failed: 0,
            skipped: 0,
            succeeded: 1,
            total: 1,
          });

          // Check that the updated rule is returned with the response
          expect(bulkEditResponse.attributes.results.updated[0].index).to.eql(
            resultingIndexPatterns
          );

          // Check that the updates have been persisted
          const { body: updatedRule } = await fetchRule(ruleId).expect(200);

          expect(updatedRule.index).to.eql(resultingIndexPatterns);
        });

        it('should delete index patterns from rules', async () => {
          const ruleId = 'ruleId';
          const indexPatterns = ['index1-*', 'index2-*'];
          const resultingIndexPatterns = ['index1-*'];
          await createRule(supertest, log, { ...getSimpleRule(ruleId), index: indexPatterns });

          const { body: bulkEditResponse } = await postBulkAction()
            .send({
              query: '',
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.delete_index_patterns,
                  value: ['index2-*'],
                },
              ],
            })
            .expect(200);

          expect(bulkEditResponse.attributes.summary).to.eql({
            failed: 0,
            skipped: 0,
            succeeded: 1,
            total: 1,
          });

          // Check that the updated rule is returned with the response
          expect(bulkEditResponse.attributes.results.updated[0].index).to.eql(
            resultingIndexPatterns
          );

          // Check that the updates have been persisted
          const { body: updatedRule } = await fetchRule(ruleId).expect(200);

          expect(updatedRule.index).to.eql(resultingIndexPatterns);
        });

        it('should return error if index patterns action is applied to machine learning rule', async () => {
          const mlRule = await createRule(supertest, log, getSimpleMlRule());

          const { body } = await postBulkAction()
            .send({
              ids: [mlRule.id],
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.add_index_patterns,
                  value: ['index-*'],
                },
              ],
            })
            .expect(500);

          expect(body.attributes.summary).to.eql({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
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
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.delete_index_patterns,
                  value: ['simple-index-*'],
                },
              ],
            })
            .expect(500);

          expect(body.attributes.summary).to.eql({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
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

        it('should return error if index patterns set to empty list', async () => {
          const ruleId = 'ruleId';
          const rule = await createRule(supertest, log, {
            ...getSimpleRule(ruleId),
            index: ['simple-index-*'],
          });

          const { body } = await postBulkAction()
            .send({
              ids: [rule.id],
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_index_patterns,
                  value: [],
                },
              ],
            })
            .expect(500);

          expect(body.attributes.summary).to.eql({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
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

          // Check that the rule hasn't been updated
          const { body: reFetchedRule } = await fetchRule(ruleId).expect(200);

          expect(reFetchedRule.index).to.eql(['simple-index-*']);
        });

        const skipIndexPatternsUpdateCases = [
          // Delete no-ops
          {
            caseName: '3 existing indeces - 0 indeces = 3 indeces',
            existingIndexPatterns: ['index1-*', 'index2-*', 'index3-*'],
            indexPatternsToUpdate: [],
            resultingIndexPatterns: ['index1-*', 'index2-*', 'index3-*'],
            operation: BulkActionEditTypeEnum.delete_index_patterns,
          },
          {
            caseName: '0 existing indeces - 2 indeces = 0 indeces',
            existingIndexPatterns: [],
            indexPatternsToUpdate: ['index1-*', 'index2-*'],
            resultingIndexPatterns: [],
            operation: BulkActionEditTypeEnum.delete_index_patterns,
          },
          {
            caseName: '3 existing indeces - 2 other indeces (none of them) = 3 indeces',
            existingIndexPatterns: ['index1-*', 'index2-*', 'index3-*'],
            indexPatternsToUpdate: ['index8-*', 'index9-*'],
            resultingIndexPatterns: ['index1-*', 'index2-*', 'index3-*'],
            operation: BulkActionEditTypeEnum.delete_index_patterns,
          },
          // Add no-ops
          {
            caseName: '3 existing indeces + 2 exisiting indeces= 3 indeces',
            existingIndexPatterns: ['index1-*', 'index2-*', 'index3-*'],
            indexPatternsToUpdate: ['index1-*', 'index2-*'],
            resultingIndexPatterns: ['index1-*', 'index2-*', 'index3-*'],
            operation: BulkActionEditTypeEnum.add_index_patterns,
          },
          {
            caseName: '3 existing indeces + 0 indeces = 3 indeces',
            existingIndexPatterns: ['index1-*', 'index2-*', 'index3-*'],
            indexPatternsToUpdate: [],
            resultingIndexPatterns: ['index1-*', 'index2-*', 'index3-*'],
            operation: BulkActionEditTypeEnum.add_index_patterns,
          },
        ];

        skipIndexPatternsUpdateCases.forEach(
          ({
            caseName,
            existingIndexPatterns,
            indexPatternsToUpdate,
            resultingIndexPatterns,
            operation,
          }) => {
            it(`should skip rule updated for tags, case: "${caseName}"`, async () => {
              const ruleId = 'ruleId';

              await createRule(supertest, log, {
                ...getSimpleRule(ruleId),
                index: existingIndexPatterns,
              });

              const { body: bulkEditResponse } = await postBulkAction()
                .send({
                  query: '',
                  action: BulkActionTypeEnum.edit,
                  [BulkActionTypeEnum.edit]: [
                    {
                      type: operation,
                      value: indexPatternsToUpdate,
                    },
                  ],
                })
                .expect(200);

              expect(bulkEditResponse.attributes.summary).to.eql({
                failed: 0,
                skipped: 1,
                succeeded: 0,
                total: 1,
              });

              // Check that the rules is returned as skipped with expected skip reason
              expect(bulkEditResponse.attributes.results.skipped[0].skip_reason).to.eql(
                'RULE_NOT_MODIFIED'
              );

              // Check that the no changes have been persisted
              const { body: updatedRule } = await fetchRule(ruleId).expect(200);

              expect(updatedRule.index).to.eql(resultingIndexPatterns);
            });
          }
        );
      });

      it('should set timeline template values in rule', async () => {
        const ruleId = 'ruleId';
        const timelineId = '91832785-286d-4ebe-b884-1a208d111a70';
        const timelineTitle = 'Test timeline';
        await createRule(supertest, log, getSimpleRule(ruleId));

        const { body } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_timeline,
                value: {
                  timeline_id: timelineId,
                  timeline_title: timelineTitle,
                },
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(body.attributes.results.updated[0].timeline_id).to.eql(timelineId);
        expect(body.attributes.results.updated[0].timeline_title).to.eql(timelineTitle);

        // Check that the updates have been persisted
        const { body: rule } = await fetchRule(ruleId).expect(200);

        expect(rule.timeline_id).to.eql(timelineId);
        expect(rule.timeline_title).to.eql(timelineTitle);
      });

      it('should correctly remove timeline template', async () => {
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
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_timeline,
                value: {
                  timeline_id: '',
                  timeline_title: '',
                },
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(body.attributes.results.updated[0].timeline_id).to.be(undefined);
        expect(body.attributes.results.updated[0].timeline_title).to.be(undefined);

        // Check that the updates have been persisted
        const { body: rule } = await fetchRule(ruleId).expect(200);

        expect(rule.timeline_id).to.be(undefined);
        expect(rule.timeline_title).to.be(undefined);
      });

      it('should return error if index patterns action is applied to machine learning rule', async () => {
        const mlRule = await createRule(supertest, log, getSimpleMlRule());

        const { body } = await postBulkAction()
          .send({
            ids: [mlRule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_index_patterns,
                value: ['index-*'],
              },
            ],
          })
          .expect(500);

        expect(body.attributes.summary).to.eql({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
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
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.delete_index_patterns,
                value: ['simple-index-*'],
              },
            ],
          })
          .expect(500);

        expect(body.attributes.summary).to.eql({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
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
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_tags,
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

      describe('prebuilt rules', () => {
        const cases = [
          {
            type: BulkActionEditTypeEnum.add_tags,
            value: ['new-tag'],
          },
          {
            type: BulkActionEditTypeEnum.set_tags,
            value: ['new-tag'],
          },
          {
            type: BulkActionEditTypeEnum.delete_tags,
            value: ['new-tag'],
          },
          {
            type: BulkActionEditTypeEnum.add_index_patterns,
            value: ['test-*'],
          },
          {
            type: BulkActionEditTypeEnum.set_index_patterns,
            value: ['test-*'],
          },
          {
            type: BulkActionEditTypeEnum.delete_index_patterns,
            value: ['test-*'],
          },
          {
            type: BulkActionEditTypeEnum.set_timeline,
            value: { timeline_id: 'mock-id', timeline_title: 'mock-title' },
          },
          {
            type: BulkActionEditTypeEnum.set_schedule,
            value: { interval: '1m', lookback: '1m' },
          },
        ];
        cases.forEach(({ type, value }) => {
          it(`should return error when trying to apply "${type}" edit action to prebuilt rule`, async () => {
            await installMockPrebuiltRules(supertest, es);
            const prebuiltRule = await fetchPrebuiltRule();

            const { body } = await postBulkAction()
              .send({
                ids: [prebuiltRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type,
                    value,
                  },
                ],
              })
              .expect(500);

            expect(body.attributes.summary).to.eql({
              failed: 1,
              skipped: 0,
              succeeded: 0,
              total: 1,
            });
            expect(body.attributes.errors[0]).to.eql({
              message: "Elastic rule can't be edited",
              status_code: 500,
              rules: [
                {
                  id: prebuiltRule.id,
                  name: prebuiltRule.name,
                },
              ],
            });
          });
        });
      });

      describe('rule actions', () => {
        const webHookActionMock = {
          group: 'default',
          params: {
            body: '{"test":"action to be saved in a rule"}',
          },
        };

        describe('set_rule_actions', () => {
          it('should set action correctly to existing empty actions list', async () => {
            const ruleId = 'ruleId';
            const createdRule = await createRule(supertest, log, getSimpleRule(ruleId));

            // create a new connector
            const webHookConnector = await createWebHookConnector();

            const { body } = await postBulkAction()
              .send({
                ids: [createdRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.set_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [
                        {
                          ...webHookActionMock,
                          id: webHookConnector.id,
                        },
                      ],
                    },
                  },
                ],
              })
              .expect(200);

            const expectedRuleActions = [
              {
                ...webHookActionMock,
                id: webHookConnector.id,
                action_type_id: '.webhook',
                uuid: body.attributes.results.updated[0].actions[0].uuid,
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ];

            // Check that the updated rule is returned with the response
            expect(body.attributes.results.updated[0].actions).to.eql(expectedRuleActions);

            // Check that the updates have been persisted
            const { body: readRule } = await fetchRule(ruleId).expect(200);

            expect(readRule.actions).to.eql(expectedRuleActions);
          });

          it('should set action correctly to existing non empty actions list', async () => {
            const webHookConnector = await createWebHookConnector();

            const existingRuleAction = {
              id: webHookConnector.id,
              action_type_id: '.webhook',
              group: 'default',
              params: {
                body: '{"test":"an existing action"}',
              },
            };

            const ruleId = 'ruleId';
            const createdRule = await createRule(supertest, log, {
              ...getSimpleRule(ruleId),
              actions: [existingRuleAction],
            });

            const { body } = await postBulkAction()
              .send({
                ids: [createdRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.set_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [
                        {
                          ...webHookActionMock,
                          id: webHookConnector.id,
                        },
                      ],
                    },
                  },
                ],
              })
              .expect(200);

            const expectedRuleActions = [
              {
                ...webHookActionMock,
                id: webHookConnector.id,
                action_type_id: '.webhook',
                uuid: body.attributes.results.updated[0].actions[0].uuid,
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ];

            // Check that the updated rule is returned with the response
            expect(body.attributes.results.updated[0].actions).to.eql(expectedRuleActions);

            // Check that the updates have been persisted
            const { body: readRule } = await fetchRule(ruleId).expect(200);

            expect(readRule.actions).to.eql(expectedRuleActions);
          });

          it('should set actions to empty list, actions payload is empty list', async () => {
            // create a new connector
            const webHookConnector = await createWebHookConnector();

            const defaultRuleAction = {
              id: webHookConnector.id,
              action_type_id: '.webhook',
              group: 'default',
              params: {
                body: '{"test":"a default action"}',
              },
            };

            const ruleId = 'ruleId';
            const createdRule = await createRule(supertest, log, {
              ...getSimpleRule(ruleId),
              actions: [defaultRuleAction],
              throttle: '1d',
            });

            const { body } = await postBulkAction()
              .send({
                ids: [createdRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.set_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [],
                    },
                  },
                ],
              })
              .expect(200);

            // Check that the updated rule is returned with the response
            expect(body.attributes.results.updated[0].actions).to.eql([]);

            // Check that the updates have been persisted
            const { body: readRule } = await fetchRule(ruleId).expect(200);

            expect(readRule.actions).to.eql([]);
          });
        });

        describe('add_rule_actions', () => {
          it('should add action correctly to empty actions list', async () => {
            const ruleId = 'ruleId';
            const createdRule = await createRule(supertest, log, getSimpleRule(ruleId));

            // create a new connector
            const webHookConnector = await createWebHookConnector();

            const { body } = await postBulkAction()
              .send({
                ids: [createdRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.add_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [
                        {
                          ...webHookActionMock,
                          id: webHookConnector.id,
                        },
                      ],
                    },
                  },
                ],
              })
              .expect(200);

            const expectedRuleActions = [
              {
                ...webHookActionMock,
                id: webHookConnector.id,
                action_type_id: '.webhook',
                uuid: body.attributes.results.updated[0].actions[0].uuid,
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ];

            // Check that the updated rule is returned with the response
            expect(body.attributes.results.updated[0].actions).to.eql(expectedRuleActions);

            // Check that the updates have been persisted
            const { body: readRule } = await fetchRule(ruleId).expect(200);

            expect(readRule.actions).to.eql(expectedRuleActions);
          });

          it('should add action correctly to non empty actions list of the same type', async () => {
            // create a new connector
            const webHookConnector = await createWebHookConnector();

            const defaultRuleAction = {
              id: webHookConnector.id,
              action_type_id: '.webhook',
              group: 'default',
              params: {
                body: '{"test":"a default action"}',
              },
            };

            const ruleId = 'ruleId';
            const createdRule = await createRule(supertest, log, {
              ...getSimpleRule(ruleId),
              actions: [defaultRuleAction],
              throttle: '1d',
            });

            const { body } = await postBulkAction()
              .send({
                ids: [createdRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.add_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [
                        {
                          ...webHookActionMock,
                          id: webHookConnector.id,
                        },
                      ],
                    },
                  },
                ],
              })
              .expect(200);

            const expectedRuleActions = [
              {
                ...defaultRuleAction,
                uuid: body.attributes.results.updated[0].actions[0].uuid,
                frequency: { summary: true, throttle: '1d', notifyWhen: 'onThrottleInterval' },
              },
              {
                ...webHookActionMock,
                id: webHookConnector.id,
                action_type_id: '.webhook',
                uuid: body.attributes.results.updated[0].actions[1].uuid,
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ];

            // Check that the updated rule is returned with the response
            expect(body.attributes.results.updated[0].actions).to.eql(expectedRuleActions);

            // Check that the updates have been persisted
            const { body: readRule } = await fetchRule(ruleId).expect(200);

            expect(readRule.actions).to.eql(expectedRuleActions);
          });

          it('should add action correctly to non empty actions list of a different type', async () => {
            // create new actions
            const webHookAction = await createWebHookConnector();
            const slackConnector = await createSlackConnector();

            const defaultRuleAction = {
              id: webHookAction.id,
              action_type_id: '.webhook',
              group: 'default',
              params: {
                body: '{"test":"a default action"}',
              },
            };

            const slackConnectorMockProps = {
              group: 'default',
              params: {
                message: 'test slack message',
              },
            };

            const ruleId = 'ruleId';
            const createdRule = await createRule(supertest, log, {
              ...getSimpleRule(ruleId),
              actions: [defaultRuleAction],
              throttle: '1d',
            });

            const { body } = await postBulkAction()
              .send({
                ids: [createdRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.add_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [
                        {
                          ...slackConnectorMockProps,
                          id: slackConnector.id,
                        },
                      ],
                    },
                  },
                ],
              })
              .expect(200);

            const expectedRuleActions = [
              {
                ...defaultRuleAction,
                uuid: body.attributes.results.updated[0].actions[0].uuid,
                frequency: { summary: true, throttle: '1d', notifyWhen: 'onThrottleInterval' },
              },
              {
                ...slackConnectorMockProps,
                id: slackConnector.id,
                action_type_id: '.slack',
                uuid: body.attributes.results.updated[0].actions[1].uuid,
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ];

            // Check that the updated rule is returned with the response
            expect(body.attributes.results.updated[0].actions).to.eql(expectedRuleActions);

            // Check that the updates have been persisted
            const { body: readRule } = await fetchRule(ruleId).expect(200);

            expect(readRule.actions).to.eql(expectedRuleActions);
          });

          it('should not change actions of rule if empty list of actions added', async () => {
            // create a new connector
            const webHookConnector = await createWebHookConnector();

            const defaultRuleAction = {
              id: webHookConnector.id,
              action_type_id: '.webhook',
              group: 'default',
              params: {
                body: '{"test":"a default action"}',
              },
            };

            const ruleId = 'ruleId';
            const createdRule = await createRule(supertest, log, {
              ...getSimpleRule(ruleId),
              actions: [defaultRuleAction],
              throttle: '1d',
            });

            const { body } = await postBulkAction()
              .send({
                ids: [createdRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.add_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [],
                    },
                  },
                ],
              })
              .expect(200);

            // Check that the rule is skipped and was not updated
            expect(body.attributes.results.skipped[0].id).to.eql(createdRule.id);

            // Check that the updates have been persisted
            const { body: readRule } = await fetchRule(ruleId).expect(200);

            expect(readRule.actions).to.eql([
              {
                ...defaultRuleAction,
                uuid: createdRule.actions[0].uuid,
                frequency: { summary: true, throttle: '1d', notifyWhen: 'onThrottleInterval' },
              },
            ]);
          });

          it('should not change throttle if actions list in payload is empty', async () => {
            // create a new connector
            const webHookConnector = await createWebHookConnector();

            const defaultRuleAction = {
              id: webHookConnector.id,
              action_type_id: '.webhook',
              group: 'default',
              params: {
                body: '{"test":"a default action"}',
              },
            };

            const ruleId = 'ruleId';
            const createdRule = await createRule(supertest, log, {
              ...getSimpleRule(ruleId),
              actions: [defaultRuleAction],
              throttle: '8h',
            });

            const { body } = await postBulkAction()
              .send({
                ids: [createdRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.add_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [],
                    },
                  },
                ],
              })
              .expect(200);

            // Check that the rule is skipped and was not updated
            expect(body.attributes.results.skipped[0].id).to.eql(createdRule.id);

            // Check that the updates have been persisted
            const { body: readRule } = await fetchRule(ruleId).expect(200);

            expect(readRule.throttle).to.eql(undefined);
            expect(readRule.actions).to.eql(createdRule.actions);
          });
        });

        describe('prebuilt rules', () => {
          const cases = [
            {
              type: BulkActionEditTypeEnum.set_rule_actions,
            },
            {
              type: BulkActionEditTypeEnum.add_rule_actions,
            },
          ];
          cases.forEach(({ type }) => {
            it(`should apply "${type}" rule action to prebuilt rule`, async () => {
              await installMockPrebuiltRules(supertest, es);
              const prebuiltRule = await fetchPrebuiltRule();
              const webHookConnector = await createWebHookConnector();

              const { body } = await postBulkAction()
                .send({
                  ids: [prebuiltRule.id],
                  action: BulkActionTypeEnum.edit,
                  [BulkActionTypeEnum.edit]: [
                    {
                      type,
                      value: {
                        throttle: '1h',
                        actions: [
                          {
                            ...webHookActionMock,
                            id: webHookConnector.id,
                          },
                        ],
                      },
                    },
                  ],
                })
                .expect(200);

              const editedRule = body.attributes.results.updated[0];
              // Check that the updated rule is returned with the response
              expect(editedRule.actions).to.eql([
                {
                  ...webHookActionMock,
                  id: webHookConnector.id,
                  action_type_id: '.webhook',
                  uuid: editedRule.actions[0].uuid,
                  frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
                },
              ]);
              // version of prebuilt rule should not change
              expect(editedRule.version).to.be(prebuiltRule.version);

              // Check that the updates have been persisted
              const { body: readRule } = await fetchRule(prebuiltRule.rule_id).expect(200);

              expect(readRule.actions).to.eql([
                {
                  ...webHookActionMock,
                  id: webHookConnector.id,
                  action_type_id: '.webhook',
                  uuid: readRule.actions[0].uuid,
                  frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
                },
              ]);
              expect(prebuiltRule.version).to.be(readRule.version);
            });
          });

          // if rule action is applied together with another edit action, that can't be applied to prebuilt rule (for example: tags action)
          // bulk edit request should return error
          it(`should return error if one of edit action is not eligible for prebuilt rule`, async () => {
            await installMockPrebuiltRules(supertest, es);
            const prebuiltRule = await fetchPrebuiltRule();
            const webHookConnector = await createWebHookConnector();

            const { body } = await postBulkAction()
              .send({
                ids: [prebuiltRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.set_rule_actions,
                    value: {
                      throttle: '1h',
                      actions: [
                        {
                          ...webHookActionMock,
                          id: webHookConnector.id,
                        },
                      ],
                    },
                  },
                  {
                    type: BulkActionEditTypeEnum.set_tags,
                    value: ['tag-1'],
                  },
                ],
              })
              .expect(500);

            expect(body.attributes.summary).to.eql({
              failed: 1,
              skipped: 0,
              succeeded: 0,
              total: 1,
            });
            expect(body.attributes.errors[0]).to.eql({
              message: "Elastic rule can't be edited",
              status_code: 500,
              rules: [
                {
                  id: prebuiltRule.id,
                  name: prebuiltRule.name,
                },
              ],
            });

            // Check that the updates were not made
            const { body: readRule } = await fetchRule(prebuiltRule.rule_id).expect(200);

            expect(readRule.actions).to.eql(prebuiltRule.actions);
            expect(readRule.tags).to.eql(prebuiltRule.tags);
            expect(readRule.version).to.be(prebuiltRule.version);
          });
        });

        describe('throttle', () => {
          // For bulk editing of rule actions, NOTIFICATION_THROTTLE_NO_ACTIONS
          // is not available as payload, because "Perform No Actions" is not a valid option
          const casesForEmptyActions = [
            {
              payloadThrottle: NOTIFICATION_THROTTLE_RULE,
            },
            {
              payloadThrottle: '1d',
            },
          ];
          casesForEmptyActions.forEach(({ payloadThrottle }) => {
            it(`should not update throttle, if payload throttle="${payloadThrottle}" and actions list is empty`, async () => {
              const ruleId = 'ruleId';
              const createdRule = await createRule(supertest, log, {
                ...getSimpleRule(ruleId),
                throttle: '8h',
              });

              const { body } = await postBulkAction()
                .send({
                  ids: [createdRule.id],
                  action: BulkActionTypeEnum.edit,
                  [BulkActionTypeEnum.edit]: [
                    {
                      type: BulkActionEditTypeEnum.set_rule_actions,
                      value: {
                        throttle: payloadThrottle,
                        actions: [],
                      },
                    },
                  ],
                })
                .expect(200);

              // Check that the rule is skipped and was not updated
              expect(body.attributes.results.skipped[0].id).to.eql(createdRule.id);

              // Check that the updates have been persisted
              const { body: rule } = await fetchRule(ruleId).expect(200);

              expect(rule.throttle).to.eql(undefined);
            });
          });

          const casesForNonEmptyActions = [
            {
              payloadThrottle: NOTIFICATION_THROTTLE_RULE,
              expectedThrottle: undefined,
            },
            {
              payloadThrottle: '1h',
              expectedThrottle: undefined,
            },
            {
              payloadThrottle: '1d',
              expectedThrottle: undefined,
            },
            {
              payloadThrottle: '7d',
              expectedThrottle: undefined,
            },
          ];
          [
            BulkActionEditTypeEnum.set_rule_actions,
            BulkActionEditTypeEnum.add_rule_actions,
          ].forEach((ruleAction) => {
            casesForNonEmptyActions.forEach(({ payloadThrottle, expectedThrottle }) => {
              it(`throttle is updated correctly for rule action "${ruleAction}", if payload throttle="${payloadThrottle}" and actions non empty`, async () => {
                // create a new connector
                const webHookConnector = await createWebHookConnector();

                const ruleId = 'ruleId';
                const createdRule = await createRule(supertest, log, getSimpleRule(ruleId));

                const { body } = await postBulkAction()
                  .send({
                    ids: [createdRule.id],
                    action: BulkActionTypeEnum.edit,
                    [BulkActionTypeEnum.edit]: [
                      {
                        type: BulkActionEditTypeEnum.set_rule_actions,
                        value: {
                          throttle: payloadThrottle,
                          actions: [
                            {
                              id: webHookConnector.id,
                              group: 'default',
                              params: { body: '{}' },
                            },
                          ],
                        },
                      },
                    ],
                  })
                  .expect(200);

                // Check that the updated rule is returned with the response
                expect(body.attributes.results.updated[0].throttle).to.eql(expectedThrottle);

                const expectedActions = body.attributes.results.updated[0].actions.map(
                  (action: any) => ({
                    ...action,
                    frequency: {
                      summary: true,
                      throttle: payloadThrottle !== 'rule' ? payloadThrottle : null,
                      notifyWhen:
                        payloadThrottle !== 'rule' ? 'onThrottleInterval' : 'onActiveAlert',
                    },
                  })
                );

                // Check that the updates have been persisted
                const { body: rule } = await fetchRule(ruleId).expect(200);

                expect(rule.throttle).to.eql(expectedThrottle);
                expect(rule.actions).to.eql(expectedActions);
              });
            });
          });
        });

        describe('notifyWhen', () => {
          // For bulk editing of rule actions, NOTIFICATION_THROTTLE_NO_ACTIONS
          // is not available as payload, because "Perform No Actions" is not a valid option
          const cases = [
            {
              payload: { throttle: '1d' },
              expected: { notifyWhen: null },
            },
            {
              payload: { throttle: NOTIFICATION_THROTTLE_RULE },
              expected: { notifyWhen: null },
            },
          ];
          cases.forEach(({ payload, expected }) => {
            it(`should set notifyWhen correctly, if payload throttle="${payload.throttle}"`, async () => {
              const createdRule = await createRule(supertest, log, getSimpleRule('ruleId'));

              await postBulkAction()
                .send({
                  ids: [createdRule.id],
                  action: BulkActionTypeEnum.edit,
                  [BulkActionTypeEnum.edit]: [
                    {
                      type: BulkActionEditTypeEnum.set_rule_actions,
                      value: {
                        throttle: payload.throttle,
                        actions: [],
                      },
                    },
                  ],
                })
                .expect(200);

              // Check whether notifyWhen set correctly
              const { body: rule } = await fetchRuleByAlertApi(createdRule.id).expect(200);

              expect(rule.notify_when).to.eql(expected.notifyWhen);
            });
          });
        });
      });

      describe('schedule actions', () => {
        it('should return bad request error if payload is invalid', async () => {
          const ruleId = 'ruleId';
          const intervalMinutes = 0;
          const interval = `${intervalMinutes}m`;
          const lookbackMinutes = -1;
          const lookback = `${lookbackMinutes}m`;
          await createRule(supertest, log, getSimpleRule(ruleId));

          const { body } = await postBulkAction()
            .send({
              query: '',
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_schedule,
                  value: {
                    interval,
                    lookback,
                  },
                },
              ],
            })
            .expect(400);

          expect(body.statusCode).to.eql(400);
          expect(body.error).to.eql('Bad Request');
          expect(body.message).to.contain('edit.0.value.interval: Invalid');
          expect(body.message).to.contain('edit.0.value.lookback: Invalid');
        });

        it('should update schedule values in rules with a valid payload', async () => {
          const ruleId = 'ruleId';
          const intervalMinutes = 15;
          const interval = `${intervalMinutes}m`;
          const lookbackMinutes = 10;
          const lookback = `${lookbackMinutes}m`;
          await createRule(supertest, log, getSimpleRule(ruleId));

          const { body } = await postBulkAction()
            .send({
              query: '',
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_schedule,
                  value: {
                    interval,
                    lookback,
                  },
                },
              ],
            })
            .expect(200);

          expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

          expect(body.attributes.results.updated[0].interval).to.eql(interval);
          expect(body.attributes.results.updated[0].meta).to.eql({ from: `${lookbackMinutes}m` });
          expect(body.attributes.results.updated[0].from).to.eql(
            `now-${(intervalMinutes + lookbackMinutes) * 60}s`
          );
        });
      });
    });

    describe('overwrite_data_views', () => {
      it('should add an index pattern to a rule and overwrite the data view when overwrite_data_views is true', async () => {
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
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_index_patterns,
                value: ['initial-index-*'],
                overwrite_data_views: true,
              },
            ],
          })
          .expect(200);

        expect(setIndexBody.attributes.summary).to.eql({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        // Check that the updated rule is returned with the response
        expect(setIndexBody.attributes.results.updated[0].index).to.eql(['initial-index-*']);
        expect(setIndexBody.attributes.results.updated[0].data_view_id).to.eql(undefined);

        // Check that the updates have been persisted
        const { body: setIndexRule } = await fetchRule(ruleId).expect(200);

        expect(setIndexRule.index).to.eql(['initial-index-*']);
      });

      it('should return skipped rule and NOT add an index pattern to a rule or overwrite the data view when overwrite_data_views is false', async () => {
        const ruleId = 'ruleId';
        const dataViewId = 'index1-*';

        const simpleRule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          index: undefined,
          data_view_id: dataViewId,
        });

        const { body: setIndexBody } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_index_patterns,
                value: ['initial-index-*'],
                overwrite_data_views: false,
              },
            ],
          })
          .expect(200);

        expect(setIndexBody.attributes.summary).to.eql({
          failed: 0,
          skipped: 1,
          succeeded: 0,
          total: 1,
        });

        expect(setIndexBody.attributes.errors).to.be(undefined);

        // Check that the skipped rule is returned with the response
        expect(setIndexBody.attributes.results.skipped[0].id).to.eql(simpleRule.id);
        expect(setIndexBody.attributes.results.skipped[0].name).to.eql(simpleRule.name);
        expect(setIndexBody.attributes.results.skipped[0].skip_reason).to.eql('RULE_NOT_MODIFIED');

        // Check that the rule has not been updated
        const { body: setIndexRule } = await fetchRule(ruleId).expect(200);

        expect(setIndexRule.index).to.eql(undefined);
        expect(setIndexRule.data_view_id).to.eql(dataViewId);
      });

      it('should set an index pattern to a rule and overwrite the data view when overwrite_data_views is true', async () => {
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
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_index_patterns,
                value: ['initial-index-*'],
                overwrite_data_views: true,
              },
            ],
          })
          .expect(200);

        expect(setIndexBody.attributes.summary).to.eql({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        // Check that the updated rule is returned with the response
        expect(setIndexBody.attributes.results.updated[0].index).to.eql(['initial-index-*']);
        expect(setIndexBody.attributes.results.updated[0].data_view_id).to.eql(undefined);

        // Check that the updates have been persisted
        const { body: setIndexRule } = await fetchRule(ruleId).expect(200);

        expect(setIndexRule.index).to.eql(['initial-index-*']);
        expect(setIndexRule.data_view_id).to.eql(undefined);
      });

      it('should return error when set an empty index pattern to a rule and overwrite the data view when overwrite_data_views is true', async () => {
        const dataViewId = 'index1-*';
        const simpleRule = {
          ...getSimpleRule(),
          index: undefined,
          data_view_id: dataViewId,
        };
        const rule = await createRule(supertest, log, simpleRule);

        const { body } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_index_patterns,
                value: [],
                overwrite_data_views: true,
              },
            ],
          })
          .expect(500);

        expect(body.attributes.summary).to.eql({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
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

      it('should return skipped rule and NOT set an index pattern to a rule or overwrite the data view when overwrite_data_views is false', async () => {
        const ruleId = 'ruleId';
        const dataViewId = 'index1-*';
        const simpleRule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          index: undefined,
          data_view_id: dataViewId,
        });

        const { body: setIndexBody } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_index_patterns,
                value: ['initial-index-*'],
                overwrite_data_views: false,
              },
            ],
          })
          .expect(200);

        expect(setIndexBody.attributes.summary).to.eql({
          failed: 0,
          skipped: 1,
          succeeded: 0,
          total: 1,
        });

        expect(setIndexBody.attributes.errors).to.be(undefined);

        // Check that the skipped rule is returned with the response
        expect(setIndexBody.attributes.results.skipped[0].id).to.eql(simpleRule.id);
        expect(setIndexBody.attributes.results.skipped[0].name).to.eql(simpleRule.name);
        expect(setIndexBody.attributes.results.skipped[0].skip_reason).to.eql('RULE_NOT_MODIFIED');

        // Check that the rule has not been updated
        const { body: setIndexRule } = await fetchRule(ruleId).expect(200);

        expect(setIndexRule.index).to.eql(undefined);
        expect(setIndexRule.data_view_id).to.eql(dataViewId);
      });

      // This rule will now not have a source defined - as has been the behavior of rules since the beginning
      // this rule will use the default index patterns on rule run
      it('should be successful on an attempt to remove index patterns from a rule with only a dataView (no index patterns exist on the rule), if overwrite_data_views is true', async () => {
        const dataViewId = 'index1-*';
        const ruleId = 'ruleId';
        const rule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          data_view_id: dataViewId,
          index: undefined,
        });

        const { body } = await postBulkAction()
          .send({
            ids: [rule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.delete_index_patterns,
                value: ['simple-index-*'],
                overwrite_data_views: true,
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        // Check that the updated rule is returned with the response
        expect(body.attributes.results.updated[0].index).to.eql(undefined);
        expect(body.attributes.results.updated[0].data_view_id).to.eql(undefined);

        // Check that the updates have been persisted
        const { body: setIndexRule } = await fetchRule(ruleId).expect(200);

        expect(setIndexRule.index).to.eql(undefined);
        expect(setIndexRule.data_view_id).to.eql(undefined);
      });

      it('should return error if all index patterns removed from a rule with data views and overwrite_data_views is true', async () => {
        const dataViewId = 'index1-*';
        const ruleId = 'ruleId';
        const rule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          data_view_id: dataViewId,
          index: ['simple-index-*'],
        });

        const { body } = await postBulkAction()
          .send({
            ids: [rule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.delete_index_patterns,
                value: ['simple-index-*'],
                overwrite_data_views: true,
              },
            ],
          })
          .expect(500);

        expect(body.attributes.summary).to.eql({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
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

      it('should return a skipped rule if all index patterns removed from a rule with data views and overwrite_data_views is false', async () => {
        const dataViewId = 'index1-*';
        const ruleId = 'ruleId';
        const rule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          data_view_id: dataViewId,
          index: ['simple-index-*'],
        });

        const { body } = await postBulkAction()
          .send({
            ids: [rule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.delete_index_patterns,
                value: ['simple-index-*'],
                overwrite_data_views: false,
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 1, succeeded: 0, total: 1 });
        expect(body.attributes.errors).to.be(undefined);

        // Check that the skipped rule is returned with the response
        expect(body.attributes.results.skipped[0].id).to.eql(rule.id);
        expect(body.attributes.results.skipped[0].name).to.eql(rule.name);
        expect(body.attributes.results.skipped[0].skip_reason).to.eql('RULE_NOT_MODIFIED');
      });
    });

    describe('multiple_actions', () => {
      it('should return one updated rule when applying two valid operations on a rule', async () => {
        const ruleId = 'ruleId';
        const rule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          index: ['index1-*'],
          tags: ['tag1', 'tag2'],
        });

        const { body } = await postBulkAction()
          .send({
            ids: [rule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_index_patterns,
                value: ['initial-index-*'],
              },
              {
                type: BulkActionEditTypeEnum.add_tags,
                value: ['tag3'],
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(body.attributes.results.updated[0].tags).to.eql(['tag1', 'tag2', 'tag3']);
        expect(body.attributes.results.updated[0].index).to.eql(['index1-*', 'initial-index-*']);

        // Check that the rule has been persisted
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.index).to.eql(['index1-*', 'initial-index-*']);
        expect(updatedRule.tags).to.eql(['tag1', 'tag2', 'tag3']);
      });

      it('should return one updated rule when applying one valid operation and one operation to be skipped on a rule', async () => {
        const ruleId = 'ruleId';
        const rule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          index: ['index1-*'],
          tags: ['tag1', 'tag2'],
        });

        const { body } = await postBulkAction()
          .send({
            ids: [rule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              // Valid operation
              {
                type: BulkActionEditTypeEnum.add_index_patterns,
                value: ['initial-index-*'],
              },
              // Operation to be skipped
              {
                type: BulkActionEditTypeEnum.add_tags,
                value: ['tag1'],
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

        // Check that the updated rule is returned with the response
        expect(body.attributes.results.updated[0].tags).to.eql(['tag1', 'tag2']);
        expect(body.attributes.results.updated[0].index).to.eql(['index1-*', 'initial-index-*']);

        // Check that the rule has been persisted
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.index).to.eql(['index1-*', 'initial-index-*']);
        expect(updatedRule.tags).to.eql(['tag1', 'tag2']);
      });

      it('should return one skipped rule when two (all) operations result in a no-op', async () => {
        const ruleId = 'ruleId';
        const rule = await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          index: ['index1-*'],
          tags: ['tag1', 'tag2'],
        });

        const { body } = await postBulkAction()
          .send({
            ids: [rule.id],
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              // Operation to be skipped
              {
                type: BulkActionEditTypeEnum.add_index_patterns,
                value: ['index1-*'],
              },
              // Operation to be skipped
              {
                type: BulkActionEditTypeEnum.add_tags,
                value: ['tag1'],
              },
            ],
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 1, succeeded: 0, total: 1 });

        // Check that the skipped rule is returned with the response
        expect(body.attributes.results.skipped[0].name).to.eql(rule.name);
        expect(body.attributes.results.skipped[0].id).to.eql(rule.id);
        expect(body.attributes.results.skipped[0].skip_reason).to.eql('RULE_NOT_MODIFIED');

        // Check that no change to the rule have been persisted
        const { body: skippedRule } = await fetchRule(ruleId).expect(200);

        expect(skippedRule.index).to.eql(['index1-*']);
        expect(skippedRule.tags).to.eql(['tag1', 'tag2']);
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
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_timeline,
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
          action: BulkActionTypeEnum.edit,
          [BulkActionTypeEnum.edit]: [
            {
              type: BulkActionEditTypeEnum.set_timeline,
              value: {
                timeline_id: timelineId,
                timeline_title: timelineTitle,
              },
            },
          ],
        })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

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
