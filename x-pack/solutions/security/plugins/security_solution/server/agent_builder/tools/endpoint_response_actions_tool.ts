/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import { getActionDetailsById } from '../../endpoint/services/actions/action_details_by_id';
import { securityTool } from './constants';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

const agentTypeEnum = z.enum([
  'endpoint',
  'sentinel_one',
  'crowdstrike',
  'microsoft_defender_endpoint',
]);

const baseActionFields = {
  endpoint_ids: z.array(z.string().min(1)).min(1).describe('Endpoint IDs to target'),
  agent_type: agentTypeEnum.optional().default('endpoint').describe('Endpoint agent type'),
  comment: z.string().optional().describe('Comment for the action'),
  alert_ids: z.array(z.string()).optional().describe('Alert IDs to associate'),
  case_ids: z.array(z.string()).optional().describe('Case IDs to associate'),
  confirm: z.literal(true).describe('Required. Must be true to execute this action.'),
};

const processIdentifier = z
  .object({
    pid: z.number().optional().describe('Process ID'),
    entity_id: z.string().optional().describe('Process entity ID'),
  })
  .refine((data) => data.pid !== undefined || data.entity_id !== undefined, {
    message: 'Either pid or entity_id must be provided',
  });

const schema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('isolate'), ...baseActionFields }),
  z.object({ operation: z.literal('release'), ...baseActionFields }),
  z.object({
    operation: z.literal('kill_process'),
    ...baseActionFields,
    parameters: processIdentifier,
  }),
  z.object({
    operation: z.literal('suspend_process'),
    ...baseActionFields,
    parameters: processIdentifier,
  }),
  z.object({ operation: z.literal('running_processes'), ...baseActionFields }),
  z.object({
    operation: z.literal('get_file'),
    ...baseActionFields,
    parameters: z.object({
      path: z.string().describe('Full file path to retrieve'),
    }),
  }),
  z.object({
    operation: z.literal('execute'),
    ...baseActionFields,
    parameters: z.object({
      command: z.string().describe('Shell command to execute'),
      timeout: z.number().optional().describe('Command timeout in seconds'),
    }),
  }),
  z.object({
    operation: z.literal('scan'),
    ...baseActionFields,
    parameters: z.object({
      path: z.string().describe('File or directory path to scan'),
    }),
  }),
  z.object({
    operation: z.literal('runscript'),
    ...baseActionFields,
    parameters: z.object({
      raw: z.string().optional().describe('Raw script content to execute'),
      commandLine: z.string().optional().describe('Script command line'),
      timeout: z.number().optional().describe('Script timeout in seconds'),
      scriptId: z.string().optional().describe('Script ID from library (for endpoint agent type)'),
      scriptInput: z.string().optional().describe('Script input args (for endpoint agent type)'),
    }),
  }),
  z.object({
    operation: z.literal('get_action_status'),
    action_id: z.string().describe('The response action ID to check status for'),
  }),
]);

export const endpointResponseActionsTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: securityTool('endpoint_response_actions'),
    type: ToolType.builtin,
    description:
      'Execute endpoint response actions: isolate/release hosts, kill/suspend processes, get running processes, get file, execute shell commands, scan for malware, run scripts. Use get_action_status to check status of an action.',
    schema,
    confirmation: {
      askUser: 'once',
    },
    handler: async (input, { spaceId }) => {
      try {
        if (input.operation === 'get_action_status') {
          const actionDetails = await getActionDetailsById(
            endpointAppContextService,
            spaceId,
            input.action_id,
            { bypassSpaceValidation: true }
          );
          return {
            results: [
              otherResult({
                operation: 'get_action_status',
                action_id: input.action_id,
                action_details: actionDetails,
              }),
            ],
          };
        }

        const client = endpointAppContextService.getInternalResponseActionsClient({
          agentType: input.agent_type ?? 'endpoint',
          spaceId,
          username: 'elastic',
        });

        const baseRequest = {
          endpoint_ids: input.endpoint_ids,
          comment: input.comment,
          alert_ids: input.alert_ids,
          case_ids: input.case_ids,
        };

        let actionDetails;

        switch (input.operation) {
          case 'isolate':
            actionDetails = await client.isolate(baseRequest);
            break;
          case 'release':
            actionDetails = await client.release(baseRequest);
            break;
          case 'kill_process':
            actionDetails = await client.killProcess({
              ...baseRequest,
              parameters: input.parameters as unknown as { pid: number } | { entity_id: string },
            });
            break;
          case 'suspend_process':
            actionDetails = await client.suspendProcess({
              ...baseRequest,
              parameters: input.parameters as unknown as { pid: number } | { entity_id: string },
            });
            break;
          case 'running_processes':
            actionDetails = await client.runningProcesses(baseRequest);
            break;
          case 'get_file':
            actionDetails = await client.getFile({
              ...baseRequest,
              parameters: input.parameters,
            });
            break;
          case 'execute':
            actionDetails = await client.execute({
              ...baseRequest,
              parameters: input.parameters,
            });
            break;
          case 'scan':
            actionDetails = await client.scan({
              ...baseRequest,
              parameters: input.parameters,
            });
            break;
          case 'runscript': {
            const params = input.parameters;
            const runscriptParams =
              input.agent_type === 'endpoint' && (params.scriptId || params.scriptInput)
                ? {
                    scriptId: params.scriptId ?? '',
                    scriptInput: params.scriptInput,
                    timeout: params.timeout,
                  }
                : {
                    raw: params.raw,
                    commandLine: params.commandLine,
                    timeout: params.timeout,
                  };
            actionDetails = await client.runscript({
              ...baseRequest,
              parameters: runscriptParams as Record<string, unknown>,
            });
            break;
          }
          default: {
            const _exhaustive: never = input;
            return {
              results: [
                otherResult({
                  error: {
                    message: `Unsupported operation: ${
                      (_exhaustive as { operation: string }).operation
                    }`,
                  },
                }),
              ],
            };
          }
        }

        return {
          results: [
            otherResult({
              operation: input.operation,
              action_details: actionDetails,
            }),
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          results: [
            otherResult({
              error: { message },
            }),
          ],
        };
      }
    },
    tags: ['security', 'endpoint', 'response-actions'],
  };
};
