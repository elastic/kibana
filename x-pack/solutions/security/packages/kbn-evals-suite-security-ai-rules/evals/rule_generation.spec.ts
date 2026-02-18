/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '@kbn/evals';
import { tags } from '@kbn/scout';
import { getKibanaDefaultAgentCapabilities } from '@kbn/agent-builder-common/agents';
import type { InferenceClient } from '@kbn/inference-common';
import { createRestClient } from '@kbn/inference-plugin/common';
import { sampleRules } from '../datasets/sample_rules';
import { createRuleEvaluators } from '../src/evaluators';
import { extractCategory } from '../src/helpers';
import {
  SecurityAgentBuilderAttachments,
  THREAT_HUNTING_AGENT_ID,
} from '../../../plugins/security_solution/common/constants';

const AGENT_BUILDER_CONVERSE_API_PATH = '/api/agent_builder/converse';
const AGENT_BUILDER_CONVERSE_ASYNC_API_PATH = '/api/agent_builder/converse/async';
const SECURITY_CREATE_DETECTION_RULE_TOOL_ID = 'security.create_detection_rule';

interface ToolResult {
  type?: string;
  data?: Record<string, unknown>;
}

interface RuleToolStep {
  type: string;
  tool_id?: string;
  results?: ToolResult[];
}

interface ConverseResponse {
  steps?: RuleToolStep[];
}

interface ParsedSseEvent {
  event?: string;
  data?: Record<string, unknown>;
}

type EvalFetch = (path: string, options?: Record<string, unknown>) => Promise<unknown>;

const stringifyError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const parseSseEvents = (ssePayload: string): ParsedSseEvent[] => {
  const blocks = ssePayload.split(/\r?\n\r?\n/);
  const parsedEvents: ParsedSseEvent[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    let eventName: string | undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.substring('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.substring('data:'.length).trim());
      }
    }

    if (dataLines.length === 0) {
      continue;
    }

    try {
      parsedEvents.push({
        event: eventName,
        data: JSON.parse(dataLines.join('\n')) as Record<string, unknown>,
      });
    } catch {
      // Ignore malformed SSE payloads to keep evaluation resilient.
    }
  }

  return parsedEvents;
};

const extractRuleDataFromToolResults = (results?: ToolResult[]): {
  ruleData?: Record<string, unknown>;
  error?: string;
} => {
  if (!results?.length) {
    return {};
  }

  for (const result of results) {
    if (result.type === 'error') {
      return {
        error: (result.data?.message as string) || 'Rule generation tool returned an error',
      };
    }

    if (result.type === 'other') {
      const success = result.data?.success;
      const rule = result.data?.rule as Record<string, unknown> | undefined;
      if (success === true && rule) {
        return { ruleData: rule };
      }
      if (success === false) {
        return {
          error: (result.data?.message as string) || 'Rule generation tool reported failure',
        };
      }
    }
  }

  return {};
};

const mapGeneratedRule = (ruleData: Record<string, unknown>) => ({
  name: ruleData.name as string,
  description: ruleData.description as string,
  query: ruleData.query as string,
  threat: (ruleData.threat as Array<{ technique: string; tactic: string; subtechnique?: string }>) || [],
  severity: ruleData.severity as string,
  tags: (ruleData.tags as string[]) || [],
  riskScore: (ruleData.risk_score ?? ruleData.riskScore) as number,
  from: ruleData.from as string,
  category: extractCategory((ruleData.name as string) || ''),
});

const extractRuleFromSyncResponse = (response: ConverseResponse) => {
  const toolSteps =
    response.steps?.filter(
      (s) => s.type === 'tool_call' && s.tool_id === SECURITY_CREATE_DETECTION_RULE_TOOL_ID
    ) ?? [];
  const lastToolStep = toolSteps.at(-1);
  const extracted = extractRuleDataFromToolResults(lastToolStep?.results);

  return {
    ...extracted,
    diagnostics: JSON.stringify({
      totalSteps: response.steps?.length ?? 0,
      toolCallSteps: toolSteps.length,
      stepToolIds:
        response.steps?.filter((s) => s.type === 'tool_call').map((s) => s.tool_id) ?? [],
      lastToolResultTypes: lastToolStep?.results?.map((r) => r.type) ?? [],
    }),
  };
};

