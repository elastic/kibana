/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { omit } from 'lodash';
import { TlsTranslations } from '@kbn/synthetics-plugin/common/rules/synthetics/translations';
import { FtrProviderContext } from '../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const server = getService('kibanaServer');

  const testActions = [
    'custom.ssl.noCustom',
    'notification-email',
    'preconfigured-es-index-action',
    'my-deprecated-servicenow',
    'my-slack1',
  ];

  describe('SyntheticsRules', () => {
    before(async () => {
      await server.savedObjects.cleanStandardList();
    });

    after(async () => {
      await server.savedObjects.cleanStandardList();
    });

    it('creates rule when settings are configured', async () => {
      await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send({
          certExpirationThreshold: 30,
          certAgeThreshold: 730,
          defaultConnectors: testActions.slice(0, 2),
          defaultEmail: { to: ['test@gmail.com'], cc: [], bcc: [] },
        })
        .expect(200);

      const response = await supertest
        .post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send();
      const statusResult = response.body.statusRule;
      const tlsResult = response.body.tlsRule;
      expect(statusResult.actions.length).eql(4);
      expect(tlsResult.actions.length).eql(4);

      compareRules(statusResult, statusRule);
      compareRules(tlsResult, tlsRule);

      testActions.slice(0, 2).forEach((action) => {
        const { recoveredAction, firingAction } = getActionById(statusRule, action);
        const resultAction = getActionById(statusResult, action);
        expect(firingAction).eql(resultAction.firingAction);
        expect(recoveredAction).eql(resultAction.recoveredAction);
      });

      testActions.slice(0, 2).forEach((action) => {
        const { recoveredAction, firingAction } = getActionById(tlsRule, action);
        const resultAction = getActionById(tlsResult, action);
        expect(firingAction).eql(resultAction.firingAction);
        expect(recoveredAction).eql(resultAction.recoveredAction);
      });
    });

    it('updates rules when settings are updated', async () => {
      await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send({
          certExpirationThreshold: 30,
          certAgeThreshold: 730,
          defaultConnectors: testActions,
          defaultEmail: { to: ['test@gmail.com'], cc: [], bcc: [] },
        })
        .expect(200);

      const response = await supertest
        .put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send();

      const statusResult = response.body.statusRule;
      const tlsResult = response.body.tlsRule;
      expect(statusResult.actions.length).eql(9);
      expect(tlsResult.actions.length).eql(9);

      compareRules(statusResult, statusRule);
      compareRules(tlsResult, tlsRule);

      testActions.forEach((action) => {
        const { recoveredAction, firingAction } = getActionById(statusRule, action);
        const resultAction = getActionById(statusResult, action);
        expect(firingAction).eql(resultAction.firingAction);
        expect(recoveredAction).eql(resultAction.recoveredAction);
      });
      testActions.forEach((action) => {
        const { recoveredAction, firingAction } = getActionById(tlsRule, action);
        const resultAction = getActionById(tlsResult, action);
        expect(firingAction).eql(resultAction.firingAction);
        expect(recoveredAction).eql(resultAction.recoveredAction);
      });
    });
  });
}
const compareRules = (rule1: SanitizedRule, rule2: SanitizedRule) => {
  expect(rule1.alertTypeId).eql(rule2.alertTypeId);
  expect(rule1.schedule).eql(rule2.schedule);
};

const getActionById = (rule: SanitizedRule, id: string) => {
  const actions = rule.actions.filter((action) => action.id === id);
  const recoveredAction = actions.find(
    (action) => 'group' in action && action.group === 'recovered'
  );
  const firingAction = actions.find((action) => 'group' in action && action.group !== 'recovered');
  return {
    recoveredAction: omit(recoveredAction, ['uuid']),
    firingAction: omit(firingAction, ['uuid']),
  };
};

