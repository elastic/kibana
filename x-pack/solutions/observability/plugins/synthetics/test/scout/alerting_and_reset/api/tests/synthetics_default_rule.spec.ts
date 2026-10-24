/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  SyntheticsMonitorStatusTranslations,
  TlsTranslations,
} from '../../../../../common/rules/synthetics/translations';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants/settings_defaults';
import { apiTest, mergeSyntheticsApiHeaders, SYNTHETICS_API_URLS } from '../../../common/fixtures';

const STATUS_RULE_TYPE_ID = 'xpack.synthetics.alerts.monitorStatus';
const TLS_RULE_TYPE_ID = 'xpack.synthetics.alerts.tls';

interface RuleActionItem {
  id: string;
  group: string;
  actionTypeId: string;
  params: Record<string, unknown>;
  frequency: Record<string, unknown>;
  uuid?: string;
}

interface DefaultRuleBody {
  alertTypeId: string;
  schedule: { interval: string };
  actions: RuleActionItem[];
}

const getActionsById = (rule: DefaultRuleBody, connectorId: string) => {
  const actions = rule.actions.filter((action) => action.id === connectorId);
  const recoveredAction = actions.find((action) => action.group === 'recovered');
  const firingAction = actions.find((action) => action.group !== 'recovered');
  return {
    recoveredAction: recoveredAction ? omit(recoveredAction, ['uuid']) : undefined,
    firingAction: firingAction ? omit(firingAction, ['uuid']) : undefined,
  };
};

