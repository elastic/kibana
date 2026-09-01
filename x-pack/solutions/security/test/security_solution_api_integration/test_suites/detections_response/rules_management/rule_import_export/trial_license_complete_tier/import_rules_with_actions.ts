/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuid } from 'uuid';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getCustomQueryRuleParams, importRules, importRulesWithSuccess } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getWebHookConnectorParams } from '../../../utils/connectors/get_web_hook_connector_params';
import { createConnector } from '../../../utils/connectors';

const RULE_TO_IMPORT_RULE_ID = 'imported-rule';
const RULE_TO_IMPORT_RULE_ID_2 = 'another-imported-rule';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const spacesServices = getService('spaces');

  describe('@ess @serverless @skipInServerlessMKI import rules with actions', () => {
    const spaceId = '4567-space';

    before(async () => {
      await spacesServices.delete(spaceId);
      await spacesServices.create({
        id: spaceId,
        name: spaceId,
      });
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllRules(supertest, log, spaceId);
    });

    const testImportingInSpace = (kibanaSpaceId?: string) => {
      describe('rules with action connectors', () => {
        it('import a rule with an action connector', async () => {
          const webHookConnectorParams = getWebHookConnectorParams();
          const connectorId = await createConnector(
            supertest,
            webHookConnectorParams,
            undefined,
            kibanaSpaceId
          );
          const ACTION = {
            group: 'default',
            id: connectorId,
            action_type_id: webHookConnectorParams.connector_type_id,
            params: {},
          };
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              actions: [ACTION],
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule.actions[0]).toMatchObject(ACTION);
        });

        it('imports multiple rules with action connectors in bulk', async () => {
          const WEBHOOK_CONNECTOR_ID = uuid();
          const WEBHOOK_CONNECTOR = {
            id: WEBHOOK_CONNECTOR_ID,
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.webhook',
              name: 'webhook',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          };
          const INDEX_CONNECTOR_ID = uuid();
          const INDEX_CONNECTOR = {
            id: INDEX_CONNECTOR_ID,
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.index',
              name: 'index',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          };
          const CUSTOM_QUERY_RULE_WITH_WEBHOOK_CONNECTOR = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            actions: [
              {
                group: 'default',
                id: WEBHOOK_CONNECTOR_ID,
                action_type_id: '.webhook',
                params: {},
              },
            ],
          });
          const CUSTOM_QUERY_RULE_WITH_INDEX_CONNECTOR = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID_2,
            actions: [
              {
                group: 'default',
                id: INDEX_CONNECTOR_ID,
                action_type_id: '.index',
                params: {},
              },
            ],
          });

          const IMPORT_PAYLOAD = [
            CUSTOM_QUERY_RULE_WITH_WEBHOOK_CONNECTOR,
            CUSTOM_QUERY_RULE_WITH_INDEX_CONNECTOR,
            WEBHOOK_CONNECTOR,
            INDEX_CONNECTOR,
          ];

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            success_count: 2,
            rules_count: 2,
            errors: [],
            action_connectors_success: true,
            action_connectors_success_count: 2,
            action_connectors_errors: [],
            action_connectors_warnings: [],
          });

          const { body: webhookRule } = await detectionsApi
            .readRule({ query: { rule_id: RULE_TO_IMPORT_RULE_ID } }, kibanaSpaceId)
            .expect(200);
          const { body: indexRule } = await detectionsApi
            .readRule({ query: { rule_id: RULE_TO_IMPORT_RULE_ID_2 } }, kibanaSpaceId)
            .expect(200);

          expect(webhookRule.actions[0].id).toBe(WEBHOOK_CONNECTOR_ID);
          expect(indexRule.actions[0].id).toBe(INDEX_CONNECTOR_ID);
        });
      });
    };

    describe('importing in default space', () => {
      testImportingInSpace();
    });

    describe('importing in non-default space', () => {
      testImportingInSpace(spaceId);

      describe('rules with action connectors (edge cases)', () => {
        it('overwrites a rule with connector after importing to the default space', async () => {
          const CONNECTOR_ID = uuid();
          const SLACK_CONNECTOR = {
            id: CONNECTOR_ID,
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.slack',
              name: 'slack',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          };
          const RULE_WITH_ACTION = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                action_type_id: '.slack',
              },
            ],
          });
          const IMPORT_PAYLOAD = [RULE_WITH_ACTION, SLACK_CONNECTOR];

          await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
          });

          await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId,
          });

          const overwriteImportResponseBody = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: true,
            spaceId,
          });

          expect(overwriteImportResponseBody).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            action_connectors_success: true,
            action_connectors_success_count: 1,
            action_connectors_warnings: [],
            action_connectors_errors: [],
          });

          const { body: overwritten } = await detectionsApi
            .readRule({ query: { rule_id: RULE_TO_IMPORT_RULE_ID } }, spaceId)
            .expect(200);

          // Cross-space import remaps connector SO ids; lock action presence/type.
          expect(overwritten.actions).toHaveLength(1);
          expect(overwritten.actions[0].action_type_id).toBe('.slack');
          expect(typeof overwritten.actions[0].id).toBe('string');
        });

        it('imports a rule with connector when connector includes an originId', async () => {
          const CONNECTOR_ID = uuid();
          const SLACK_CONNECTOR = {
            id: CONNECTOR_ID,
            originId: 'some-origin-id',
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.slack',
              name: 'slack',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          };
          const RULE_WITH_ACTION = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                action_type_id: '.slack',
              },
            ],
          });
          const IMPORT_PAYLOAD = [RULE_WITH_ACTION, SLACK_CONNECTOR];

          await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
          });

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            action_connectors_success: true,
            action_connectors_success_count: 1,
            action_connectors_warnings: [],
            action_connectors_errors: [],
          });

          const { body: imported } = await detectionsApi
            .readRule({ query: { rule_id: RULE_TO_IMPORT_RULE_ID } }, spaceId)
            .expect(200);

          // originId remaps the connector id in the destination space.
          expect(imported.actions).toHaveLength(1);
          expect(imported.actions[0].action_type_id).toBe('.slack');
          expect(typeof imported.actions[0].id).toBe('string');
          expect(imported.actions[0].id).not.toBe(CONNECTOR_ID);
        });
      });
    });

    describe('error handling', () => {
      it('reports a missing connector', async () => {
        const IMPORT_PAYLOAD = [
          getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            actions: [
              {
                group: 'default',
                id: '123',
                action_type_id: '456',
                params: {},
              },
            ],
          }),
        ];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          success: false,
          success_count: 0,
          rules_count: 1,
          errors: [
            {
              rule_id: RULE_TO_IMPORT_RULE_ID,
              error: {
                status_code: 404,
                message: 'Rule actions reference the following missing action IDs: 123',
              },
            },
          ],
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [],
        });

        await detectionsApi.readRule({ query: { rule_id: RULE_TO_IMPORT_RULE_ID } }).expect(404);
      });

      it('warns about a missing connector secret', async () => {
        const WEBHOOK_CONNECTOR_ID = uuid();
        const WEBHOOK_CONNECTOR = {
          id: WEBHOOK_CONNECTOR_ID,
          type: 'action',
          updated_at: '2023-01-25T14:35:52.852Z',
          created_at: '2023-01-25T14:35:52.852Z',
          version: 'WzUxNTksMV0=',
          attributes: {
            actionTypeId: '.webhook',
            name: 'webhook',
            isMissingSecrets: true,
            config: {},
            secrets: {},
          },
          references: [],
          migrationVersion: { action: '8.3.0' },
          coreMigrationVersion: '8.7.0',
        };
        const CUSTOM_QUERY_RULE = getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          actions: [
            {
              group: 'default',
              id: WEBHOOK_CONNECTOR_ID,
              action_type_id: '.webhook',
              params: {},
            },
          ],
        });

        const IMPORT_PAYLOAD = [CUSTOM_QUERY_RULE, WEBHOOK_CONNECTOR];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          action_connectors_success: true,
          action_connectors_success_count: 1,
          action_connectors_warnings: [
            {
              actionPath: '/app/management/insightsAndAlerting/triggersActionsConnectors',
              buttonLabel: 'Go to connectors',
              message: '1 connector has sensitive information that require updates.',
              type: 'action_required',
            },
          ],
          action_connectors_errors: [],
        });
      });

      it('imports a mix of rules with actions and connectors while some connectors are missing', async () => {
        const WEBHOOK_CONNECTOR_ID = uuid();
        const WEBHOOK_CONNECTOR = {
          id: WEBHOOK_CONNECTOR_ID,
          type: 'action',
          updated_at: '2023-01-25T14:35:52.852Z',
          created_at: '2023-01-25T14:35:52.852Z',
          version: 'WzUxNTksMV0=',
          attributes: {
            actionTypeId: '.webhook',
            name: 'webhook',
            isMissingSecrets: false,
            config: {},
            secrets: {},
          },
          references: [],
          migrationVersion: { action: '8.3.0' },
          coreMigrationVersion: '8.7.0',
        };
        const CUSTOM_QUERY_RULE_WITH_WEBHOOK_CONNECTOR = getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          actions: [
            {
              group: 'default',
              id: WEBHOOK_CONNECTOR_ID,
              action_type_id: '.webhook',
              params: {},
            },
          ],
        });
        const NON_EXISTING_CONNECTOR = uuid();
        const CUSTOM_QUERY_RULE_2 = getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID_2,
          actions: [
            {
              group: 'default',
              id: NON_EXISTING_CONNECTOR, // <-- This does not exist
              action_type_id: '.index',
              params: {},
            },
          ],
        });

        const IMPORT_PAYLOAD = [
          CUSTOM_QUERY_RULE_WITH_WEBHOOK_CONNECTOR,
          CUSTOM_QUERY_RULE_2,
          WEBHOOK_CONNECTOR,
        ];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          success: false,
          success_count: 1,
          rules_count: 2,
          errors: [
            {
              rule_id: RULE_TO_IMPORT_RULE_ID_2,
              error: {
                status_code: 404,
                message: `Rule actions reference the following missing action IDs: ${NON_EXISTING_CONNECTOR}`,
              },
            },
          ],
          action_connectors_success: true,
          action_connectors_success_count: 1,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });

        const { body: successRule } = await detectionsApi
          .readRule({ query: { rule_id: RULE_TO_IMPORT_RULE_ID } })
          .expect(200);
        expect(successRule.actions[0].id).toBe(WEBHOOK_CONNECTOR_ID);

        await detectionsApi.readRule({ query: { rule_id: RULE_TO_IMPORT_RULE_ID_2 } }).expect(404);
      });
    });
  });
};
