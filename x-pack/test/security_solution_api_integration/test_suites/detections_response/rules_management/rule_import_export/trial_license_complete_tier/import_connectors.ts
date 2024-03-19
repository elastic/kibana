/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { deleteAllRules } from '../../../../../../common/utils/security_solution';
import { combineToNdJson, getCustomQueryRuleParams } from '../../../utils';
import { createConnector, deleteConnector, getConnector } from '../../../utils/connectors';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @brokenInServerless @skipInQA import action connectors', () => {
    const CONNECTOR_ID = '1be16246-642a-4ed8-bfd3-b47f8c7d7055';
    const ANOTHER_CONNECTOR_ID = 'abc16246-642a-4ed8-bfd3-b47f8c7d7055';
    const CUSTOM_ACTION_CONNECTOR = {
      id: CONNECTOR_ID,
      type: 'action',
      updated_at: '2024-02-05T11:52:10.692Z',
      created_at: '2024-02-05T11:52:10.692Z',
      version: 'WzYsMV0=',
      attributes: {
        actionTypeId: '.email',
        name: 'test-connector',
        isMissingSecrets: false,
        config: {
          from: 'a@test.com',
          service: 'other',
          host: 'example.com',
          port: 123,
          secure: false,
          hasAuth: false,
          tenantId: null,
          clientId: null,
          oauthTokenUrl: null,
        },
        secrets: {},
      },
      references: [],
      managed: false,
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: '8.3.0',
    };

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteConnector(supertest, CONNECTOR_ID);
      await deleteConnector(supertest, ANOTHER_CONNECTOR_ID);
    });

    describe('overwrite connectors is set to "false"', () => {
      it('imports a rule with an action connector', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            name: 'Rule 1',
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Some message',
                  to: ['test@test.com'],
                  subject: 'Test',
                },
                action_type_id: '.email',
                uuid: 'fda6721b-d3a4-4d2c-ad0c-18893759e096',
                frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
              },
            ],
          }),
          CUSTOM_ACTION_CONNECTOR
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          action_connectors_success: true,
          action_connectors_success_count: 1,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });

        expect(await getConnector(supertest, CONNECTOR_ID)).toMatchObject({
          id: CONNECTOR_ID,
          name: 'test-connector',
        });
      });

      it('DOES NOT import an action connector without rules', async () => {
        const ndjson = combineToNdJson(CUSTOM_ACTION_CONNECTOR);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 0,
          rules_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });

        await supertest
          .get(`/api/actions/connector/${CONNECTOR_ID}`)
          .set('kbn-xsrf', 'foo')
          .expect(404);
      });

      it('DOES NOT import an action connector when there are no rules referencing it', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            name: 'Rule 1',
            actions: [
              {
                group: 'default',
                id: ANOTHER_CONNECTOR_ID,
                params: {
                  message: 'Some message',
                  to: ['test@test.com'],
                  subject: 'Test',
                },
                action_type_id: '.email',
                uuid: 'fda6721b-d3a4-4d2c-ad0c-18893759e096',
                frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
              },
            ],
          }),
          { ...CUSTOM_ACTION_CONNECTOR, id: ANOTHER_CONNECTOR_ID },
          CUSTOM_ACTION_CONNECTOR
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          action_connectors_success: true,
          action_connectors_success_count: 1,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });

        await supertest
          .get(`/api/actions/connector/${CONNECTOR_ID}`)
          .set('kbn-xsrf', 'foo')
          .expect(404);
      });

      it('DOES NOT return an error when rule actions reference a preconfigured connector', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            name: 'Rule 1',
            actions: [
              {
                group: 'default',
                id: 'my-test-email',
                params: {
                  message: 'Some message',
                  to: ['test@test.com'],
                  subject: 'Test',
                },
                action_type_id: '.email',
                uuid: 'fda6721b-d3a4-4d2c-ad0c-18893759e096',
                frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });

      /**
       * When importing an action connector, if its `id` matches with an existing one, the type and config isn't checked.
       * In fact, the connector being imported can have a different type and configuration, and its creation will be skipped.
       */
      it('skips importing already existing action connectors', async () => {
        await createConnector(
          supertest,
          {
            connector_type_id: '.webhook',
            name: 'test-connector',
            config: {
              // checkout `x-pack/test/security_solution_api_integration/config/ess/config.base.ts` for configuration
              // `some.non.existent.com` must be set as an allowed host
              url: 'https://some.non.existent.com',
              method: 'post',
            },
            secrets: {},
          },
          CONNECTOR_ID
        );

        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            name: 'Rule 1',
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Some message',
                  to: ['test@test.com'],
                  subject: 'Test',
                },
                action_type_id: '.email',
                uuid: 'fda6721b-d3a4-4d2c-ad0c-18893759e096',
                frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
              },
            ],
          }),
          CUSTOM_ACTION_CONNECTOR
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });

        expect(await getConnector(supertest, CONNECTOR_ID)).toMatchObject({
          id: CONNECTOR_ID,
          name: 'test-connector',
        });
      });

      it('returns an error when connector is missing in ndjson', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            name: 'Rule 1',
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Some message',
                  to: ['test@test.com'],
                  subject: 'Test',
                },
                action_type_id: '.email',
                uuid: 'fda6721b-d3a4-4d2c-ad0c-18893759e096',
                frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [
            {
              error: {
                message: `1 connector is missing. Connector id missing is: ${CONNECTOR_ID}`,
                status_code: 404,
              },
              id: CONNECTOR_ID,
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 0,
          rules_count: 1,
          action_connectors_success: false,
          action_connectors_success_count: 0,
          action_connectors_errors: [
            {
              error: {
                message: `1 connector is missing. Connector id missing is: ${CONNECTOR_ID}`,
                status_code: 404,
              },
              id: CONNECTOR_ID,
              rule_id: 'rule-1',
            },
          ],
          action_connectors_warnings: [],
        });
      });
    });

    describe('overwrite connectors is set to "true"', () => {
      it('overwrites existing connector', async () => {
        await createConnector(
          supertest,
          {
            connector_type_id: '.webhook',
            name: 'existing-connector',
            config: {
              // checkout `x-pack/test/security_solution_api_integration/config/ess/config.base.ts` for configuration
              // `some.non.existent.com` must be set as an allowed host
              url: 'https://some.non.existent.com',
              method: 'post',
            },
            secrets: {},
          },
          CONNECTOR_ID
        );

        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            name: 'Rule 1',
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Some message',
                  to: ['test@test.com'],
                  subject: 'Test',
                },
                action_type_id: '.email',
                uuid: 'fda6721b-d3a4-4d2c-ad0c-18893759e096',
                frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
              },
            ],
          }),
          {
            ...CUSTOM_ACTION_CONNECTOR,
            attributes: { ...CUSTOM_ACTION_CONNECTOR.attributes, name: 'updated-connector' },
          }
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite_action_connectors=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          action_connectors_success: true,
          action_connectors_success_count: 1,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });

        expect(await getConnector(supertest, CONNECTOR_ID)).toMatchObject({
          id: CONNECTOR_ID,
          name: 'updated-connector',
        });
      });

      it('returns an error when connector is missing in ndjson', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            name: 'Rule 1',
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Some message',
                  to: ['test@test.com'],
                  subject: 'Test',
                },
                action_type_id: '.email',
                uuid: 'fda6721b-d3a4-4d2c-ad0c-18893759e096',
                frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite_action_connectors=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [
            {
              error: {
                message: `1 connector is missing. Connector id missing is: ${CONNECTOR_ID}`,
                status_code: 404,
              },
              id: CONNECTOR_ID,
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 0,
          rules_count: 1,
          action_connectors_success: false,
          action_connectors_success_count: 0,
          action_connectors_errors: [
            {
              error: {
                message: `1 connector is missing. Connector id missing is: ${CONNECTOR_ID}`,
                status_code: 404,
              },
              id: CONNECTOR_ID,
              rule_id: 'rule-1',
            },
          ],
          action_connectors_warnings: [],
        });
      });

      it('DOES NOT return an error when rule actions reference a preconfigured connector', async () => {
        const ndjson = combineToNdJson(
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            name: 'Rule 1',
            actions: [
              {
                group: 'default',
                id: 'my-test-email',
                params: {
                  message: 'Some message',
                  to: ['test@test.com'],
                  subject: 'Test',
                },
                action_type_id: '.email',
                uuid: 'fda6721b-d3a4-4d2c-ad0c-18893759e096',
                frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite_action_connectors=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(ndjson), 'rules.ndjson')
          .expect(200);

        expect(body).toMatchObject({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });
    });
  });
};