const buildExpectedStatusActions = (connectorIds: {
  webhook: string;
  email: string;
  index: string;
  servicenow: string;
  slack: string;
}): RuleActionItem[] => [
  {
    group: 'recovered',
    params: {
      body: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.webhook',
    id: connectorIds.webhook,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
    params: {
      body: SyntheticsMonitorStatusTranslations.defaultActionMessage,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.webhook',
    id: connectorIds.webhook,
  },
  {
    group: 'recovered',
    params: {
      to: ['test@gmail.com'],
      subject: SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
      message: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
      messageHTML: null,
      cc: [],
      bcc: [],
      kibanaFooterLink: { path: '', text: '' },
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.email',
    id: connectorIds.email,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
    params: {
      to: ['test@gmail.com'],
      subject: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
      message: SyntheticsMonitorStatusTranslations.defaultActionMessage,
      messageHTML: null,
      cc: [],
      bcc: [],
      kibanaFooterLink: { path: '', text: '' },
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.email',
    id: connectorIds.email,
  },
  {
    group: 'recovered',
    params: {
      documents: [
        {
          monitorName: '{{context.monitorName}}',
          monitorUrl: '{{{context.monitorUrl}}}',
          statusMessage: '{{{context.status}}}',
          latestErrorMessage: '{{{context.latestErrorMessage}}}',
          observerLocation: '{{context.locationName}}',
          recoveryReason: '{{context.recoveryReason}}',
        },
      ],
      indexOverride: null,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.index',
    id: connectorIds.index,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
    params: {
      documents: [
        {
          monitorName: '{{context.monitorName}}',
          monitorUrl: '{{{context.monitorUrl}}}',
          statusMessage: '{{{context.status}}}',
          latestErrorMessage: '{{{context.lastErrorMessage}}}',
          observerLocation: '{{context.locationName}}',
        },
      ],
      indexOverride: null,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.index',
    id: connectorIds.index,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
    params: {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          short_description: SyntheticsMonitorStatusTranslations.defaultActionMessage,
          description: SyntheticsMonitorStatusTranslations.defaultActionMessage,
          impact: '2',
          severity: '2',
          urgency: '2',
          category: null,
          subcategory: null,
          externalId: null,
          correlation_id: null,
          correlation_display: null,
          additional_fields: null,
        },
        comments: [],
      },
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.servicenow',
    id: connectorIds.servicenow,
  },
  {
    group: 'recovered',
    params: {
      message: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.slack',
    id: connectorIds.slack,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
    params: {
      message: SyntheticsMonitorStatusTranslations.defaultActionMessage,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.slack',
    id: connectorIds.slack,
  },
];

const buildExpectedTlsActions = (connectorIds: {
  webhook: string;
  email: string;
  index: string;
  servicenow: string;
  slack: string;
}): RuleActionItem[] => [
  {
    group: 'recovered',
    params: {
      body: TlsTranslations.defaultRecoveryMessage,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.webhook',
    id: connectorIds.webhook,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.tls',
    params: {
      body: TlsTranslations.defaultActionMessage,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.webhook',
    id: connectorIds.webhook,
  },
  {
    group: 'recovered',
    params: {
      to: ['test@gmail.com'],
      subject: 'Alert has resolved for certificate {{context.commonName}} - Elastic Synthetics',
      message: TlsTranslations.defaultRecoveryMessage,
      messageHTML: null,
      cc: [],
      bcc: [],
      kibanaFooterLink: { path: '', text: '' },
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.email',
    id: connectorIds.email,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.tls',
    params: {
      to: ['test@gmail.com'],
      subject: 'Alert triggered for certificate {{context.commonName}} - Elastic Synthetics',
      message: TlsTranslations.defaultActionMessage,
      messageHTML: null,
      cc: [],
      bcc: [],
      kibanaFooterLink: { path: '', text: '' },
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.email',
    id: connectorIds.email,
  },
  {
    group: 'recovered',
    params: {
      documents: [
        {
          monitorName: '{{context.monitorName}}',
          monitorUrl: '{{{context.monitorUrl}}}',
          statusMessage: '{{{context.status}}}',
          latestErrorMessage: '{{{context.latestErrorMessage}}}',
          observerLocation: '{{context.locationName}}',
          recoveryReason: '{{context.recoveryReason}}',
        },
      ],
      indexOverride: null,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.index',
    id: connectorIds.index,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.tls',
    params: {
      documents: [
        {
          monitorName: '{{context.monitorName}}',
          monitorUrl: '{{{context.monitorUrl}}}',
          statusMessage: '{{{context.status}}}',
          latestErrorMessage: '{{{context.lastErrorMessage}}}',
          observerLocation: '{{context.locationName}}',
        },
      ],
      indexOverride: null,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.index',
    id: connectorIds.index,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.tls',
    params: {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          short_description: TlsTranslations.defaultActionMessage,
          description: TlsTranslations.defaultActionMessage,
          impact: '2',
          severity: '2',
          urgency: '2',
          category: null,
          subcategory: null,
          externalId: null,
          correlation_id: null,
          correlation_display: null,
          additional_fields: null,
        },
        comments: [],
      },
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.servicenow',
    id: connectorIds.servicenow,
  },
  {
    group: 'recovered',
    params: {
      message: TlsTranslations.defaultRecoveryMessage,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.slack',
    id: connectorIds.slack,
  },
  {
    group: 'xpack.synthetics.alerts.actionGroups.tls',
    params: {
      message: TlsTranslations.defaultActionMessage,
    },
    frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
    actionTypeId: '.slack',
    id: connectorIds.slack,
  },
];

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/alerting/synthetics/synthetics_default_rule.ts`.
 *
 * Verifies that default status and TLS rules populate the expected firing and
 * recovery actions across webhook, email, index, ServiceNow, and Slack
 * connectors when `enable_default_alerting` is called (`POST` on create and
 * `PUT` on settings update).
 */
apiTest.describe(
  'SyntheticsDefaultRules',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorHeaders: Record<string, string>;
    let connectorIds: {
      webhook: string;
      email: string;
      index: string;
      servicenow: string;
      slack: string;
    };
    let testActions: string[];
    let expectedStatusRule: DefaultRuleBody;
    let expectedTlsRule: DefaultRuleBody;

    const putDynamicSettings = (apiClient: ApiClientFixture, body: Record<string, unknown>) =>
      apiClient.put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS, {
        headers: editorHeaders,
        body,
        responseType: 'json',
      });

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader);

      await apiServices.alerting.cleanup.deleteRulesByTags(['SYNTHETICS_DEFAULT_ALERT']);

      const [webhook, email, index, servicenow, slack] = await Promise.all([
        apiServices.alerting.connectors.create({
          name: 'Scout Webhook Connector',
          connectorTypeId: '.webhook',
          config: { url: 'https://localhost:6300' },
        }),
        apiServices.alerting.connectors.create({
          name: 'Notification Email Connector',
          connectorTypeId: '.email',
          config: { from: 'me@test.com', service: '__json' },
          secrets: { user: 'user', password: 'password' },
        }),
        apiServices.alerting.connectors.create({
          name: 'preconfigured_es_index_action',
          connectorTypeId: '.index',
          config: {
            index: 'functional-test-actions-index-preconfigured',
            refresh: true,
            executionTimeField: 'timestamp',
          },
        }),
        apiServices.alerting.connectors.create({
          name: 'ServiceNow#xyz',
          connectorTypeId: '.servicenow',
          config: { apiUrl: 'https://ven04334.service-now.com', usesTableApi: true },
          secrets: { username: 'elastic_integration', password: 'somepassword' },
        }),
        apiServices.alerting.connectors.create({
          name: 'Slack#xyz',
          connectorTypeId: '.slack',
          secrets: {
            webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
          },
        }),
      ]);

      connectorIds = {
        webhook: webhook.id as string,
        email: email.id as string,
        index: index.id as string,
        servicenow: servicenow.id as string,
        slack: slack.id as string,
      };
      testActions = [
        connectorIds.webhook,
        connectorIds.email,
        connectorIds.index,
        connectorIds.servicenow,
        connectorIds.slack,
      ];

      expectedStatusRule = {
        alertTypeId: STATUS_RULE_TYPE_ID,
        schedule: { interval: '1m' },
        actions: buildExpectedStatusActions(connectorIds),
      };
      expectedTlsRule = {
        alertTypeId: TLS_RULE_TYPE_ID,
        schedule: { interval: '1m' },
        actions: buildExpectedTlsActions(connectorIds),
      };
    });

    apiTest.afterAll(async ({ apiClient, apiServices }) => {
      await putDynamicSettings(apiClient, DYNAMIC_SETTINGS_DEFAULTS);
      await apiServices.alerting.cleanup.deleteRulesByTags(['SYNTHETICS_DEFAULT_ALERT']);
      await Promise.all(
        testActions.map((connectorId) => apiServices.alerting.connectors.delete(connectorId))
      );
    });

    apiTest(
      'creates rules when settings are configured and updates rules when settings are updated',
      async ({ apiClient }) => {
        await apiTest.step('creates rules when settings are configured', async () => {
          const settingsRes = await putDynamicSettings(apiClient, {
            certExpirationThreshold: 30,
            certAgeThreshold: 730,
            defaultConnectors: testActions.slice(0, 2),
            defaultEmail: { to: ['test@gmail.com'], cc: [], bcc: [] },
          });
          expect(settingsRes).toHaveStatusCode(200);

          const response = await apiClient.post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING, {
            headers: editorHeaders,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);

          const { statusRule: statusResult, tlsRule: tlsResult } = response.body as {
            statusRule: DefaultRuleBody;
            tlsRule: DefaultRuleBody;
          };
          expect(statusResult.actions).toHaveLength(4);
          expect(tlsResult.actions).toHaveLength(4);

          expect(statusResult.alertTypeId).toStrictEqual(expectedStatusRule.alertTypeId);
          expect(statusResult.schedule).toStrictEqual(expectedStatusRule.schedule);
          expect(tlsResult.alertTypeId).toStrictEqual(expectedTlsRule.alertTypeId);
          expect(tlsResult.schedule).toStrictEqual(expectedTlsRule.schedule);

          for (const actionId of testActions.slice(0, 2)) {
            const expectedStatus = getActionsById(expectedStatusRule, actionId);
            const actualStatus = getActionsById(statusResult, actionId);
            expect(actualStatus.firingAction).toStrictEqual(expectedStatus.firingAction);
            expect(actualStatus.recoveredAction).toStrictEqual(expectedStatus.recoveredAction);

            const expectedTls = getActionsById(expectedTlsRule, actionId);
            const actualTls = getActionsById(tlsResult, actionId);
            expect(actualTls.firingAction).toStrictEqual(expectedTls.firingAction);
            expect(actualTls.recoveredAction).toStrictEqual(expectedTls.recoveredAction);
          }
        });

        await apiTest.step('updates rules when settings are updated', async () => {
          const settingsRes = await putDynamicSettings(apiClient, {
            certExpirationThreshold: 30,
            certAgeThreshold: 730,
            defaultConnectors: testActions,
            defaultEmail: { to: ['test@gmail.com'], cc: [], bcc: [] },
          });
          expect(settingsRes).toHaveStatusCode(200);

          const response = await apiClient.put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING, {
            headers: editorHeaders,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);

          const { statusRule: statusResult, tlsRule: tlsResult } = response.body as {
            statusRule: DefaultRuleBody;
            tlsRule: DefaultRuleBody;
          };
          expect(statusResult.actions).toHaveLength(9);
          expect(tlsResult.actions).toHaveLength(9);

          expect(statusResult.alertTypeId).toStrictEqual(expectedStatusRule.alertTypeId);
          expect(statusResult.schedule).toStrictEqual(expectedStatusRule.schedule);
          expect(tlsResult.alertTypeId).toStrictEqual(expectedTlsRule.alertTypeId);
          expect(tlsResult.schedule).toStrictEqual(expectedTlsRule.schedule);

          for (const actionId of testActions) {
            const expectedStatus = getActionsById(expectedStatusRule, actionId);
            const actualStatus = getActionsById(statusResult, actionId);
            expect(actualStatus.firingAction).toStrictEqual(expectedStatus.firingAction);
            expect(actualStatus.recoveredAction).toStrictEqual(expectedStatus.recoveredAction);

            const expectedTls = getActionsById(expectedTlsRule, actionId);
            const actualTls = getActionsById(tlsResult, actionId);
            expect(actualTls.firingAction).toStrictEqual(expectedTls.firingAction);
            expect(actualTls.recoveredAction).toStrictEqual(expectedTls.recoveredAction);
          }
        });
      }
    );
  }
);