const generateRuleFromAgent = async ({
  fetch,
  input,
  connectorId,
  log,
}: {
  fetch: EvalFetch;
  input: { prompt: string };
  connectorId: string;
  log: { warning: (msg: string) => void };
}): Promise<{ generatedRule?: ReturnType<typeof mapGeneratedRule>; error?: string }> => {
  const payload = {
    agent_id: THREAT_HUNTING_AGENT_ID,
    input: `Create a detection rule based on the following user_query using the dedicated detection rule creation tool. Do not perform any other actions after creating the rule. user_query: ${input.prompt}`,
    connector_id: connectorId,
    capabilities: getKibanaDefaultAgentCapabilities(),
    attachments: [
      {
        type: SecurityAgentBuilderAttachments.rule,
        data: {
          text: '',
          attachmentLabel: 'AI Rule Creation',
        },
      },
    ],
    browser_api_tools: [],
  };

  try {
    const asyncResponse = (await fetch(AGENT_BUILDER_CONVERSE_ASYNC_API_PATH, {
      method: 'POST',
      asResponse: true,
      rawResponse: true,
      body: JSON.stringify(payload),
    })) as { response?: { text: () => Promise<string> } };

    const ssePayload = await asyncResponse.response?.text();
    if (ssePayload) {
      const events = parseSseEvents(ssePayload);
      const toolResultEvents = events.filter(
        (event) =>
          event.event === 'tool_result' &&
          (event.data?.data as { tool_id?: string } | undefined)?.tool_id ===
            SECURITY_CREATE_DETECTION_RULE_TOOL_ID
      );
      const latestToolResultEvent = toolResultEvents.at(-1)?.data?.data as
        | { results?: ToolResult[] }
        | undefined;
      const extracted = extractRuleDataFromToolResults(latestToolResultEvent?.results);

      if (extracted.ruleData) {
        return { generatedRule: mapGeneratedRule(extracted.ruleData) };
      }
      if (extracted.error) {
        return { error: extracted.error };
      }

      log.warning(
        `Agent returned no rule from async converse. Diagnostics: ${JSON.stringify({
          totalEvents: events.length,
          toolResultEvents: toolResultEvents.length,
        })}`
      );
    }
  } catch (error) {
    log.warning(`Async converse failed, falling back to sync endpoint: ${stringifyError(error)}`);
  }

  const syncResponse = (await fetch(AGENT_BUILDER_CONVERSE_API_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as ConverseResponse;
  const extractedFromSync = extractRuleFromSyncResponse(syncResponse);

  if (extractedFromSync.ruleData) {
    return {
      generatedRule: mapGeneratedRule(extractedFromSync.ruleData),
    };
  }

  log.warning(`Agent returned no rule. Sync diagnostics: ${extractedFromSync.diagnostics}`);
  return {
    error: extractedFromSync.error || 'No rule returned from agent',
  };
};

evaluate.describe(
  'AI Rule Generation',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('generates accurate detection rules', async ({
      executorClient,
      fetch,
      log,
    }) => {
      // Get the connector ID from environment variable (preconfigured connector)
      const connectorId = process.env.EVALUATION_CONNECTOR_ID || 'gpt-4o';
      
      // Create inference client manually bound to the preconfigured connector
      const inferenceClient = createRestClient({
        fetch,
        bindTo: {
          connectorId,
        },
      });
      
      const dataset = {
        name: 'security-ai-rules: rule-generation-basic',
        description:
          'Evaluates AI-generated detection rules against known examples from elastic/detection-rules',
        examples: sampleRules.map((rule) => ({
          input: {
            prompt: `Generate a detection rule that ${rule.description.toLowerCase()}`,
          },
          output: rule,
          metadata: {
            category: rule.category,
            difficulty: 'medium',
            expectedName: rule.name,
          },
        })),
      };

      log.info(`Running AI rule generation evaluation with ${dataset.examples.length} examples`);
      log.info(`Using connector: ${connectorId}`);

      await executorClient.runExperiment(
        {
          dataset,
          task: async ({ input }) => {
            try {
              log.debug(`Generating rule for prompt: ${input.prompt.substring(0, 100)}...`);
              const taskResult = await generateRuleFromAgent({
                fetch: fetch as EvalFetch,
                input,
                connectorId,
                log,
              });

              if (!taskResult.generatedRule) {
                return {
                  error: taskResult.error || 'No rule returned from agent',
                };
              }
              log.debug(`Generated rule: ${taskResult.generatedRule.name}`);
              log.debug(
                `Generated query preview: ${taskResult.generatedRule.query?.substring(0, 150)}...`
              );
              return taskResult;
            } catch (error) {
              log.error(`Error generating rule: ${error instanceof Error ? error.message : String(error)}`);
              return {
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
        },
        createRuleEvaluators({ inferenceClient: inferenceClient as unknown as InferenceClient })
      );

      log.info('Evaluation complete');
    });

    evaluate('handles edge cases and errors gracefully', async ({
      executorClient,
      fetch,
      log,
    }) => {
      // Get the connector ID from environment variable (preconfigured connector)
      const connectorId = process.env.EVALUATION_CONNECTOR_ID || 'gpt-4o';
      
      // Create inference client manually bound to the preconfigured connector
      const inferenceClient = createRestClient({
        fetch,
        bindTo: {
          connectorId,
        },
      });
      
      const edgeCaseDataset = {
        name: 'security-ai-rules: edge-cases',
        description: 'Tests AI rule generation with edge cases and challenging prompts',
        examples: [
          {
            input: {
              prompt: 'Detect suspicious activity',
            },
            output: {
              name: 'Generic Suspicious Activity',
              description: 'Detects suspicious activity',
              query: 'process where true',
              threat: [],
              severity: 'low',
              tags: [],
              riskScore: 21,
              from: 'now-5m',
              category: 'unknown',
            },
            metadata: {
              testType: 'vague-prompt',
              difficulty: 'hard',
            },
          },
          {
            input: {
              prompt:
                'Create a rule for detecting advanced persistent threat actors using zero-day exploits with polymorphic malware and anti-forensics techniques',
            },
            output: {
              name: 'Complex APT Detection',
              description: 'Detects advanced persistent threats',
              query: 'process where true',
              threat: [],
              severity: 'critical',
              tags: [],
              riskScore: 99,
              from: 'now-5m',
              category: 'execution',
            },
            metadata: {
              testType: 'complex-prompt',
              difficulty: 'very-hard',
            },
          },
        ],
      };

      log.info('Running edge case evaluation');

      await executorClient.runExperiment(
        {
          dataset: edgeCaseDataset,
          task: async ({ input }) => {
            try {
              const taskResult = await generateRuleFromAgent({
                fetch: fetch as EvalFetch,
                input,
                connectorId,
                log,
              });

              if (!taskResult.generatedRule) {
                return {
                  error: taskResult.error || 'No rule returned from agent',
                };
              }
              return taskResult;
            } catch (error) {
              log.error(`Error in edge case: ${error instanceof Error ? error.message : String(error)}`);
              return {
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
        },
        createRuleEvaluators({ inferenceClient: inferenceClient as unknown as InferenceClient })
      );

      log.info('Edge case evaluation complete');
    });
  }
);
