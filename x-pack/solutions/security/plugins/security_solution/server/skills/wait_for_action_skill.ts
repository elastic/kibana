/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { ToolHandlerContext, SkillDefinition } from '@kbn/onechat-server';
import type { EndpointAppContextService } from '../endpoint/endpoint_app_context_services';
import { getActionDetailsById } from '../endpoint/services/actions/action_details_by_id';

const waitForActionSchema = z.object({
  action_id: z.string().describe('The action ID returned from a fleet management command'),
  endpoint_id: z
    .string()
    .optional()
    .describe('Optional endpoint ID to filter results for a specific endpoint'),
  timeout_seconds: z
    .number()
    .optional()
    .default(300)
    .describe('Maximum time to wait for the action to complete (default: 300 seconds / 5 minutes)'),
  poll_interval_seconds: z
    .number()
    .optional()
    .default(5)
    .describe('How often to check action status (default: 5 seconds)'),
});

interface WaitForActionSkillDeps {
  getEndpointAppContextService: () => EndpointAppContextService;
  logger: Logger;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createWaitForActionSkill(deps: WaitForActionSkillDeps): SkillDefinition {
  return {
    id: 'security.wait_for_action',
    name: 'Wait for Response Action Completion',
    description: `Wait for a fleet management response action to complete and return the results.

This skill should be called after executing a response action (like execute, get-file, processes, etc.) 
to wait for the action to complete and retrieve the output.

Parameters:
- action_id: The action ID returned from the fleet management skill
- endpoint_id: (Optional) Filter results for a specific endpoint
- timeout_seconds: (Optional) Maximum wait time, default 300 seconds (5 minutes)
- poll_interval_seconds: (Optional) Polling interval, default 5 seconds

The skill will poll the action status until it completes, fails, or times out.`,
    category: 'security',
    inputSchema: waitForActionSchema,
    examples: [
      // Wait for an action to complete with default timeout (5 minutes)
      'tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_uuid>"}})',
      // Wait for an action with a shorter timeout (60 seconds)
      'tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_uuid>","timeout_seconds":60}})',
      // Wait for an action and filter output to a specific endpoint
      'tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_uuid>","endpoint_id":"<endpoint_uuid>"}})',
      // Wait with custom timeout and poll interval
      'tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_uuid>","timeout_seconds":120,"poll_interval_seconds":10}})',
      // Typical flow: after executing a command, wait for results
      'tool("invoke_skill", {"skillId":"security.wait_for_action","params":{"action_id":"<action_id_from_fleet_management_skill>","timeout_seconds":60}})',
    ],
    handler: async (params, context) => {
      const {
        action_id,
        endpoint_id,
        timeout_seconds = 300,
        poll_interval_seconds = 5,
      } = params as z.infer<typeof waitForActionSchema>;

      // Use logger from context if available, otherwise from deps
      const logger = 'logger' in context ? (context as ToolHandlerContext).logger : deps.logger;

      const endpointService = deps.getEndpointAppContextService();
      const spaceId = 'default';

      const startTime = Date.now();
      const timeoutMs = timeout_seconds * 1000;
      const pollIntervalMs = poll_interval_seconds * 1000;

      logger.info(`Waiting for action ${action_id} to complete (timeout: ${timeout_seconds}s)`);

      let lastError: Error | null = null;
      let pollCount = 0;

      while (Date.now() - startTime < timeoutMs) {
        pollCount++;

        try {
          const actionDetails = await getActionDetailsById(endpointService, spaceId, action_id);

          // Check if action is complete
          if (actionDetails.isCompleted) {
            logger.info(
              `Action ${action_id} completed after ${pollCount} polls (${Math.round((Date.now() - startTime) / 1000)}s)`
            );

            // Build the result
            const result: Record<string, any> = {
              action_id: actionDetails.id,
              command: actionDetails.command,
              status: actionDetails.status,
              is_completed: actionDetails.isCompleted,
              was_successful: actionDetails.wasSuccessful,
              started_at: actionDetails.startedAt,
              completed_at: actionDetails.completedAt,
              agents: actionDetails.agents,
              hosts: actionDetails.hosts,
            };

            // Add errors if present
            if (actionDetails.errors && actionDetails.errors.length > 0) {
              result.errors = actionDetails.errors;
            }

            // Add outputs if present
            if (actionDetails.outputs) {
              // If endpoint_id specified, filter to just that endpoint's output
              if (endpoint_id && actionDetails.outputs[endpoint_id]) {
                result.output = actionDetails.outputs[endpoint_id];
              } else {
                result.outputs = actionDetails.outputs;
              }

              // For execute commands, extract stdout/stderr for convenience
              if (actionDetails.command === 'execute') {
                const outputKey = endpoint_id || Object.keys(actionDetails.outputs)[0];
                const output = actionDetails.outputs[outputKey];
                if (output && 'content' in output) {
                  const content = output.content as {
                    stdout?: string;
                    stderr?: string;
                    shell_code?: number;
                  };
                  if (content.stdout !== undefined) {
                    result.stdout = content.stdout;
                  }
                  if (content.stderr !== undefined) {
                    result.stderr = content.stderr;
                  }
                  if (content.shell_code !== undefined) {
                    result.exit_code = content.shell_code;
                  }
                }
              }

              // For get-file commands, include download info
              if (actionDetails.command === 'get-file') {
                const outputKey = endpoint_id || Object.keys(actionDetails.outputs)[0];
                const output = actionDetails.outputs[outputKey];
                if (output && 'content' in output) {
                  const content = output.content as {
                    file_name?: string;
                    size?: number;
                    downloadUri?: string;
                  };
                  if (content.file_name) {
                    result.file_name = content.file_name;
                  }
                  if (content.size !== undefined) {
                    result.file_size = content.size;
                  }
                  if (content.downloadUri) {
                    result.download_uri = content.downloadUri;
                  }
                }
              }

              // For processes command, include process list summary
              if (actionDetails.command === 'running-processes') {
                const outputKey = endpoint_id || Object.keys(actionDetails.outputs)[0];
                const output = actionDetails.outputs[outputKey];
                if (output && 'content' in output) {
                  const content = output.content as { entries?: any[] };
                  if (content.entries) {
                    result.process_count = content.entries.length;
                    result.processes = content.entries;
                  }
                }
              }
            }

            // Add agent state for detailed per-agent status
            if (actionDetails.agentState) {
              result.agent_state = actionDetails.agentState;
            }

            return result;
          }

          // Check if action is expired
          if (actionDetails.isExpired) {
            return {
              action_id,
              status: 'expired',
              is_completed: false,
              was_successful: false,
              message: 'Action expired before completion',
              started_at: actionDetails.startedAt,
            };
          }

          // Action still pending, wait and poll again
          logger.debug(
            `Action ${action_id} still pending (poll ${pollCount}, elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`
          );
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`Error polling action ${action_id}: ${lastError.message}`);
          // Continue polling - the action might not be indexed yet
        }

        // Wait before next poll
        await sleep(pollIntervalMs);
      }

      // Timeout reached
      logger.warn(`Timeout waiting for action ${action_id} after ${timeout_seconds}s`);

      return {
        action_id,
        status: 'timeout',
        is_completed: false,
        was_successful: false,
        message: `Timeout after ${timeout_seconds} seconds waiting for action to complete`,
        polls: pollCount,
        last_error: lastError?.message,
      };
    },
  };
}

