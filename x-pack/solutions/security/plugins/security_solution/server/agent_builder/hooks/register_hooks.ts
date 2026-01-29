/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, HookRegistration } from '@kbn/agent-builder-plugin/server';
import { HookEvent, HookExecutionMode } from '@kbn/agent-builder-plugin/server';
import {
  platformCoreTools,
  ToolResultType,
  type TabularDataResult,
  type ToolResult,
} from '@kbn/agent-builder-common';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { getAnonymizedValue } from '@kbn/elastic-assistant-common';
import type {
  PostToolCallHookContext,
  PreToolCallHookContext,
} from '@kbn/agent-builder-plugin/server/services/hooks/types';
import {
  getSensitiveOutputFields,
  type PIIFieldRegistry,
} from '../../utils/esql/esql_sensitive_fields';

const piiRegistry: PIIFieldRegistry = new Set([
  'user.name',
  'host.name',
  'customer_full_name',
  'email',
  'customer_id',
]);

// POC: global replacements map shared across hooks.
const globalReplacements: Replacements = {};

const replaceHashesInString = (input: string, replacements: Replacements): string => {
  let output = input;
  for (const [hashedValue, originalValue] of Object.entries(replacements)) {
    if (hashedValue) {
      output = output.split(hashedValue).join(originalValue);
    }
  }
  return output;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isWordToken = (value: string): boolean => /^[A-Za-z0-9_]+$/.test(value);

const replaceOriginalsInString = (input: string, replacements: Replacements): string => {
  let output = input;
  const entries = Object.entries(replacements).sort(
    (a, b) => (b[1]?.length ?? 0) - (a[1]?.length ?? 0)
  );
  for (const [hashedValue, originalValue] of entries) {
    if (originalValue) {
      const escapedOriginal = escapeRegExp(originalValue);
      const pattern = isWordToken(originalValue)
        ? new RegExp(`\\b${escapedOriginal}\\b`, 'g')
        : new RegExp(escapedOriginal, 'g');
      output = output.replace(pattern, hashedValue);
    }
  }
  return output;
};

/**
 * Registers all security agent builder hooks with the agentBuilder plugin
 */
export const registerHooks = async (agentBuilder: AgentBuilderPluginSetup) => {
  const onConversationRoundStartHook: HookRegistration = {
    id: 'security:onConversationRoundStart',
    event: HookEvent.onConversationRoundStart,
    mode: HookExecutionMode.blocking,
    description: 'Anonymizes user input using global replacements',
    handler: async (context) => {
      if (context.event !== HookEvent.onConversationRoundStart) {
        return;
      }

      const { nextInput } = context;
      let updatedInput = nextInput;
      const hasReplacements = Object.keys(globalReplacements).length > 0;

      if (hasReplacements && typeof nextInput.message === 'string') {
        console.log('----- nextInput.message:', nextInput.message);
        console.log('----- globalReplacements:', JSON.stringify(globalReplacements, null, 2));
        const updatedMessage = replaceOriginalsInString(nextInput.message, globalReplacements);
        console.log('----- updatedMessage:', updatedMessage);
        if (updatedMessage !== nextInput.message) {
          updatedInput = {
            ...nextInput,
            message: updatedMessage,
          };
        }
      }

      if (updatedInput !== nextInput) {
        return { nextInput: updatedInput };
      }
    },
  };
  agentBuilder.hooks.register(onConversationRoundStartHook);

  const preToolCallHook: HookRegistration = {
    id: 'security:preToolCall',
    event: HookEvent.preToolCall,
    mode: HookExecutionMode.blocking,
    description: 'Replaces anonymized values in tool params before execution',
    handler: async (context) => {
      if (context.event !== HookEvent.preToolCall) {
        return;
      }

      if (Object.keys(globalReplacements).length === 0) {
        return;
      }

      const preToolCallContext = context as PreToolCallHookContext;

      // Only process execute_esql tool params
      if (preToolCallContext.toolId !== platformCoreTools.executeEsql) {
        return;
      }

      const esqlQuery = preToolCallContext.toolParams.query;
      if (typeof esqlQuery !== 'string') {
        return;
      }

      console.log('----- esqlQuery:', esqlQuery);
      console.log('----- globalReplacements:', JSON.stringify(globalReplacements, null, 2));

      const updatedQuery = replaceHashesInString(esqlQuery, globalReplacements);
      if (updatedQuery === esqlQuery) {
        return;
      }

      return {
        toolParams: {
          ...preToolCallContext.toolParams,
          query: updatedQuery,
        },
      };
    },
  };
  agentBuilder.hooks.register(preToolCallHook);

  // Register hook for postToolCall - anonymizes sensitive fields in ESQL results
  const postToolCallHook: HookRegistration = {
    id: 'security:postToolCall',
    event: HookEvent.postToolCall,
    mode: HookExecutionMode.blocking,
    description: 'Anonymizes sensitive fields in ESQL query results',
    handler: async (context) => {
      if (context.event !== HookEvent.postToolCall) {
        return;
      }

      const postToolCallContext = context as PostToolCallHookContext;

      // Only process execute_esql tool results
      if (postToolCallContext.toolId !== platformCoreTools.executeEsql) {
        return;
      }

      // Get the ESQL query from tool parameters
      const esqlQuery = postToolCallContext.toolParams.query;
      if (typeof esqlQuery !== 'string') {
        // If query is not a string, skip anonymization
        return;
      }
      const { toolReturn } = postToolCallContext;

      // If no results, nothing to anonymize
      if (!toolReturn.results || toolReturn.results.length === 0) {
        return;
      }

      // Parse the ESQL query to discover which output fields are sensitive
      const sensitiveOutputFields = getSensitiveOutputFields(esqlQuery, piiRegistry);

      // Deep clone the toolReturn to avoid mutating the original
      const modifiedResults: ToolResult[] = toolReturn.results.map((result) => {
        // Only process tabularData results
        if (result.type !== ToolResultType.tabularData) {
          return result;
        }

        const tabularResult = result as TabularDataResult;
        const { columns, values } = tabularResult.data;

        // Find indices of sensitive columns based on discovered sensitive output fields
        const sensitiveColumnIndices = new Set<number>();
        columns.forEach((column, index) => {
          const columnName = column.name;
          if (sensitiveOutputFields.has(columnName)) {
            sensitiveColumnIndices.add(index);
          }
        });

        // If no sensitive columns found, return original result
        if (sensitiveColumnIndices.size === 0) {
          return result;
        }

        // Anonymize values for sensitive columns using UUIDs
        const anonymizedValues = values.map((row) => {
          const anonymizedRow = [...row];
          sensitiveColumnIndices.forEach((index) => {
            const originalValue = row[index];
            if (originalValue != null && originalValue !== '') {
              const stringValue = String(originalValue);
              // Generate or reuse anonymized value (UUID)
              const anonymizedValue = getAnonymizedValue({
                currentReplacements: globalReplacements,
                rawValue: stringValue,
              });
              // Store the mapping (anonymized -> original)
              globalReplacements[anonymizedValue] = stringValue;
              anonymizedRow[index] = anonymizedValue;
            }
          });
          return anonymizedRow;
        });

        // Return modified tabular result with replacements stored in data
        return {
          ...tabularResult,
          data: {
            ...tabularResult.data,
            values: anonymizedValues,
          } as TabularDataResult['data'],
        };
      });

      // Return modified toolReturn
      return {
        toolReturn: {
          ...toolReturn,
          results: modifiedResults,
        },
      };
    },
  };
  agentBuilder.hooks.register(postToolCallHook);

  const onConversationRoundEndHook: HookRegistration = {
    id: 'security:onConversationRoundEnd',
    event: HookEvent.onConversationRoundEnd,
    mode: HookExecutionMode.blocking,
    description: 'Replaces anonymized hashes in round output',
    handler: async (context) => {
      if (context.event !== HookEvent.onConversationRoundEnd) {
        return;
      }

      if (Object.keys(globalReplacements).length === 0) {
        return;
      }

      const round = context.round;
      const updatedResponseMessage = replaceHashesInString(
        round.response.message,
        globalReplacements
      );

      const updatedSteps = round.steps.map((step) => {
        if (step.type === 'reasoning') {
          return {
            ...step,
            reasoning: replaceHashesInString(step.reasoning, globalReplacements),
          };
        }

        if (step.type === 'tool_call' && step.progression?.length) {
          return {
            ...step,
            progression: step.progression.map((progress) => ({
              ...progress,
              message: replaceHashesInString(progress.message, globalReplacements),
            })),
          };
        }

        return step;
      });

      return {
        round: {
          ...round,
          response: {
            ...round.response,
            message: updatedResponseMessage,
          },
          steps: updatedSteps,
        },
      };
    },
  };
  agentBuilder.hooks.register(onConversationRoundEndHook);
};
