/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { createRuleAttachmentType } from './rule';

describe('createRuleAttachmentType', () => {
  const rulesClient = { find: jest.fn() };
  const startPlugins = {
    alerting: { getRulesClientWithRequest: jest.fn().mockResolvedValue(rulesClient) },
  };
  const getStartServices = jest.fn().mockResolvedValue([{}, startPlugins, {}]);

  const makeType = () =>
    createRuleAttachmentType({ getStartServices: getStartServices as never });

  const resolveCtx = {
    ...agentBuilderMocks.attachments.createFormatContextMock(),
    savedObjectsClient: { id: 'scoped-so-client' },
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    getStartServices.mockResolvedValue([{}, startPlugins, {}]);
    startPlugins.alerting.getRulesClientWithRequest.mockResolvedValue(rulesClient);
  });

  it('has the rule attachment id', () => {
    expect(makeType().id).toBe('security.rule');
  });

  describe('resolve', () => {
    it('fetches the rule by rule_id and stores it as attachment content', async () => {
      rulesClient.find.mockResolvedValueOnce({
        data: [
          {
            id: 'rule-so-id-1',
            name: 'Resolved Rule',
            enabled: true,
            tags: ['MITRE'],
            schedule: { interval: '5m' },
            params: {
              ruleId: 'static-rule-id',
              description: 'Resolved rule description',
              type: 'query',
              language: 'kuery',
              query: 'process.name:"powershell.exe"',
              index: ['logs-endpoint.events.*'],
              from: 'now-6m',
              investigation_fields: { field_names: ['host.name', 'user.name'] },
            },
            actions: [],
            alertTypeId: 'siem.queryRule',
            apiKeyOwner: null,
            apiKeyCreatedByUser: null,
            artifacts: {
              dashboards: [],
              investigation_guide: { blob: '' },
            },
            consumer: 'siem',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: 'elastic',
            enabledInLicense: true,
            executionStatus: { status: 'ok', lastExecutionDate: new Date() },
            lastRun: { outcome: 'succeeded', alertsCount: {} },
            muteAll: false,
            mutedInstanceIds: [],
            notifyWhen: null,
            producer: 'siem',
            revision: 0,
            ruleTypeId: 'siem.queryRule',
            running: false,
            snoozeSchedule: [],
            scheduledTaskId: 'task-1',
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: 'elastic',
            throttle: null,
            viewInAppRelativeUrl: '',
          },
        ],
        page: 1,
        perPage: 10,
        total: 1,
      });

      const content = await makeType().resolve!('static-rule-id', resolveCtx);

      expect(rulesClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            filter: expect.stringContaining('alert.attributes.params.ruleId: "static-rule-id"'),
          }),
        })
      );
      expect(content).toEqual(
        expect.objectContaining({ origin: 'static-rule-id', attachmentLabel: 'Resolved Rule' })
      );

      const rule = JSON.parse((content as { text: string }).text);
      expect(rule).toEqual(
        expect.objectContaining({
          id: 'rule-so-id-1',
          rule_id: 'static-rule-id',
          query: 'process.name:"powershell.exe"',
          investigation_fields: { field_names: ['host.name', 'user.name'] },
        })
      );
    });

    it('throws when no rule matches the rule_id', async () => {
      rulesClient.find.mockResolvedValueOnce({
        data: [],
        page: 1,
        perPage: 10,
        total: 0,
      });

      await expect(makeType().resolve!('missing-rule-id', resolveCtx)).rejects.toThrow(
        'Rule with rule_id "missing-rule-id" was not found'
      );
    });
  });
});
