/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchema } from '@kbn/workflows';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import { getTopologicalAgentOrder } from './graph';
import { TinesStoryParser } from './story_json';
import { convertTinesPathReference, convertTinesTemplate } from './template';
import { TINES_AGENT_TYPES } from './types';
import type { ParsedTinesAgent, ParsedTinesStory, TinesTriggerRule } from './types';

/** Placeholder connector id — replace before importing the workflow into Kibana. */
export const EMAIL_CONNECTOR_PLACEHOLDER = '__EMAIL_CONNECTOR_ID__';
/** Placeholder connector id — replace before importing the workflow into Kibana. */
export const SLACK_CONNECTOR_PLACEHOLDER = '__SLACK_CONNECTOR_ID__';

export type WorkflowConnectorActionTypeId = '.email' | '.slack';

export interface RequiredConnector {
  actionTypeId: WorkflowConnectorActionTypeId;
  placeholder: string;
  stepNames: string[];
}

export interface MigrationReportMappedEntry {
  agentName: string;
  agentType: string;
  stepName: string;
  elasticType: string;
}

export interface MigrationReportSkippedEntry {
  agentName: string;
  agentType: string;
  stepName: string;
  reason: string;
}

export interface MigrationReport {
  mapped: MigrationReportMappedEntry[];
  skipped: MigrationReportSkippedEntry[];
  warnings: string[];
  requiredConnectors: RequiredConnector[];
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface TinesToWorkflowResult {
  workflow: Record<string, unknown>;
  yaml: string;
  report: MigrationReport;
  validation: WorkflowValidationResult;
}

type WorkflowStep = Record<string, unknown>;

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const isEnabled = (agent: ParsedTinesAgent): boolean => agent.disabled !== true;

const isWebhook = (agent: ParsedTinesAgent): boolean => agent.type === TINES_AGENT_TYPES.WEBHOOK;

const buildAgentNameToStepName = (agents: ParsedTinesAgent[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const agent of agents) {
    map.set(agent.name, agent.stepName);
    map.set(agent.stepName, agent.stepName);
  }
  return map;
};

const convertTemplateValue = (
  value: unknown,
  agentNameToStepName: ReadonlyMap<string, string>,
  warnings: string[]
): unknown => {
  if (typeof value === 'string') {
    return convertTinesTemplate(value, agentNameToStepName, warnings);
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertTemplateValue(item, agentNameToStepName, warnings));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = convertTemplateValue(nested, agentNameToStepName, warnings);
    }
    return result;
  }
  return value;
};

/**
 * Converts a Tines `<<agent.field>>` path into a KQL field reference
 * (`steps.agent.output.field`) for `if` conditions.
 */
const convertPathToKqlField = (
  path: string,
  agentNameToStepName: ReadonlyMap<string, string>,
  warnings: string[]
): string => {
  const liquid = convertTinesTemplate(path, agentNameToStepName, warnings).trim();
  const withoutBraces = liquid.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim();
  return withoutBraces.length > 0 ? withoutBraces : path;
};

const escapeKqlLiteral = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Best-effort conversion of Tines TriggerAgent rules into a KQL condition string.
 */
export const convertTriggerRulesToCondition = (
  rules: TinesTriggerRule[] | undefined,
  agentNameToStepName: ReadonlyMap<string, string>,
  warnings: string[]
): string => {
  if (!rules || rules.length === 0) {
    return 'true';
  }

  return rules
    .map((rule) => {
      const field = convertPathToKqlField(rule.path ?? '', agentNameToStepName, warnings);
      const value = rule.value ?? '';
      const escaped = escapeKqlLiteral(value);

      if (rule.type === 'regex') {
        // Simple literal patterns become exact matches; otherwise approximate with wildcards.
        if (/^[a-zA-Z0-9_-]+$/.test(value)) {
          return `${field} : "${escaped}"`;
        }
        return `${field} : *${escaped}*`;
      }

      return `${field} : "${escaped}"`;
    })
    .join(' and ');
};

const normalizeHttpMethod = (method: string | undefined): string => {
  const normalized = (method ?? 'GET').toUpperCase();
  return HTTP_METHODS.has(normalized) ? normalized : 'GET';
};

const createConsoleStub = (name: string, message: string): WorkflowStep => ({
  name,
  type: 'console',
  with: { message },
});

