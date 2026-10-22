/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { evaluateKql } from '@kbn/eval-kql';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { generateWorkflowYaml, SLACK_MESSAGE_TEXT_LIMIT } from './generate_workflow_yaml';
import { MAX_PROMPT_TEMPLATE_LENGTH } from './schemas';
import type { NightshiftAutomationAttributes, NightshiftTriggerRow } from './types';

const baseAutomation = (): NightshiftAutomationAttributes => ({
  name: 'Test automation',
  automationType: 'custom',
  isEnabled: true,
  trigger: { rows: [{ kind: 'alert' }] },
  execution: {},
  completions: [],
  runtime: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('generateWorkflowYaml', () => {
  it.each([
    [{ kind: 'alert' }],
    [{ kind: 'slack', event: 'message' }],
    [{ kind: 'schedule', schedulePreset: 'daily', time: '09:00' }],
    [
      { kind: 'alert' },
      { kind: 'slack', event: 'message' },
      { kind: 'schedule', schedulePreset: 'daily', time: '09:00' },
    ],
  ] as NightshiftTriggerRow[][])(
    'passes the owning automation ID to every investigation branch: %j',
    (...rows) => {
      const automation = baseAutomation();
      automation.trigger.rows = rows;
      const workflow = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      for (const step of workflow.steps) {
        for (const investigation of step.steps ?? [step]) {
          expect(investigation.with.automation_id).toBe('auto-123');
        }
      }
    }
  );

  describe('concurrency settings', () => {
    it('keys alert-triggered runs on the alert, so one alert does not drop the next', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.settings.concurrency.key).toBe('auto-123-{{ event.alert.uuid }}');
    });

    it('keys slack-triggered runs on the message', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'slack', event: 'message' }];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.settings.concurrency.key).toBe(
        'auto-123-{{ event.channel }}-{{ event.messageId }}'
      );
    });

    it('names both payloads in the key for mixed alert and slack rows', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert' }, { kind: 'slack', event: 'message' }];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.settings.concurrency.key).toBe(
        'auto-123-{{ event.alert.uuid }}{{ event.channel }}-{{ event.messageId }}'
      );
    });

    it('keys manual runs on the automation, since there is no payload', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.settings.concurrency.key).toBe('auto-123');
    });

    it('defaults to drop strategy when overlapPolicy is not set', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.settings.concurrency.strategy).toBe('drop');
    });

    it('maps cancel_in_progress to cancel-in-progress', () => {
      const automation = baseAutomation();
      automation.runtime.overlapPolicy = 'cancel_in_progress';
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.settings.concurrency.strategy).toBe('cancel-in-progress');
    });

    it('maps queue to queue', () => {
      const automation = baseAutomation();
      automation.runtime.overlapPolicy = 'queue';
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.settings.concurrency.strategy).toBe('queue');
    });
  });

  describe('service account', () => {
    it('runs as the given account', () => {
      const yaml = parse(
        generateWorkflowYaml({
          automationId: 'auto-123',
          automation: baseAutomation(),
          serviceAccountId: 'kibana/nightshift-automations-default',
        })
      );
      expect(yaml.settings.run_as).toBe('kibana/nightshift-automations-default');
      // The concurrency settings are kept next to it.
      expect(yaml.settings.concurrency).toBeDefined();
    });

    it('is unbound without one', () => {
      expect(
        parse(generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() }))
          .settings.run_as
      ).toBe(undefined);
    });
  });

  describe('alert trigger', () => {
    type AlertRow = Extract<NightshiftTriggerRow, { kind: 'alert' }>;

    it('emits alerting.v1.alertStatusChanged when alert rows are present', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.triggers[0].type).toBe('alerting.v1.alertStatusChanged');
    });

    const alertEvent = (
      overrides: { rule?: Record<string, unknown>; alert?: Record<string, unknown> } = {}
    ) => ({
      event: {
        rule: {
          id: 'rule-1',
          name: 'High CPU usage',
          ruleTypeId: '.es-query',
          ruleTypeName: 'Elasticsearch query',
          tags: ['k8s'],
          ...overrides.rule,
        },
        alert: { uuid: 'alert-1', status: 'active', start: null, ...overrides.alert },
      },
    });

    const alertMatches = (row: AlertRow, event: ReturnType<typeof alertEvent>): boolean => {
      const automation = baseAutomation();
      automation.trigger.rows = [row];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      return evaluateKql(yaml.triggers[0].on.condition, event);
    };

    it('always filters on active alerts', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.triggers[0].on.condition).toBe('event.alert.status: "active"');
      expect(alertMatches({ kind: 'alert' }, alertEvent())).toBe(true);
      expect(alertMatches({ kind: 'alert' }, alertEvent({ alert: { status: 'recovered' } }))).toBe(
        false
      );
    });

    it('filters by substring rule name pattern as an unquoted wildcard', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [{ kind: 'alert', ruleNamePattern: 'cpu' }];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.triggers[0].on.condition).toBe(
        'event.alert.status: "active" AND event.rule.name: *cpu*'
      );
      expect(alertMatches({ kind: 'alert', ruleNamePattern: 'CPU' }, alertEvent())).toBe(true);
      expect(alertMatches({ kind: 'alert', ruleNamePattern: 'disk' }, alertEvent())).toBe(false);
    });

    it('filters by exact rule name and by tag', () => {
      const row: AlertRow = { kind: 'alert', ruleNames: ['Disk full'], tags: ['prod'] };
      expect(alertMatches(row, alertEvent({ rule: { name: 'Disk full', tags: [] } }))).toBe(true);
      expect(alertMatches(row, alertEvent({ rule: { tags: ['prod', 'k8s'] } }))).toBe(true);
      expect(alertMatches(row, alertEvent())).toBe(false);
    });

    it('OR-joins multiple alert rows', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [
        { kind: 'alert', tags: ['k8s'] },
        { kind: 'alert', tags: ['prod'] },
      ];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.triggers[0].on.condition).toBe(
        '(event.alert.status: "active" AND event.rule.tags: "k8s") OR (event.alert.status: "active" AND event.rule.tags: "prod")'
      );
    });

    it('passes the alert to the investigation as context.alerts', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.steps[0].with.context.alerts).toEqual([
        {
          id: '${{ event.alert.uuid }}',
          rule_id: '${{ event.rule.id }}',
          rule_name: '${{ event.rule.name }}',
          rule_type_id: '${{ event.rule.ruleTypeId }}',
          rule_category: '${{ event.rule.ruleTypeName }}',
          status: '${{ event.alert.status }}',
          start:
            '{{ event.alert.start | default: execution.startedAt | date: "%Y-%m-%dT%H:%M:%S.%L%:z" }}',
          rule_tags: '${{ event.rule.tags }}',
        },
      ]);
    });

    it('adds no alert context to manual and scheduled steps', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.steps[0].with).not.toHaveProperty('context');
    });
  });

  describe('manual trigger fallback', () => {
    it('emits a manual trigger when no trigger rows are present', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [];
      expect(
        parse(generateWorkflowYaml({ automationId: 'auto-123', automation })).triggers
      ).toEqual([{ type: 'manual' }]);
    });

    // An alert investigation requires `context.alerts`, which a manual run has none of.
    it('investigates the prompt rather than an alert', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [];
      automation.execution.promptTemplate = 'Review recent service health.';
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.steps[0].with).toMatchObject({
        subject_type: 'manual',
        subject_id: 'auto-123',
        title: 'Test automation',
        message: 'Review recent service health.',
      });
    });
  });

  describe('scheduled triggers', () => {
    const scheduledAutomation = (): NightshiftAutomationAttributes => ({
      ...baseAutomation(),
      trigger: {
        rows: [
          {
            kind: 'schedule',
            schedulePreset: 'daily',
            time: '09:00',
            timezone: 'Europe/Berlin',
            scopeQuery: 'service.name:checkout',
          },
        ],
      },
      execution: { promptTemplate: 'Assess checkout health in the last hour.' },
      runtime: { timeoutSeconds: 120 },
    });

    it('emits a calendar trigger, fresh manual subject, instructions, scope and timeout', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: scheduledAutomation() })
      );
      expect(yaml.triggers).toEqual([
        {
          type: 'scheduled',
          with: {
            rrule: {
              freq: 'DAILY',
              interval: 1,
              tzid: 'Europe/Berlin',
              byhour: [9],
              byminute: [0],
            },
          },
        },
      ]);
      expect(yaml.settings.timeout).toBe('180s');
      expect(yaml.steps[0]).toEqual({
        name: 'trigger_investigation',
        type: 'nightshift.triggerInvestigation',
        with: {
          automation_id: 'auto-123',
          subject_type: 'manual',
          subject_id: 'manual',
          title: 'Test automation',
          summary: 'Test automation',
          trigger_type: 'automatic',
          message: 'Assess checkout health in the last hour.',
          scope_query: 'service.name:checkout',
          timeout_seconds: 120,
        },
      });
    });

    it('isolates scheduled and alert steps when both sources are configured', () => {
      const automation = scheduledAutomation();
      automation.trigger.rows.push({ kind: 'alert' });
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.triggers.map((trigger: { type: string }) => trigger.type)).toEqual([
        'alerting.v1.alertStatusChanged',
        'scheduled',
      ]);
      expect(yaml.steps[0].condition).toBe("${{ execution.triggeredBy == 'scheduled' }}");
      expect(yaml.steps[1].condition).toBe(
        "${{ execution.triggeredBy == 'alerting.v1.alertStatusChanged' }}"
      );
      expect(yaml.steps[1].steps[0].with.subject_type).toBe('alert');
      expect(yaml.steps[1].steps[0].with.scope_query).toBeUndefined();
    });

    it('isolates all three trigger sources and only sends Slack payload to the Slack step', () => {
      const automation = scheduledAutomation();
      automation.trigger.rows.push(
        { kind: 'alert' },
        { kind: 'slack', event: 'message', channels: ['C1'] }
      );
      automation.completions = [{ action: 'post_to_slack', targetMode: 'thread' }];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.triggers.map((trigger: { type: string }) => trigger.type)).toEqual([
        'alerting.v1.alertStatusChanged',
        'slack2.message',
        'scheduled',
      ]);
      expect(yaml.steps.map((step: { condition: string }) => step.condition)).toEqual([
        "${{ execution.triggeredBy == 'scheduled' }}",
        "${{ execution.triggeredBy == 'alerting.v1.alertStatusChanged' }}",
        "${{ execution.triggeredBy == 'slack2.message' }}",
      ]);
      const [scheduled, alert, slack] = yaml.steps.map(
        (guard: { steps: Array<{ name: string; with: Record<string, string> }> }) => guard.steps[0]
      );
      expect(new Set([scheduled.name, alert.name, slack.name]).size).toBe(3);
      expect(scheduled.with).toMatchObject({
        subject_type: 'manual',
        subject_id: 'manual',
        timeout_seconds: 120,
      });
      expect(alert.with).toMatchObject({
        subject_type: 'alert',
        subject_id: '{{ event.alert.uuid }}',
        timeout_seconds: 120,
      });
      expect(slack.with).toMatchObject({ subject_type: 'slack_thread', timeout_seconds: 120 });
      expect(scheduled.with.message).not.toContain('event.text');
      expect(alert.with.message).not.toContain('event.text');
      expect(slack.with.message).toContain('{{ event.text | truncate: 4000 }}');
      expect(scheduled.with.slack_thread).toBeUndefined();
      expect(alert.with.slack_thread).toBeUndefined();
      expect(slack.with.slack_thread).toEqual({
        workspace: '{{ event.workspace }}',
        channel: '{{ event.channel }}',
        thread_ts: '{{ event.messageId }}',
        external_conversation_id: '{{ event.externalConversationId }}',
      });
      expect(scheduled.with.notificationDestinations).toBeUndefined();
      expect(alert.with.notificationDestinations).toBeUndefined();
      expect(slack.with.notificationDestinations).toEqual([
        expect.objectContaining({
          params: { channel: '{{ event.channel }}', thread_ts: '{{ event.messageId }}' },
        }),
      ]);
    });

    it('preserves the disabled state', () => {
      expect(
        parse(
          generateWorkflowYaml({
            automationId: 'auto-123',
            automation: { ...scheduledAutomation(), isEnabled: false },
          })
        ).enabled
      ).toBe(false);
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
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      return evaluateKql(yaml.triggers[0].on.condition, {
        event: { workspace: 'T1', channel: 'C1', sender: 'U1', text: 'hello', ...event },
      });
    };

    it('leaves room in the step message limit for the largest template plus the Slack text', () => {
      const headingAllowance = 200;
      expect(
        MAX_PROMPT_TEMPLATE_LENGTH + headingAllowance + SLACK_MESSAGE_TEXT_LIMIT
      ).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
    });

    it('emits a slack2.message trigger on the Elastic Slack app connector', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: slackAutomation(slackRow()) })
      );
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

      it.each([
        ['app id', { appId: 'A1' }, true],
        ['bot id', { botId: 'B1' }, true],
        ['bot name', { botName: 'PagerDuty' }, true],
        ['another bot', { botName: 'Datadog', appId: 'A9' }, false],
        ['a person', {}, false],
      ])('matches a post from %s only when it is selected', (_name, event, expected) => {
        const automation = slackAutomation(slackRow({ bots: ['A1', 'B1', 'PagerDuty'] }));
        expect(matches(automation, event)).toBe(expected);
      });

      it('rejects Slack filters longer than a trigger condition allows', () => {
        const bots = Array.from({ length: 30 }, (_, i) => `A${String(i).padStart(10, '0')}`);
        const automation = slackAutomation(slackRow({ bots }));
        expect(() => generateWorkflowYaml({ automationId: 'auto-123', automation })).toThrow(
          'too long'
        );
      });

      it('quotes bot values so KQL syntax in a name stays literal', () => {
        const automation = slackAutomation(slackRow({ bots: ['Ops "bot" or *'] }));
        expect(matches(automation, { botName: 'Ops "bot" or *' })).toBe(true);
        expect(matches(automation, { botName: 'Ops bot' })).toBe(false);
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
        const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
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
        ['"not" ending a word', 'cannot connect'],
        ['"not" as a word', 'do not touch'],
        ['"not" in capitals', 'DO NOT touch'],
        ['"not" at the start', 'not healthy'],
        ['"not" in the middle of a word', 'knot tie'],
        ['tabs and non-breaking spaces', 'a\tb c'],
      ])('treats %s in the filter as literal text', (_label, text) => {
        expect(matches(filtered(text), { text: `before ${text} after` })).toBe(true);
        expect(matches(filtered(text), { text: 'unrelated' })).toBe(false);
      });

      it('keeps the words around "not" together and in order', () => {
        const automation = filtered('not healthy');
        expect(matches(automation, { text: 'the pod is not healthy' })).toBe(true);
        expect(matches(automation, { text: 'healthy, not ready' })).toBe(false);
        expect(matches(automation, { text: 'healthy not' })).toBe(false);
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
        const yaml = parse(
          generateWorkflowYaml({ automationId: 'auto-123', automation: filtered('disk full') })
        );
        expect(yaml.steps).toHaveLength(1);
        expect(yaml.steps[0].type).toBe('nightshift.triggerInvestigation');
      });
    });

    it('emits both triggers, alert first, for mixed alert and slack rows', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [slackRow(), { kind: 'alert' }];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.triggers.map((t: { type: string }) => t.type)).toEqual([
        'alerting.v1.alertStatusChanged',
        'slack2.message',
      ]);
    });

    it('emits both slack and scheduled triggers for mixed rows', () => {
      const automation = baseAutomation();
      automation.trigger.rows = [
        { kind: 'schedule', schedulePreset: 'daily', time: '09:00' },
        slackRow(),
      ];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.triggers.map((t: { type: string }) => t.type)).toEqual([
        'slack2.message',
        'scheduled',
      ]);
    });

    describe('trigger_investigation step', () => {
      it.each<[string, NightshiftAutomationAttributes['completions']]>([
        ['reports in the thread', [{ action: 'post_to_slack', targetMode: 'thread' }]],
        ['reports nowhere', []],
        [
          'reports in another channel',
          [{ action: 'post_to_slack', targetMode: 'channel', destination: '#prod-alerts' }],
        ],
      ])(
        "investigates the message's thread, keyed by the Relay's key, when the automation %s",
        (_, completions) => {
          const automation = slackAutomation(slackRow());
          automation.completions = completions;
          const { with: input } = parse(
            generateWorkflowYaml({ automationId: 'auto-123', automation })
          ).steps[0];
          expect(input).toMatchObject({
            subject_type: 'slack_thread',
            title: 'Test automation',
            slack_thread: {
              workspace: '{{ event.workspace }}',
              channel: '{{ event.channel }}',
              thread_ts: '{{ event.messageId }}',
              external_conversation_id: '{{ event.externalConversationId }}',
            },
          });
          expect(input).not.toHaveProperty('subject_id');
        }
      );

      it('puts the slack message in the prompt after the prompt template', () => {
        const automation = slackAutomation(slackRow());
        automation.execution.promptTemplate = 'Look for deploy problems.';
        const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
        expect(yaml.steps[0].with.message).toBe(
          'Look for deploy problems.\n\nSlack message from {{ event.botName | default: event.sender | default: event.botId }} in channel {{ event.channel }}:\n\n{{ event.text | truncate: 4000 }}'
        );
      });

      it('still sends the slack message when there is no prompt template', () => {
        const yaml = parse(
          generateWorkflowYaml({
            automationId: 'auto-123',
            automation: slackAutomation(slackRow()),
          })
        );
        expect(yaml.steps[0].with.message).toContain('{{ event.text | truncate: 4000 }}');
      });

      it('emits one step, unguarded, when only slack rows are present', () => {
        const yaml = parse(
          generateWorkflowYaml({
            automationId: 'auto-123',
            automation: slackAutomation(slackRow()),
          })
        );
        expect(yaml.steps).toHaveLength(1);
        expect(yaml.steps[0].type).toBe('nightshift.triggerInvestigation');
      });

      it('guards one step per trigger kind on execution.triggeredBy for mixed rows', () => {
        const automation = baseAutomation();
        automation.trigger.rows = [slackRow(), { kind: 'alert' }];
        const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));

        expect(yaml.steps).toHaveLength(2);
        expect(yaml.steps.map((s: { condition: string }) => s.condition)).toEqual([
          "${{ execution.triggeredBy == 'alerting.v1.alertStatusChanged' }}",
          "${{ execution.triggeredBy == 'slack2.message' }}",
        ]);
        const [alertGuard, slackGuard] = yaml.steps;
        expect(alertGuard.type).toBe('if');
        expect(alertGuard.steps[0].with).toMatchObject({
          subject_type: 'alert',
          subject_id: '{{ event.alert.uuid }}',
        });
        expect(slackGuard.steps[0].with).toMatchObject({ subject_type: 'slack_thread' });
        expect(slackGuard.steps[0].with).not.toHaveProperty('subject_id');
      });

      it('gives every step in a mixed automation a distinct name', () => {
        const automation = baseAutomation();
        automation.trigger.rows = [slackRow(), { kind: 'alert' }];
        const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
        const names = yaml.steps.flatMap((s: { name: string; steps: Array<{ name: string }> }) => [
          s.name,
          ...s.steps.map((inner) => inner.name),
        ]);
        expect(new Set(names).size).toBe(names.length);
      });
    });
  });

  describe('trigger_investigation step', () => {
    it('uses event.alert.uuid as subject_id for alert triggers', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.steps[0].with.subject_id).toBe('{{ event.alert.uuid }}');
    });

    it('uses event.rule.name as title for alert triggers', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.steps[0].with.title).toBe('{{ event.rule.name }}');
    });

    it('passes no concurrency_key to the step, which matches investigations by subject', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.steps[0].with).not.toHaveProperty('concurrency_key');
    });

    it('includes message when promptTemplate is set', () => {
      const automation = baseAutomation();
      automation.execution.promptTemplate = 'Investigate this alert carefully.';
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.steps[0].with.message).toBe('Investigate this alert carefully.');
    });

    it('omits message when promptTemplate is not set', () => {
      const yaml = parse(
        generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() })
      );
      expect(yaml.steps[0].with.message).toBeUndefined();
    });

    it('copies a Slack channel destination onto the investigation with the default connector', () => {
      const automation = baseAutomation();
      automation.completions = [
        {
          action: 'post_to_slack',
          targetMode: 'channel',
          destination: '#prod-alerts',
        },
      ];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
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
      const slackAutomationWith = (
        completion: NightshiftAutomationAttributes['completions'][number]
      ) => {
        const automation = baseAutomation();
        automation.trigger.rows = [{ kind: 'slack', event: 'message' }];
        automation.completions = [completion];
        return automation;
      };

      it('replies under the triggering message in thread mode', () => {
        const yaml = parse(
          generateWorkflowYaml({
            automationId: 'auto-123',
            automation: slackAutomationWith({ action: 'post_to_slack', targetMode: 'thread' }),
          })
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
          generateWorkflowYaml({
            automationId: 'auto-123',
            automation: slackAutomationWith({
              action: 'post_to_slack',
              targetMode: 'thread',
              connectorId: 'my-slack',
            }),
          })
        );
        expect(yaml.steps[0].with.notificationDestinations[0].connector_id).toBe('my-slack');
      });

      it('still posts to the configured channel in channel mode', () => {
        const yaml = parse(
          generateWorkflowYaml({
            automationId: 'auto-123',
            automation: slackAutomationWith({
              action: 'post_to_slack',
              targetMode: 'channel',
              destination: '#prod-alerts',
            }),
          })
        );
        expect(yaml.steps[0].with.notificationDestinations[0].params).toEqual({
          channel: '#prod-alerts',
        });
      });

      it('gives only the slack step a thread destination in a mixed automation', () => {
        const automation = slackAutomationWith({ action: 'post_to_slack', targetMode: 'thread' });
        automation.trigger.rows = [{ kind: 'alert' }, { kind: 'slack', event: 'message' }];
        const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
        const [alertGuard, slackGuard] = yaml.steps;
        expect(alertGuard.steps[0].with.notificationDestinations).toBeUndefined();
        expect(slackGuard.steps[0].with.notificationDestinations).toHaveLength(1);
      });
    });

    it('uses an explicit Slack connector when the automation names one', () => {
      const automation = baseAutomation();
      automation.completions = [
        {
          action: 'post_to_slack',
          targetMode: 'channel',
          destination: 'C0123456789',
          connectorId: 'my-slack-bot',
        },
      ];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.steps[0].with.notificationDestinations[0]).toEqual(
        expect.objectContaining({
          connector_id: 'my-slack-bot',
          params: { channel: 'C0123456789' },
        })
      );
    });

    it('copies every channel completion and skips other actions and target modes', () => {
      const automation = baseAutomation();
      automation.completions = [
        { action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' },
        { action: 'silent' },
        { action: 'post_to_slack', targetMode: 'thread' },
        {
          action: 'post_to_slack',
          targetMode: 'channel',
          destination: 'C123',
          connectorId: 'slack',
        },
      ];

      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.steps[0].with.notificationDestinations).toEqual([
        {
          type: 'slack',
          connector_id: 'elastic-apps-slack',
          params: { channel: '#oncall' },
          automation_id: 'auto-123',
          automation_name: 'Test automation',
        },
        {
          type: 'slack',
          connector_id: 'slack',
          params: { channel: 'C123' },
          automation_id: 'auto-123',
          automation_name: 'Test automation',
        },
      ]);
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
      automation.completions = [{ ...completion }];
      const yaml = parse(generateWorkflowYaml({ automationId: 'auto-123', automation }));
      expect(yaml.steps[0].with.notificationDestinations).toBeUndefined();
    });

    it('does not include execution.id anywhere in the output', () => {
      const raw = generateWorkflowYaml({ automationId: 'auto-123', automation: baseAutomation() });
      expect(raw).not.toContain('execution.id');
    });
  });
});
