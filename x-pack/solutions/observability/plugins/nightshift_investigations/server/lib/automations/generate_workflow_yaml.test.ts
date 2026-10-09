/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateKql } from '@kbn/eval-kql';
import { parse } from 'yaml';
import { generateWorkflowYaml } from './generate_workflow_yaml';
import type { NightshiftAutomationAttributes } from './types';

const baseAutomation = (): NightshiftAutomationAttributes => ({
  name: 'Test automation',
  automationType: 'custom',
  isEnabled: true,
  trigger: { rows: [{ kind: 'alert' }] },
  execution: {},
  completion: {},
  runtime: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('generateWorkflowYaml', () => {
  describe('concurrency settings', () => {
    it('uses automationId as the concurrency key', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.settings.concurrency.key).toBe('auto-123');
    });

    it('defaults to drop strategy when overlapPolicy is not set', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.settings.concurrency.strategy).toBe('drop');
    });

    it('maps cancel_in_progress to cancel-in-progress', () => {
      const automation = baseAutomation();
      automation.runtime.overlapPolicy = 'cancel_in_progress';
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.settings.concurrency.strategy).toBe('cancel-in-progress');
    });

    it('maps queue to queue', () => {
      const automation = baseAutomation();
      automation.runtime.overlapPolicy = 'queue';
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.settings.concurrency.strategy).toBe('queue');
    });
  });

  describe('alert trigger', () => {
    it('emits alerting.alertStatusChanged when alert rows are present', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.triggers[0].type).toBe('alerting.alertStatusChanged');
    });

    it('emits no on.condition when alertStatus is any', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert', alertStatus: 'any' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on).toBeUndefined();
    });

    it('emits no on.condition when alertStatus is omitted', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on).toBeUndefined();
    });

    it('filters by active status', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert', alertStatus: 'active' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on.condition).toBe('alert.status: "active"');
    });

    it('maps inactive to recovered in the KQL condition', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert', alertStatus: 'inactive' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on.condition).toBe('alert.status: "recovered"');
    });

    it('filters by substring rule name pattern', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [
        { kind: 'alert', ruleNamePattern: 'memory', ruleNameMatchMode: 'substring' },
      ];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on.condition).toBe('rule.name: "*memory*"');
    });

    it('omits rule name filter for regex mode', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [
        { kind: 'alert', ruleNamePattern: 'mem.*', ruleNameMatchMode: 'regex' },
      ];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on).toBeUndefined();
    });

    it('filters by a single tag', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert', tags: ['k8s'] }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on.condition).toBe('rule.tags: "k8s"');
    });

    it('OR-joins multiple tags', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert', tags: ['k8s', 'prod'] }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on.condition).toBe('(rule.tags: "k8s" OR rule.tags: "prod")');
    });

    it('AND-joins multiple conditions within a single row', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert', alertStatus: 'active', tags: ['k8s'] }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on.condition).toBe('alert.status: "active" AND rule.tags: "k8s"');
    });

    it('OR-joins multiple alert rows', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [
        { kind: 'alert', alertStatus: 'active' },
        { kind: 'alert', alertStatus: 'inactive' },
      ];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on.condition).toBe(
        '(alert.status: "active") OR (alert.status: "recovered")'
      );
    });

    it('escapes double quotes in user-supplied strings', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert', ruleNamePattern: 'say "hello"' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].on.condition).toBe('rule.name: "*say \\"hello\\"*"');
    });
  });

  describe('slack trigger', () => {
    interface WorkflowStep {
      name: string;
      type: string;
      if?: string;
      with: {
        path: string;
        'workflow-id': string;
        body: Record<string, unknown>;
        inputs: { message: string; investigation_id: string };
      };
    }
    const findStep = (yaml: { steps: WorkflowStep[] }, name: string): WorkflowStep => {
      const step = yaml.steps.find((candidate) => candidate.name === name);
      if (!step) throw new Error(`step ${name} not found`);
      return step;
    };

    type SlackRow = Extract<
      NightshiftAutomationAttributes['trigger']['rows'][number],
      { kind: 'slack' }
    >;
    const slackAutomation = (
      ...rows: Array<Omit<SlackRow, 'kind' | 'event'>>
    ): NightshiftAutomationAttributes => ({
      ...baseAutomation(),
      trigger: {
        rows: (rows.length > 0 ? rows : [{}]).map((row) => ({
          kind: 'slack' as const,
          event: 'message' as const,
          ...row,
        })),
      },
    });
    const conditionOf = (automation: NightshiftAutomationAttributes): string =>
      parse(generateWorkflowYaml('auto-123', automation)).triggers[0].on.condition;
    const matches = (
      automation: NightshiftAutomationAttributes,
      event: Record<string, string>
    ): boolean =>
      evaluateKql(conditionOf(automation), {
        event: { workspace: 'T1', channel: 'C1', messageId: '1.1', ...event },
      });

    it('emits slack2.message on the Elastic Slack app connector for top-level messages', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', slackAutomation()));
      expect(yaml.triggers).toHaveLength(1);
      expect(yaml.triggers[0].type).toBe('slack2.message');
      expect(yaml.triggers[0]['connector-id']).toBe('elastic-apps-slack');
      expect(yaml.triggers[0].on.condition).toBe(
        'event.workspace:* and not event.threadId:* and (not event.subtype:* or event.subtype:bot_message or event.subtype:file_share)'
      );
    });

    it.each([
      ['a top-level message', {}, true],
      ['a bot message', { subtype: 'bot_message', botId: 'B1' }, true],
      ['a thread reply', { threadId: '1.0' }, false],
      ['an edit', { subtype: 'message_changed' }, false],
    ])('matches %s: %s', (_name, event, expected) => {
      expect(matches(slackAutomation(), event)).toBe(expected);
    });

    it.each([
      ['channels', { channels: ['C1', 'C2'] }, { channel: 'C2' }, true],
      ['channels', { channels: ['C1', 'C2'] }, { channel: 'C3' }, false],
      ['users', { users: ['U1'] }, { sender: 'U1' }, true],
      ['users', { users: ['U1'] }, { sender: 'U2' }, false],
    ])('filters by %s', (_name, row, event, expected) => {
      expect(matches(slackAutomation(row), event)).toBe(expected);
    });

    it.each([
      ['outage', 'big outage now', true],
      ['outage', 'all good', false],
      ['say "down"', 'they say "down" again', true],
      ['disk full', 'the disk full alarm', true],
      ['a or b', 'x a or b y', true],
      ['a or b', 'only a', false],
    ])('matches message filter %j against text %j: %s', (messageFilter, text, expected) => {
      expect(matches(slackAutomation({ messageFilter }), { text })).toBe(expected);
    });

    it('OR-joins several slack rows', () => {
      const automation = slackAutomation({ channels: ['C1'] }, { channels: ['C2'] });
      expect(matches(automation, { channel: 'C1' })).toBe(true);
      expect(matches(automation, { channel: 'C2' })).toBe(true);
      expect(matches(automation, { channel: 'C3' })).toBe(false);
    });

    it('keys concurrency per message and keeps the overlap policy strategy', () => {
      const automation = slackAutomation();
      automation.runtime.overlapPolicy = 'queue';
      const { concurrency } = parse(generateWorkflowYaml('auto-123', automation)).settings;
      expect(concurrency.key).toBe('auto-123-{{ event.channel }}-{{ event.messageId }}');
      expect(concurrency.strategy).toBe('queue');
    });

    it('creates the thread investigation once per event, then runs it', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', slackAutomation()));
      const create = findStep(yaml, 'find_or_create_investigation');
      const investigate = findStep(yaml, 'investigate');
      expect(create.type).toBe('kibana.request');
      expect(create.with.path).toBe(
        '/s/{{ workflow.spaceId }}/internal/nightshift/investigations/_slack_thread'
      );
      expect(create.with.body).toEqual({
        workspace: '${{ event.workspace }}',
        channel: '{{ event.channel }}',
        thread_ts: '{{ event.messageId }}',
        text: '${{ event.text }}',
        create: true,
        event_id: '${{ event.correlationKey }}',
        execution_id: '{{ execution.id }}',
      });
      expect(investigate.type).toBe('workflow.execute');
      expect(investigate.if).toBe(
        '${{ steps.find_or_create_investigation.output.duplicate != true }}'
      );
      expect(investigate.with['workflow-id']).toBe('system-nightshift-investigation');
      expect(investigate.with.inputs.investigation_id).toBe(
        '{{ steps.find_or_create_investigation.output.investigation_id }}'
      );
    });

    it.each([
      ['the prompt template when set', 'Look into this.', 'Look into this.'],
      ['a message carrying the Slack text otherwise', undefined, '{{ event.text }}'],
    ])('sends %s', (_name, promptTemplate, expected) => {
      const automation = slackAutomation();
      automation.execution.promptTemplate = promptTemplate;
      const { message } = findStep(
        parse(generateWorkflowYaml('auto-123', automation)),
        'investigate'
      ).with.inputs;
      expect(message).toContain(expected);
    });

    it('keeps the alert trigger when alert rows are also present', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert' }, { kind: 'slack', event: 'message' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].type).toBe('alerting.alertStatusChanged');
    });
  });

  describe('manual trigger fallback', () => {
    it('emits manual trigger when no alert rows are present', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'schedule' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers[0].type).toBe('manual');
    });
  });

  describe('trigger_investigation step', () => {
    it('uses trigger.alert.uuid as subject_id for alert triggers', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.steps[0].with.subject_id).toBe('{{ trigger.alert.uuid }}');
    });

    it('uses trigger.rule.name as title for alert triggers', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.steps[0].with.title).toBe('{{ trigger.rule.name }}');
    });

    it('uses automationId as concurrency_key in the step', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.steps[0].with.concurrency_key).toBe('auto-123');
    });

    it('includes message when promptTemplate is set', () => {
      const automation = baseAutomation();
      automation.execution.promptTemplate = 'Investigate this alert carefully.';
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.steps[0].with.message).toBe('Investigate this alert carefully.');
    });

    it('omits message when promptTemplate is not set', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.steps[0].with.message).toBeUndefined();
    });

    it('copies a Slack channel destination onto the investigation with the default connector', () => {
      const automation = baseAutomation();
      automation.completion = {
        action: 'post_to_slack',
        targetMode: 'channel',
        destination: '#prod-alerts',
      };
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.steps[0].with.notificationDestinations).toEqual([
        {
          type: 'slack',
          connector_id: 'elastic-apps-slack',
          params: { channel: '#prod-alerts' },
          automation_id: 'auto-123',
          automation_name: 'Test automation',
        },
      ]);
    });

    it('uses an explicit Slack connector when the automation names one', () => {
      const automation = baseAutomation();
      automation.completion = {
        action: 'post_to_slack',
        targetMode: 'channel',
        destination: 'C0123456789',
        connectorId: 'my-slack-bot',
      };
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.steps[0].with.notificationDestinations[0]).toEqual(
        expect.objectContaining({
          connector_id: 'my-slack-bot',
          params: { channel: 'C0123456789' },
        })
      );
    });

    it.each([
      ['no completion', {}],
      ['a silent completion', { action: 'silent', targetMode: 'channel', destination: '#x' }],
      ['create_investigation', { action: 'create_investigation', destination: '#x' }],
      [
        'thread mode, which needs the Slack source',
        { action: 'post_to_slack', targetMode: 'thread' },
      ],
      ['channel mode without a destination', { action: 'post_to_slack', targetMode: 'channel' }],
    ] as const)('omits notificationDestinations for %s', (_label, completion) => {
      const automation = baseAutomation();
      automation.completion = { ...completion };
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.steps[0].with.notificationDestinations).toBeUndefined();
    });

    it('does not include execution.id anywhere in the output', () => {
      const raw = generateWorkflowYaml('auto-123', baseAutomation());
      expect(raw).not.toContain('execution.id');
    });
  });
});
