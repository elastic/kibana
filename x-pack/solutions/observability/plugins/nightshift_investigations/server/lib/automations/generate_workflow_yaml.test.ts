/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { generateWorkflowYaml } from './generate_workflow_yaml';
import type { NightshiftAutomationAttributes, NightshiftTriggerRow } from './types';

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

  describe('manual trigger fallback', () => {
    it('emits manual trigger when no alert or slack rows are present', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'schedule' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers).toEqual([{ type: 'manual' }]);
    });
  });

  describe('slack trigger', () => {
    type SlackRow = Extract<NightshiftTriggerRow, { kind: 'slack' }>;
    const slackAutomation = (...rows: SlackRow[]): NightshiftAutomationAttributes => {
      const automation = baseAutomation();
      automation.trigger.rows = rows;
      return automation;
    };
    const slackRow = (overrides: Partial<SlackRow> = {}): SlackRow => ({
      kind: 'slack',
      event: 'message',
      ...overrides,
    });
    const guards =
      'event.text:* and not event.botId:* and not event.threadId:* and (not event.subtype:* or event.subtype:file_share)';

    it('emits a slack2.message trigger on the Elastic Slack app connector', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', slackAutomation(slackRow())));
      expect(yaml.triggers).toEqual([
        {
          type: 'slack2.message',
          'connector-id': 'elastic-apps-slack',
          on: { condition: guards },
        },
      ]);
    });

    it('filters by a single channel', () => {
      const yaml = parse(
        generateWorkflowYaml('auto-123', slackAutomation(slackRow({ channels: ['C1'] })))
      );
      expect(yaml.triggers[0].on.condition).toBe(`${guards} and (event.channel:"C1")`);
    });

    it('ORs multiple channels and ANDs them with users and text', () => {
      const yaml = parse(
        generateWorkflowYaml(
          'auto-123',
          slackAutomation(
            slackRow({ channels: ['C1', 'C2'], users: ['U1'], messageFilter: 'deploy failed' })
          )
        )
      );
      expect(yaml.triggers[0].on.condition).toBe(
        `${guards} and ((event.channel:"C1" or event.channel:"C2") and event.sender:"U1" and event.text:"deploy failed")`
      );
    });

    it('escapes quotes and backslashes in the message filter', () => {
      const yaml = parse(
        generateWorkflowYaml(
          'auto-123',
          slackAutomation(slackRow({ messageFilter: 'say "hi" \\ now' }))
        )
      );
      expect(yaml.triggers[0].on.condition).toContain('event.text:"say \\"hi\\" \\\\ now"');
    });

    it('ignores blank values and a whitespace-only message filter', () => {
      const yaml = parse(
        generateWorkflowYaml(
          'auto-123',
          slackAutomation(slackRow({ channels: [' ', ''], users: [], messageFilter: '   ' }))
        )
      );
      expect(yaml.triggers[0].on.condition).toBe(guards);
    });

    it('merges several slack rows into one trigger with OR-joined rows', () => {
      const yaml = parse(
        generateWorkflowYaml(
          'auto-123',
          slackAutomation(slackRow({ channels: ['C1'] }), slackRow({ users: ['U1'] }))
        )
      );
      expect(yaml.triggers).toHaveLength(1);
      expect(yaml.triggers[0].on.condition).toBe(
        `${guards} and ((event.channel:"C1") or (event.sender:"U1"))`
      );
    });

    it('drops the row filter when any row has no filters', () => {
      const yaml = parse(
        generateWorkflowYaml(
          'auto-123',
          slackAutomation(slackRow({ channels: ['C1'] }), slackRow())
        )
      );
      expect(yaml.triggers[0].on.condition).toBe(guards);
    });

    it('emits both triggers, alert first, for mixed alert and slack rows', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [slackRow(), { kind: 'alert' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers.map((t: { type: string }) => t.type)).toEqual([
        'alerting.alertStatusChanged',
        'slack2.message',
      ]);
    });

    it('emits only the slack trigger for slack and schedule rows', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'schedule' }, slackRow()];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.triggers.map((t: { type: string }) => t.type)).toEqual(['slack2.message']);
    });

    describe('trigger_investigation step', () => {
      it('investigates a manual subject keyed by the message', () => {
        const yaml = parse(generateWorkflowYaml('auto-123', slackAutomation(slackRow())));
        expect(yaml.steps[0].with).toMatchObject({
          subject_type: 'manual',
          subject_id: '{{ event.connectorId }}:{{ event.channel }}:{{ event.messageId }}',
          title: 'Test automation',
        });
      });

      it('puts the slack message in the prompt after the prompt template', () => {
        const automation = slackAutomation(slackRow());
        automation.execution.promptTemplate = 'Look for deploy problems.';
        const yaml = parse(generateWorkflowYaml('auto-123', automation));
        expect(yaml.steps[0].with.message).toBe(
          'Look for deploy problems.\n\nSlack message from {{ event.sender }} in channel {{ event.channel }}:\n\n{{ event.text | truncate: 4000 }}'
        );
      });

      it('still sends the slack message when there is no prompt template', () => {
        const yaml = parse(generateWorkflowYaml('auto-123', slackAutomation(slackRow())));
        expect(yaml.steps[0].with.message).toContain('{{ event.text | truncate: 4000 }}');
      });

      it('emits one step, unguarded, when only slack rows are present', () => {
        const yaml = parse(generateWorkflowYaml('auto-123', slackAutomation(slackRow())));
        expect(yaml.steps).toHaveLength(1);
        expect(yaml.steps[0].type).toBe('nightshift.triggerInvestigation');
      });

      it('guards one step per trigger kind on execution.triggeredBy for mixed rows', () => {
        const automation = baseAutomation();
        automation.trigger.rows = [slackRow(), { kind: 'alert' }];
        const yaml = parse(generateWorkflowYaml('auto-123', automation));

        expect(yaml.steps).toHaveLength(2);
        expect(yaml.steps.map((s: { condition: string }) => s.condition)).toEqual([
          "${{ execution.triggeredBy == 'alerting.alertStatusChanged' }}",
          "${{ execution.triggeredBy == 'slack2.message' }}",
        ]);
        const [alertGuard, slackGuard] = yaml.steps;
        expect(alertGuard.type).toBe('if');
        expect(alertGuard.steps[0].with).toMatchObject({
          subject_type: 'alert',
          subject_id: '{{ trigger.alert.uuid }}',
        });
        expect(slackGuard.steps[0].with).toMatchObject({
          subject_type: 'manual',
          subject_id: '{{ event.connectorId }}:{{ event.channel }}:{{ event.messageId }}',
        });
      });

      it('gives every step in a mixed automation a distinct name', () => {
        const automation = baseAutomation();
        automation.trigger.rows = [slackRow(), { kind: 'alert' }];
        const yaml = parse(generateWorkflowYaml('auto-123', automation));
        const names = yaml.steps.flatMap((s: { name: string; steps: Array<{ name: string }> }) => [
          s.name,
          ...s.steps.map((inner) => inner.name),
        ]);
        expect(new Set(names).size).toBe(names.length);
      });
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