const splitRecipients = (recipients: string | undefined): string[] => {
  if (!recipients || recipients.trim().length === 0) {
    return ['__REPLACE_WITH_RECIPIENT__'];
  }
  return recipients
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

/**
 * Maps a parsed (or raw) Tines story export to Elastic Workflows YAML with a migration report.
 */
export class TinesToWorkflowMapper {
  public static map(input: ParsedTinesStory | unknown): TinesToWorkflowResult {
    const story =
      input !== null &&
      typeof input === 'object' &&
      'agents' in input &&
      Array.isArray((input as ParsedTinesStory).agents) &&
      (input as ParsedTinesStory).agents[0] !== undefined &&
      'stepName' in (input as ParsedTinesStory).agents[0]
        ? (input as ParsedTinesStory)
        : TinesStoryParser.parse(input);

    return TinesToWorkflowMapper.fromParsedStory(story);
  }

  public static fromParsedStory(story: ParsedTinesStory): TinesToWorkflowResult {
    const report: MigrationReport = {
      mapped: [],
      skipped: [],
      warnings: [],
      requiredConnectors: [],
    };
    const emailStepNames: string[] = [];
    const slackStepNames: string[] = [];

    const enabledAgents = story.agents.filter(isEnabled);
    const enabledIndexes = new Set(enabledAgents.map((agent) => agent.index));
    const agentsByIndex = new Map(story.agents.map((agent) => [agent.index, agent]));
    const agentNameToStepName = buildAgentNameToStepName(story.agents);

    const triggers: Array<Record<string, unknown>> = [{ type: 'manual' }];

    const webhookAgents = enabledAgents.filter(isWebhook);
    if (webhookAgents.length > 0) {
      for (const webhook of webhookAgents) {
        report.mapped.push({
          agentName: webhook.name,
          agentType: webhook.type,
          stepName: webhook.stepName,
          elasticType: 'manual',
        });
      }
      report.warnings.push(
        'Tines WebhookAgent inbound webhooks are not supported in Elastic Workflows yet; using a manual trigger. Provide the former webhook payload as workflow inputs when running.'
      );
    } else {
      report.warnings.push(
        'No Tines WebhookAgent entry point found; defaulting to a manual trigger.'
      );
    }

    // Agents reached from a non-webhook enabled agent are nested under that parent.
    const nestedReceivers = new Set<number>();
    for (const agent of enabledAgents) {
      if (isWebhook(agent)) {
        continue;
      }
      for (const receiver of agent.outgoingLinks) {
        if (enabledIndexes.has(receiver) && !isWebhook(agentsByIndex.get(receiver)!)) {
          nestedReceivers.add(receiver);
        }
      }
    }

    const topLevelIndexes = enabledAgents
      .filter((agent) => !isWebhook(agent) && !nestedReceivers.has(agent.index))
      .map((agent) => agent.index);

    const topologicalOrder = getTopologicalAgentOrder(enabledAgents, story.links);
    const orderRank = new Map(topologicalOrder.map((index, rank) => [index, rank]));
    topLevelIndexes.sort((a, b) => (orderRank.get(a) ?? 0) - (orderRank.get(b) ?? 0));

    const visited = new Set<number>();

    const mapUnmappedAgent = (agent: ParsedTinesAgent, reason: string): WorkflowStep => {
      report.skipped.push({
        agentName: agent.name,
        agentType: agent.type,
        stepName: agent.stepName,
        reason,
      });
      return createConsoleStub(
        agent.stepName,
        `Skipped unmapped Tines agent "${agent.name}" (${agent.type}): ${reason}`
      );
    };

    const mapOutgoing = (agent: ParsedTinesAgent): WorkflowStep[] => {
      const steps: WorkflowStep[] = [];
      for (const receiver of agent.outgoingLinks) {
        if (!enabledIndexes.has(receiver)) {
          continue;
        }
        const child = agentsByIndex.get(receiver);
        if (!child || isWebhook(child)) {
          continue;
        }
        steps.push(...mapAgent(receiver));
      }
      return steps;
    };

    const mapAgent = (index: number): WorkflowStep[] => {
      const agent = agentsByIndex.get(index);
      if (!agent || !isEnabled(agent) || isWebhook(agent)) {
        return [];
      }

      if (visited.has(index)) {
        report.warnings.push(
          `Agent "${agent.name}" is reachable from multiple parents; duplicate path omitted to keep the workflow a tree.`
        );
        return [];
      }
      visited.add(index);

      switch (agent.type) {
        case TINES_AGENT_TYPES.TRIGGER: {
          report.mapped.push({
            agentName: agent.name,
            agentType: agent.type,
            stepName: agent.stepName,
            elasticType: 'if',
          });
          const childSteps = mapOutgoing(agent);
          if (childSteps.length === 0) {
            childSteps.push(
              createConsoleStub(
                `${agent.stepName}_matched`,
                `Tines trigger "${agent.name}" matched; no downstream agents were linked.`
              )
            );
          }
          return [
            {
              name: agent.stepName,
              type: 'if',
              condition: convertTriggerRulesToCondition(
                agent.options?.rules,
                agentNameToStepName,
                report.warnings
              ),
              steps: childSteps,
            },
          ];
        }
        case TINES_AGENT_TYPES.EVENT_TRANSFORMATION: {
          if (agent.options?.mode !== 'explode') {
            return [
              mapUnmappedAgent(
                agent,
                `EventTransformationAgent mode "${agent.options?.mode ?? 'unknown'}" is not supported (only explode)`
              ),
              ...mapOutgoing(agent),
            ];
          }

          report.mapped.push({
            agentName: agent.name,
            agentType: agent.type,
            stepName: agent.stepName,
            elasticType: 'foreach',
          });

          const foreachPath = convertTinesPathReference(
            typeof agent.options?.path === 'string' ? agent.options.path : '',
            agentNameToStepName
          );
          if (typeof agent.options?.to === 'string' && agent.options.to.length > 0) {
            report.warnings.push(
              `EventTransformationAgent "${agent.name}" uses to="${agent.options.to}"; foreach items are available as foreach.item (Tines template refs to ${agent.stepName}.${agent.options.to}.* may need manual adjustment).`
            );
          }

          const childSteps = mapOutgoing(agent);
          if (childSteps.length === 0) {
            childSteps.push(
              createConsoleStub(
                `${agent.stepName}_item`,
                `Tines explode "${agent.name}" produced an item; no downstream agents were linked.`
              )
            );
          }

          return [
            {
              name: agent.stepName,
              type: 'foreach',
              foreach: foreachPath,
              steps: childSteps,
            },
          ];
        }
        case TINES_AGENT_TYPES.HTTP_REQUEST: {
          report.mapped.push({
            agentName: agent.name,
            agentType: agent.type,
            stepName: agent.stepName,
            elasticType: 'http',
          });
          return [mapHttpAgent(agent, agentNameToStepName, report.warnings), ...mapOutgoing(agent)];
        }
        case TINES_AGENT_TYPES.EMAIL: {
          report.mapped.push({
            agentName: agent.name,
            agentType: agent.type,
            stepName: agent.stepName,
            elasticType: 'email',
          });
          emailStepNames.push(agent.stepName);
          report.warnings.push(
            `EmailAgent "${agent.name}" requires replacing connector-id placeholder ${EMAIL_CONNECTOR_PLACEHOLDER} with a configured email connector.`
          );
          return [
            mapEmailAgent(agent, agentNameToStepName, report.warnings),
            ...mapOutgoing(agent),
          ];
        }
        case TINES_AGENT_TYPES.SLACK: {
          report.mapped.push({
            agentName: agent.name,
            agentType: agent.type,
            stepName: agent.stepName,
            elasticType: 'slack',
          });
          slackStepNames.push(agent.stepName);
          report.warnings.push(
            `SlackAgent "${agent.name}" requires replacing connector-id placeholder ${SLACK_CONNECTOR_PLACEHOLDER} with a configured Slack connector.`
          );
          return [
            mapSlackAgent(agent, agentNameToStepName, report.warnings),
            ...mapOutgoing(agent),
          ];
        }
        default:
          return [
            mapUnmappedAgent(agent, `Unsupported Tines agent type: ${agent.type}`),
            ...mapOutgoing(agent),
          ];
      }
    };

    const steps: WorkflowStep[] = [];
    for (const index of topLevelIndexes) {
      steps.push(...mapAgent(index));
    }

    if (steps.length === 0) {
      steps.push(
        createConsoleStub(
          'no_mapped_steps',
          'No mappable Tines agents were found in this story export.'
        )
      );
      report.warnings.push('Workflow contains no mapped steps; inserted a console placeholder.');
    }

    if (emailStepNames.length > 0) {
      report.requiredConnectors.push({
        actionTypeId: '.email',
        placeholder: EMAIL_CONNECTOR_PLACEHOLDER,
        stepNames: emailStepNames,
      });
    }
    if (slackStepNames.length > 0) {
      report.requiredConnectors.push({
        actionTypeId: '.slack',
        placeholder: SLACK_CONNECTOR_PLACEHOLDER,
        stepNames: slackStepNames,
      });
    }

    const workflowDefinition: Record<string, unknown> = {
      version: '1',
      name: story.name,
      description: story.description || undefined,
      enabled: true,
      tags: story.tags.length > 0 ? story.tags : undefined,
      triggers,
      steps,
    };

    // Drop undefined optional fields for cleaner YAML.
    if (workflowDefinition.description === undefined) {
      delete workflowDefinition.description;
    }
    if (workflowDefinition.tags === undefined) {
      delete workflowDefinition.tags;
    }

    // WorkflowSchema validates the envelope and top-level step shapes. Nested
    // if/foreach bodies use BaseStepSchema in this schema, so parsed output would
    // strip nested fields / connector-id — always stringify the generated definition.
    const parsed = WorkflowSchema.safeParse(workflowDefinition);
    const validation: WorkflowValidationResult = parsed.success
      ? { valid: true }
      : {
          valid: false,
          errors: parsed.error.issues.map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`
          ),
        };

    return {
      workflow: workflowDefinition,
      yaml: stringifyWorkflowDefinition(workflowDefinition),
      report,
      validation,
    };
  }
}

const mapHttpAgent = (
  agent: ParsedTinesAgent,
  agentNameToStepName: ReadonlyMap<string, string>,
  warnings: string[]
): WorkflowStep => {
  const options = agent.options ?? {};
  const withBlock: Record<string, unknown> = {
    url:
      typeof options.url === 'string'
        ? convertTinesTemplate(options.url, agentNameToStepName, warnings)
        : '',
    method: normalizeHttpMethod(typeof options.method === 'string' ? options.method : undefined),
  };

  if (options.payload !== undefined) {
    withBlock.body = convertTemplateValue(options.payload, agentNameToStepName, warnings);
  } else if (typeof options.body === 'string') {
    withBlock.body = convertTinesTemplate(options.body, agentNameToStepName, warnings);
  }

  if (typeof options.content_type === 'string' && options.content_type.length > 0) {
    const contentType =
      options.content_type.toLowerCase() === 'json'
        ? 'application/json'
        : options.content_type;
    withBlock.headers = {
      'Content-Type': contentType,
    };
  }

  return {
    name: agent.stepName,
    type: 'http',
    with: withBlock,
  };
};

const mapEmailAgent = (
  agent: ParsedTinesAgent,
  agentNameToStepName: ReadonlyMap<string, string>,
  warnings: string[]
): WorkflowStep => {
  const options = agent.options ?? {};
  const body =
    typeof options.body === 'string'
      ? convertTinesTemplate(options.body, agentNameToStepName, warnings)
      : '';
  const subject =
    typeof options.subject === 'string'
      ? convertTinesTemplate(options.subject, agentNameToStepName, warnings)
      : agent.name;

  const withBlock: Record<string, unknown> = {
    to: splitRecipients(typeof options.recipients === 'string' ? options.recipients : undefined),
    subject,
    message: body,
  };

  if (/<[a-z][\s\S]*>/i.test(body)) {
    withBlock.messageHTML = body;
  }

  return {
    name: agent.stepName,
    type: 'email',
    'connector-id': EMAIL_CONNECTOR_PLACEHOLDER,
    with: withBlock,
  };
};

const mapSlackAgent = (
  agent: ParsedTinesAgent,
  agentNameToStepName: ReadonlyMap<string, string>,
  warnings: string[]
): WorkflowStep => {
  const options = agent.options ?? {};
  const messageSource =
    (typeof options.message === 'string' && options.message) ||
    (typeof options.text === 'string' && options.text) ||
    (typeof options.body === 'string' && options.body) ||
    `Slack notification from Tines agent "${agent.name}"`;

  const withBlock: Record<string, unknown> = {
    message: convertTinesTemplate(messageSource, agentNameToStepName, warnings),
  };

  if (typeof options.channel === 'string' && options.channel.length > 0) {
    withBlock.channel = convertTinesTemplate(options.channel, agentNameToStepName, warnings);
  }

  return {
    name: agent.stepName,
    type: 'slack',
    'connector-id': SLACK_CONNECTOR_PLACEHOLDER,
    with: withBlock,
  };
};