const statusRule = {
  id: 'dbbc39f0-1781-11ee-80b9-6522650f1d50',
  notifyWhen: null,
  consumer: 'uptime',
  alertTypeId: 'xpack.synthetics.alerts.monitorStatus',
  tags: ['SYNTHETICS_DEFAULT_ALERT'],
  name: 'Synthetics status internal rule',
  enabled: true,
  throttle: null,
  apiKeyOwner: 'elastic',
  apiKeyCreatedByUser: false,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  revision: 0,
  running: false,
  schedule: { interval: '1m' },
  actions: [
    {
      group: 'recovered',
      params: {
        body: 'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationName}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '789f2b81-e098-4f33-9802-1d355f4fabbe',
      actionTypeId: '.webhook',
      id: 'custom.ssl.noCustom',
    },
    {
      group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
      params: {
        body: '"{{context.monitorName}}" is {{{context.status}}} from {{context.locationName}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- Checked at: {{context.checkedAt}}  \n- From: {{context.locationName}}  \n- Error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '1b3f3958-f019-4ca0-b6b1-ccc4cf51d501',
      actionTypeId: '.webhook',
      id: 'custom.ssl.noCustom',
    },
    {
      group: 'recovered',
      params: {
        to: ['test@gmail.com'],
        subject:
          '"{{context.monitorName}}" ({{context.locationName}}) {{context.recoveryStatus}} - Elastic Synthetics',
        message:
          'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationName}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
        messageHTML: null,
        cc: [],
        bcc: [],
        kibanaFooterLink: { path: '', text: '' },
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '1252f0ef-8846-4b4e-93c1-3e59900b5055',
      actionTypeId: '.email',
      id: 'notification-email',
    },
    {
      group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
      params: {
        to: ['test@gmail.com'],
        subject:
          '"{{context.monitorName}}" ({{context.locationName}}) is down - Elastic Synthetics',
        message:
          '"{{context.monitorName}}" is {{{context.status}}} from {{context.locationName}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- Checked at: {{context.checkedAt}}  \n- From: {{context.locationName}}  \n- Error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
        messageHTML: null,
        cc: [],
        bcc: [],
        kibanaFooterLink: { path: '', text: '' },
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: 'a8bca093-b81f-4a13-b8bd-24b8b2892ced',
      actionTypeId: '.email',
      id: 'notification-email',
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
      uuid: 'a6e14e63-15fd-4949-935d-2759322d8d01',
      actionTypeId: '.index',
      id: 'preconfigured-es-index-action',
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
      uuid: 'feee9ec3-e9ac-4201-b24d-24a6c7d16afc',
      actionTypeId: '.index',
      id: 'preconfigured-es-index-action',
    },
    {
      group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
      params: {
        subAction: 'pushToService',
        subActionParams: {
          incident: {
            short_description:
              '"{{context.monitorName}}" is {{{context.status}}} from {{context.locationName}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- Checked at: {{context.checkedAt}}  \n- From: {{context.locationName}}  \n- Error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
            description:
              '"{{context.monitorName}}" is {{{context.status}}} from {{context.locationName}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- Checked at: {{context.checkedAt}}  \n- From: {{context.locationName}}  \n- Error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
            impact: '2',
            severity: '2',
            urgency: '2',
            category: null,
            subcategory: null,
            externalId: null,
            correlation_id: null,
            correlation_display: null,
          },
          comments: [],
        },
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '27350638-df5c-4c15-9f0b-9aaede3e23ee',
      actionTypeId: '.servicenow',
      id: 'my-deprecated-servicenow',
    },
    {
      group: 'recovered',
      params: {
        message:
          'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationName}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '2d73f370-a90c-4347-8480-753cbeae719f',
      actionTypeId: '.slack',
      id: 'my-slack1',
    },
    {
      group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
      params: {
        message:
          '"{{context.monitorName}}" is {{{context.status}}} from {{context.locationName}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- Checked at: {{context.checkedAt}}  \n- From: {{context.locationName}}  \n- Error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '1c5d0dd1-c360-4e14-8e4f-f24aa5c640c6',
      actionTypeId: '.slack',
      id: 'my-slack1',
    },
  ],
  params: {},
  snoozeSchedule: [],
  updatedAt: '2023-06-30T20:08:20.874Z',
  createdAt: '2023-06-30T20:08:20.874Z',
  scheduledTaskId: 'dbbc39f0-1781-11ee-80b9-6522650f1d50',
  executionStatus: {
    status: 'ok',
    lastExecutionDate: '2023-06-30T20:13:38.014Z',
    lastDuration: 47,
  },
  monitoring: {
    run: {
      history: [
        { duration: 1041, success: true, timestamp: 1688155702964 },
        { duration: 62, success: true, timestamp: 1688155765981 },
        { duration: 60, success: true, timestamp: 1688155828993 },
        { duration: 52, success: true, timestamp: 1688155891997 },
        { duration: 50, success: true, timestamp: 1688155955011 },
        { duration: 47, success: true, timestamp: 1688156018014 },
      ],
      calculated_metrics: { success_ratio: 1, p99: 1041, p50: 56, p95: 1041 },
      last_run: {
        timestamp: '2023-06-30T20:13:38.014Z',
        metrics: {
          duration: 47,
          total_search_duration_ms: null,
          total_indexing_duration_ms: null,
          total_alerts_detected: null,
          total_alerts_created: null,
          gap_duration_s: null,
        },
      },
    },
  },
  nextRun: '2023-06-30T20:14:37.949Z',
  lastRun: {
    outcomeOrder: 0,
    alertsCount: { new: 0, ignored: 0, recovered: 0, active: 0 },
    outcomeMsg: null,
    warning: null,
    outcome: 'succeeded',
  },
  ruleTypeId: 'xpack.synthetics.alerts.monitorStatus',
} as unknown as SanitizedRule;
const tlsRule = {
  id: 'dbbc12e0-1781-11ee-80b9-6522650f1d50',
  notifyWhen: null,
  consumer: 'uptime',
  alertTypeId: 'xpack.synthetics.alerts.tls',
  tags: ['SYNTHETICS_DEFAULT_ALERT'],
  name: 'Synthetics internal TLS rule',
  enabled: true,
  throttle: null,
  apiKeyOwner: 'elastic',
  apiKeyCreatedByUser: false,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  revision: 0,
  running: false,
  schedule: { interval: '1m' },
  actions: [
    {
      group: 'recovered',
      params: {
        body: TlsTranslations.defaultRecoveryMessage,
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '52070ef7-c288-40e7-ae5b-51c7d77463cb',
      actionTypeId: '.webhook',
      id: 'custom.ssl.noCustom',
    },
    {
      group: 'xpack.synthetics.alerts.actionGroups.tls',
      params: {
        body: TlsTranslations.defaultActionMessage,
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '4d003e7b-e37d-47e6-8ee6-2d80b61fa31f',
      actionTypeId: '.webhook',
      id: 'custom.ssl.noCustom',
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
      uuid: 'b5035977-2236-448e-9e2b-6fbbe1cc7678',
      actionTypeId: '.email',
      id: 'notification-email',
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
      uuid: '85b9b6c4-2a61-49cf-aefb-78363167a584',
      actionTypeId: '.email',
      id: 'notification-email',
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
      uuid: 'e7a23561-ee09-45b0-b093-189b51bad918',
      actionTypeId: '.index',
      id: 'preconfigured-es-index-action',
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
      uuid: '2b40e26a-8dd7-4711-897e-95ce1d2ca4f6',
      actionTypeId: '.index',
      id: 'preconfigured-es-index-action',
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
          },
          comments: [],
        },
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '172025b4-4032-4ada-bcfc-ccdc060409ab',
      actionTypeId: '.servicenow',
      id: 'my-deprecated-servicenow',
    },
    {
      group: 'recovered',
      params: {
        message: TlsTranslations.defaultRecoveryMessage,
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '25822900-a030-4e59-b9c7-909ff665a862',
      actionTypeId: '.slack',
      id: 'my-slack1',
    },
    {
      group: 'xpack.synthetics.alerts.actionGroups.tls',
      params: {
        message: TlsTranslations.defaultActionMessage,
      },
      frequency: { notifyWhen: 'onActionGroupChange', throttle: null, summary: false },
      uuid: '07896abe-5ebe-4e7f-95e4-3944e6831843',
      actionTypeId: '.slack',
      id: 'my-slack1',
    },
  ],
  params: {},
  snoozeSchedule: [],
  updatedAt: '2023-06-30T20:08:20.878Z',
  createdAt: '2023-06-30T20:08:20.878Z',
  scheduledTaskId: 'dbbc12e0-1781-11ee-80b9-6522650f1d50',
  executionStatus: {
    status: 'ok',
    lastExecutionDate: '2023-06-30T20:08:22.963Z',
    lastDuration: 1044,
  },
  monitoring: {
    run: {
      history: [{ duration: 1044, success: true, timestamp: 1688155702963 }],
      calculated_metrics: { success_ratio: 1, p99: 1044, p50: 1044, p95: 1044 },
      last_run: {
        timestamp: '2023-06-30T20:08:22.963Z',
        metrics: {
          duration: 1044,
          total_search_duration_ms: null,
          total_indexing_duration_ms: null,
          total_alerts_detected: null,
          total_alerts_created: null,
          gap_duration_s: null,
        },
      },
    },
  },
  nextRun: '2023-06-30T20:18:22.898Z',
  lastRun: {
    outcomeOrder: 0,
    alertsCount: { new: 0, ignored: 0, recovered: 0, active: 0 },
    outcomeMsg: null,
    warning: null,
    outcome: 'succeeded',
  },
  ruleTypeId: 'xpack.synthetics.alerts.tls',
} as unknown as SanitizedRule;
