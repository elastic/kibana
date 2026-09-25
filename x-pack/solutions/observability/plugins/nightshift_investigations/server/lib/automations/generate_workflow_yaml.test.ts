/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

    it('does not include execution.id anywhere in the output', () => {
      const raw = generateWorkflowYaml('auto-123', baseAutomation());
      expect(raw).not.toContain('execution.id');
    });
  });
});
