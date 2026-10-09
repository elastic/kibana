/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { evaluateKql } from '@kbn/eval-kql';
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
    it('keys alert-triggered runs on the alert, so one alert does not drop the next', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.settings.concurrency.key).toBe('auto-123-{{ trigger.alert.uuid }}');
    });

    it('keys slack-triggered runs on the message', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'slack', event: 'message' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.settings.concurrency.key).toBe(
        'auto-123-{{ event.channel }}-{{ event.messageId }}'
      );
    });

    it('names both payloads in the key for mixed alert and slack rows', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert' }, { kind: 'slack', event: 'message' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.settings.concurrency.key).toBe(
        'auto-123-{{ trigger.alert.uuid }}{{ event.channel }}-{{ event.messageId }}'
      );
    });

    it('keys manual runs on the automation, since there is no payload', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'schedule' }];
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      expect(yaml.settings.concurrency.key).toBe('auto-123');
      expect(yaml.steps[0].with.concurrency_key).toBe('auto-123');
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

    // Evaluates the generated trigger condition against a Slack event, the way the engine does.
    const matches = (
      automation: NightshiftAutomationAttributes,
      event: Record<string, unknown>
    ): boolean => {
      const yaml = parse(generateWorkflowYaml('auto-123', automation));
      return evaluateKql(yaml.triggers[0].on.condition, {
        event: { workspace: 'T1', channel: 'C1', sender: 'U1', text: 'hello', ...event },
      });
    };

    it('emits a slack2.message trigger on the Elastic Slack app connector', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', slackAutomation(slackRow())));
      expect(yaml.triggers).toHaveLength(1);
      expect(yaml.triggers[0]).toMatchObject({
        type: 'slack2.message',
        'connector-id': 'elastic-apps-slack',
      });
    });

    describe('exclusions', () => {
      const automation = slackAutomation(slackRow());

      it('matches a top-level message', () => {
        expect(matches(automation, {})).toBe(true);
      });

      it('excludes thread replies', () => {
        expect(matches(automation, { threadId: '1.1' })).toBe(false);
      });

      it('excludes events without a workspace', () => {
        expect(matches(automation, { workspace: undefined })).toBe(false);
      });

      it('excludes edits and other subtypes', () => {
        expect(matches(automation, { subtype: 'message_changed' })).toBe(false);
      });

      it('allows bot messages and file shares', () => {
        expect(matches(automation, { subtype: 'bot_message' })).toBe(true);
        expect(matches(automation, { subtype: 'file_share' })).toBe(true);
      });
    });

    describe('row filters', () => {
      it('matches only the selected channels', () => {
        const automation = slackAutomation(slackRow({ channels: ['C1', 'C2'] }));
        expect(matches(automation, { channel: 'C2' })).toBe(true);
        expect(matches(automation, { channel: 'C3' })).toBe(false);
      });

      it('matches only the selected users', () => {
        const automation = slackAutomation(slackRow({ users: ['U9'] }));
        expect(matches(automation, { sender: 'U9' })).toBe(true);
        expect(matches(automation, { sender: 'U1' })).toBe(false);
      });

      it('ANDs channels and users within a row', () => {
        const automation = slackAutomation(slackRow({ channels: ['C1'], users: ['U1'] }));
        expect(matches(automation, {})).toBe(true);
        expect(matches(automation, { channel: 'C2' })).toBe(false);
        expect(matches(automation, { sender: 'U2' })).toBe(false);
      });

      it('ORs several rows into one trigger', () => {
        const automation = slackAutomation(
          slackRow({ channels: ['C1'] }),
          slackRow({ users: ['U9'] })
        );
        const yaml = parse(generateWorkflowYaml('auto-123', automation));
        expect(yaml.triggers).toHaveLength(1);
        expect(matches(automation, { channel: 'C1', sender: 'U2' })).toBe(true);
        expect(matches(automation, { channel: 'C2', sender: 'U9' })).toBe(true);
        expect(matches(automation, { channel: 'C2', sender: 'U2' })).toBe(false);
      });

      it('applies no row filter when any row has no filters', () => {
        const automation = slackAutomation(slackRow({ channels: ['C1'] }), slackRow());
        expect(matches(automation, { channel: 'C9' })).toBe(true);
      });

      it('ignores blank values and a whitespace-only message filter', () => {
        const automation = slackAutomation(
          slackRow({ channels: [' ', ''], users: [], messageFilter: '   ' })
        );
        expect(matches(automation, { channel: 'C9', text: 'anything' })).toBe(true);
      });
    });

    describe('message filter', () => {
      const filtered = (messageFilter: string) => slackAutomation(slackRow({ messageFilter }));

      it('matches the phrase anywhere in the message', () => {
        const automation = filtered('production deployment');
        expect(matches(automation, { text: 'the production deployment failed' })).toBe(true);
        expect(matches(automation, { text: 'production deployment' })).toBe(true);
      });

      it('does not match when the words are only scattered through the message', () => {
        expect(
          matches(filtered('production deployment'), {
            text: 'I was in production, it was the staging deployment that was failing',
          })
        ).toBe(false);
      });

      it('requires the words in order', () => {
        expect(matches(filtered('deploy failed'), { text: 'failed deploy' })).toBe(false);
      });

      it('is case sensitive', () => {
        expect(matches(filtered('deploy'), { text: 'the DEPLOY failed' })).toBe(false);
      });

      it.each([
        ['quotes', 'say "hi"'],
        ['parentheses', 'fix (urgent)'],
        ['colons', 'error: timeout'],
        ['asterisks', 'a*b'],
        ['backslashes', 'path\\to'],
        ['braces', '{x}'],
        ['and and or', 'this and that or the other'],
      ])('treats %s in the filter as literal text', (_label, text) => {
        expect(matches(filtered(text), { text: `before ${text} after` })).toBe(true);
        expect(matches(filtered(text), { text: 'unrelated' })).toBe(false);
      });

      it.each([
        ['in the middle', 'was not in production'],
        ['at the start', 'not in production'],
        ['at the end', 'was in production not'],
        ['alone', 'not'],
        ['in capitals', 'was NOT in production'],
        ['repeated', 'not not here'],
      ])('keeps the condition valid when the filter has the word not %s', (_label, text) => {
        expect(matches(filtered(text), { text: `x ${text} y` })).toBe(true);
        expect(matches(filtered(text), { text: 'unrelated' })).toBe(false);
      });

      it('ANDs the filter with the channel and user filters', () => {
        const automation = slackAutomation(
          slackRow({ channels: ['C1'], users: ['U1'], messageFilter: 'deploy' })
        );
        expect(matches(automation, { text: 'a deploy' })).toBe(true);
        expect(matches(automation, { text: 'a deploy', channel: 'C2' })).toBe(false);
        expect(matches(automation, { text: 'a deploy', sender: 'U2' })).toBe(false);
        expect(matches(automation, { text: 'nothing' })).toBe(false);
      });

      it('ignores a whitespace-only filter', () => {
        expect(matches(filtered('   '), { text: 'anything' })).toBe(true);
      });

      it('needs no workflow step, so every run has matched the filter already', () => {
        const yaml = parse(generateWorkflowYaml('auto-123', filtered('disk full')));
        expect(yaml.steps).toHaveLength(1);
        expect(yaml.steps[0].type).toBe('nightshift.triggerInvestigation');
      });
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

    it('uses the alert as concurrency_key in the step for alert triggers', () => {
      const yaml = parse(generateWorkflowYaml('auto-123', baseAutomation()));
      expect(yaml.steps[0].with.concurrency_key).toBe('auto-123-{{ trigger.alert.uuid }}');
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

    describe('for a slack-triggered run', () => {
      const slackAutomationWith = (completion: NightshiftAutomationAttributes['completion']) => {
        const automation = baseAutomation();
        automation.trigger.rows = [{ kind: 'slack', event: 'message' }];
        automation.completion = completion;
        return automation;
      };

      it('replies under the triggering message in thread mode', () => {
        const yaml = parse(
          generateWorkflowYaml(
            'auto-123',
            slackAutomationWith({ action: 'post_to_slack', targetMode: 'thread' })
          )
        );
        expect(yaml.steps[0].with.notificationDestinations).toEqual([
          {
            type: 'slack',
            connector_id: 'elastic-apps-slack',
            params: { channel: '{{ event.channel }}', thread_ts: '{{ event.messageId }}' },
            automation_id: 'auto-123',
            automation_name: 'Test automation',
          },
        ]);
      });

      it('uses the named connector in thread mode', () => {
        const yaml = parse(
          generateWorkflowYaml(
            'auto-123',
            slackAutomationWith({
              action: 'post_to_slack',
              targetMode: 'thread',
              connectorId: 'my-slack',
            })
          )
        );
        expect(yaml.steps[0].with.notificationDestinations[0].connector_id).toBe('my-slack');
      });

      it('still posts to the configured channel in channel mode', () => {
        const yaml = parse(
          generateWorkflowYaml(
            'auto-123',
            slackAutomationWith({
              action: 'post_to_slack',
              targetMode: 'channel',
              destination: '#prod-alerts',
            })
          )
        );
        expect(yaml.steps[0].with.notificationDestinations[0].params).toEqual({
          channel: '#prod-alerts',
        });
      });

      it('gives only the slack step a thread destination in a mixed automation', () => {
        const automation = slackAutomationWith({ action: 'post_to_slack', targetMode: 'thread' });
        automation.trigger.rows = [{ kind: 'alert' }, { kind: 'slack', event: 'message' }];
        const yaml = parse(generateWorkflowYaml('auto-123', automation));
        const [alertGuard, slackGuard] = yaml.steps;
        expect(alertGuard.steps[0].with.notificationDestinations).toBeUndefined();
        expect(slackGuard.steps[0].with.notificationDestinations).toHaveLength(1);
      });
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
        'thread mode on an alert trigger, which has no message to reply to',
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
