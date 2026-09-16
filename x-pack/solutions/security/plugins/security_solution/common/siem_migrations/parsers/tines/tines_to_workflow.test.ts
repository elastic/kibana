/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchema } from '@kbn/workflows';
import {
  EMAIL_CONNECTOR_PLACEHOLDER,
  SLACK_CONNECTOR_PLACEHOLDER,
  TinesToWorkflowMapper,
  convertTriggerRulesToCondition,
} from './tines_to_workflow';
import { TINES_AGENT_TYPES } from './types';
import simpleStory from './mock/simple_story.json';

describe('convertTriggerRulesToCondition', () => {
  it('converts regex rules into KQL conditions', () => {
    const warnings: string[] = [];
    const condition = convertTriggerRulesToCondition(
      [{ type: 'regex', value: 'infection', path: '<<receive_events.type>>' }],
      new Map([['receive_events', 'receive_events']]),
      warnings
    );

    expect(condition).toBe('steps.receive_events.output.type : "infection"');
    expect(warnings).toHaveLength(0);
  });

  it('returns true when no rules are present', () => {
    expect(convertTriggerRulesToCondition(undefined, new Map(), [])).toBe('true');
  });
});

describe('TinesToWorkflowMapper', () => {
  it('maps the Simple story fixture to WorkflowSchema-valid YAML', () => {
    const result = TinesToWorkflowMapper.map(simpleStory);

    expect(result.validation.valid).toBe(true);
    expect(result.validation.errors).toBeUndefined();
    expect(result.yaml).toContain('name: Simple story');
    expect(result.yaml).toContain('type: manual');
    expect(result.yaml).toContain('type: if');
    expect(result.yaml).toContain('type: foreach');
    expect(result.yaml).toContain('type: http');
    expect(result.yaml).toContain('type: email');
    expect(result.yaml).toContain(EMAIL_CONNECTOR_PLACEHOLDER);

    const reparsed = WorkflowSchema.safeParse(result.workflow);
    expect(reparsed.success).toBe(true);
  });

  it('reports mapped agents and webhook gap warnings', () => {
    const { report } = TinesToWorkflowMapper.map(simpleStory);

    expect(report.mapped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentType: TINES_AGENT_TYPES.WEBHOOK,
          elasticType: 'manual',
        }),
        expect.objectContaining({
          stepName: 'type_is_infection',
          elasticType: 'if',
        }),
        expect.objectContaining({
          stepName: 'explode_users',
          elasticType: 'foreach',
        }),
        expect.objectContaining({
          stepName: 'send_a_post_request',
          elasticType: 'http',
        }),
        expect.objectContaining({
          stepName: 'notify_by_email',
          elasticType: 'email',
        }),
      ])
    );
    expect(report.skipped).toHaveLength(0);
    expect(report.warnings.some((warning) => warning.includes('WebhookAgent'))).toBe(true);
    expect(report.warnings.some((warning) => warning.includes(EMAIL_CONNECTOR_PLACEHOLDER))).toBe(
      true
    );
    expect(report.requiredConnectors).toEqual([
      {
        actionTypeId: '.email',
        placeholder: EMAIL_CONNECTOR_PLACEHOLDER,
        stepNames: ['notify_by_email'],
      },
    ]);
  });

  it('nests trigger and explode receivers under control-flow steps', () => {
    const { workflow } = TinesToWorkflowMapper.map(simpleStory);
    const steps = workflow.steps as Array<Record<string, unknown>>;

    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      name: 'type_is_infection',
      type: 'if',
    });

    const infectionChildren = steps[0].steps as Array<Record<string, unknown>>;
    expect(infectionChildren).toHaveLength(1);
    expect(infectionChildren[0]).toMatchObject({
      name: 'explode_users',
      type: 'foreach',
      foreach: '{{ steps.receive_events.output.users }}',
    });

    const explodeChildren = infectionChildren[0].steps as Array<Record<string, unknown>>;
    const childNames = explodeChildren.map((step) => step.name);
    expect(childNames).toEqual(
      expect.arrayContaining(['user_is_ceo', 'user_is_student', 'user_is_engineer'])
    );

    const ceo = explodeChildren.find((step) => step.name === 'user_is_ceo') as Record<
      string,
      unknown
    >;
    expect(ceo.type).toBe('if');
    expect((ceo.steps as Array<Record<string, unknown>>)[0]).toMatchObject({
      name: 'send_a_post_request',
      type: 'http',
    });

    const engineer = explodeChildren.find((step) => step.name === 'user_is_engineer') as Record<
      string,
      unknown
    >;
    expect((engineer.steps as Array<Record<string, unknown>>)[0]).toMatchObject({
      name: 'notify_by_email',
      type: 'email',
      'connector-id': EMAIL_CONNECTOR_PLACEHOLDER,
    });
  });

  it('maps unmapped agent types to console stubs and reports them as skipped', () => {
    const result = TinesToWorkflowMapper.map({
      name: 'Unknown agent story',
      agents: [
        {
          type: 'Agents::WebhookAgent',
          name: 'Receive events',
          guid: 'webhook-guid',
          options: { path: 'hook' },
        },
        {
          type: 'Agents::LLMAgent',
          name: 'Ask the model',
          guid: 'llm-guid',
          options: { prompt: 'hello' },
        },
      ],
      links: [{ source: 0, receiver: 1 }],
    });

    expect(result.validation.valid).toBe(true);
    expect(result.report.skipped).toEqual([
      expect.objectContaining({
        agentName: 'Ask the model',
        agentType: 'Agents::LLMAgent',
        reason: expect.stringContaining('Unsupported Tines agent type'),
      }),
    ]);
    expect(result.yaml).toContain('type: console');
    expect(result.yaml).toContain('Ask the model');
  });

  it('maps SlackAgent with a connector placeholder', () => {
    const result = TinesToWorkflowMapper.map({
      name: 'Slack story',
      agents: [
        {
          type: TINES_AGENT_TYPES.SLACK,
          name: 'Notify slack',
          guid: 'slack-guid',
          options: {
            message: 'Alert: <<source.detail>>',
            channel: '#security',
          },
        },
      ],
    });

    expect(result.validation.valid).toBe(true);
    expect(result.report.mapped).toEqual([
      expect.objectContaining({
        stepName: 'notify_slack',
        elasticType: 'slack',
      }),
    ]);
    expect(result.yaml).toContain('type: slack');
    expect(result.yaml).toContain(SLACK_CONNECTOR_PLACEHOLDER);
    expect(result.report.requiredConnectors).toEqual([
      {
        actionTypeId: '.slack',
        placeholder: SLACK_CONNECTOR_PLACEHOLDER,
        stepNames: ['notify_slack'],
      },
    ]);
  });

  it('returns an empty requiredConnectors list when no email or slack agents exist', () => {
    const result = TinesToWorkflowMapper.map({
      name: 'HTTP only',
      agents: [
        {
          type: TINES_AGENT_TYPES.HTTP_REQUEST,
          name: 'Call API',
          guid: 'http-guid',
          options: { url: 'https://example.com', method: 'GET' },
        },
      ],
    });

    expect(result.report.requiredConnectors).toEqual([]);
  });

  it('skips non-explode EventTransformationAgent modes as unmapped', () => {
    const result = TinesToWorkflowMapper.map({
      name: 'Implode story',
      agents: [
        {
          type: TINES_AGENT_TYPES.EVENT_TRANSFORMATION,
          name: 'Implode events',
          guid: 'implode-guid',
          options: { mode: 'implode', path: '=receive_events.items' },
        },
      ],
    });

    expect(result.validation.valid).toBe(true);
    expect(result.report.skipped).toEqual([
      expect.objectContaining({
        stepName: 'implode_events',
        reason: expect.stringContaining('only explode'),
      }),
    ]);
    expect(result.yaml).toContain('type: console');
  });
});
