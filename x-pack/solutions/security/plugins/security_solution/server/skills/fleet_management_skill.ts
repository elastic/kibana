/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ToolHandlerContext, SkillDefinition } from '@kbn/onechat-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ResponseActionsClient } from '../endpoint/services/actions/clients/lib/types';
import { getResponseActionsClient } from '../endpoint/services/actions/clients/get_response_actions_client';
import { NormalizedExternalConnectorClient } from '../endpoint/services/actions/clients/lib/normalized_external_connector_client';
import type { EndpointAppContextService } from '../endpoint/endpoint_app_context_services';
import type { ResponseActionAgentType } from '../../common/endpoint/service/response_actions/constants';

// Response action command types supported by this skill
type ResponseActionCommand =
  | 'isolate'
  | 'release'
  | 'status'
  | 'processes'
  | 'kill-process'
  | 'suspend-process'
  | 'get-file'
  | 'execute'
  | 'scan';

export const VALID_COMMANDS: ResponseActionCommand[] = [
  'isolate',
  'release',
  'status',
  'processes',
  'kill-process',
  'suspend-process',
  'get-file',
  'execute',
  'scan',
];

export const fleetManagementSchema = z.object({
  command_string: z
    .string()
    .describe(
      'The full command string to execute, following console command syntax. Examples: "isolate --comment Suspicious activity", "execute --command ps -aux", "get-file --path /etc/passwd --comment retrieving file"'
    ),
  endpoint_ids: z
    .array(z.string())
    .min(1)
    .describe('Array of endpoint IDs (agent IDs) to execute the action on'),
  agent_type: z
    .enum(['endpoint', 'sentinel_one', 'crowdstrike', 'microsoft_defender_endpoint'])
    .optional()
    .default('endpoint')
    .describe('The agent type. Defaults to "endpoint"'),
});

export interface ParsedCommand {
  action: ResponseActionCommand;
  comment?: string;
  path?: string;
  command?: string;
  entityId?: string;
  pid?: number;
  timeout?: number;
}

/**
 * Parse a command string like "execute --command ps -aux --comment testing"
 * into structured parameters
 */
export function parseCommandString(commandString: string): ParsedCommand {
  const trimmed = commandString.trim();
  
  // Extract the action (first word)
  const firstSpaceIndex = trimmed.indexOf(' ');
  const action = (firstSpaceIndex === -1 ? trimmed : trimmed.substring(0, firstSpaceIndex)).toLowerCase() as ResponseActionCommand;
  
  if (!VALID_COMMANDS.includes(action)) {
    throw new Error(`Invalid command: "${action}". Valid commands are: ${VALID_COMMANDS.join(', ')}`);
  }
  
  const result: ParsedCommand = { action };
  
  // If no arguments, return just the action
  if (firstSpaceIndex === -1) {
    return result;
  }
  
  const argsString = trimmed.substring(firstSpaceIndex + 1);
  
  // Parse --flag value pairs
  // Handle special case for --command which can contain spaces
  const flagRegex = /--([\w-]+)(?:\s+|=)/g;
  const flags: { name: string; startIndex: number }[] = [];
  let match;
  
  while ((match = flagRegex.exec(argsString)) !== null) {
    flags.push({ name: match[1], startIndex: match.index });
  }
  
  // Extract values for each flag
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    const valueStart = flag.startIndex + flag.name.length + 3; // --name + space or =
    const valueEnd = i < flags.length - 1 ? flags[i + 1].startIndex : argsString.length;
    let value = argsString.substring(valueStart, valueEnd).trim();
    
    // Remove trailing whitespace before next flag
    if (i < flags.length - 1) {
      value = value.replace(/\s+$/, '');
    }
    
    switch (flag.name.toLowerCase()) {
      case 'comment':
        result.comment = value;
        break;
      case 'path':
        result.path = value;
        break;
      case 'command':
        result.command = value;
        break;
      case 'entityid':
      case 'entity_id':
      case 'entity-id':
        result.entityId = value;
        break;
      case 'pid':
        result.pid = parseInt(value, 10);
        if (isNaN(result.pid)) {
          throw new Error(`Invalid pid value: "${value}". Must be a number.`);
        }
        break;
      case 'timeout':
        result.timeout = parseInt(value, 10);
        if (isNaN(result.timeout)) {
          throw new Error(`Invalid timeout value: "${value}". Must be a number.`);
        }
        break;
    }
  }
  
  return result;
}

interface FleetManagementSkillDeps {
  coreSetup: CoreSetup<any, any>;
  getEndpointAppContextService: () => EndpointAppContextService;
  logger: Logger;
}

export async function getResponseActionsClientFromContext(
  context: ToolHandlerContext | { request: KibanaRequest },
  deps: FleetManagementSkillDeps,
  agentType: ResponseActionAgentType = 'endpoint'
): Promise<{ client: ResponseActionsClient; spaceId: string }> {
  const [coreStart] = await deps.coreSetup.getStartServices();

  let request: KibanaRequest;
  if ('request' in context && !('esClient' in context)) {
    request = context.request;
  } else {
    request = (context as ToolHandlerContext).request;
  }

  const endpointService = deps.getEndpointAppContextService();

  // Get the current user for username
  const securityStart = coreStart.security;
  const user = securityStart.authc.getCurrentUser(request);
  const username = user?.username || 'onechat-agent';

  // Get space ID - default to 'default' space
  const spaceId = 'default';

  // Get the ES client - use the internal client from the endpoint service
  const esClient = endpointService.getInternalEsClient();

  // Get cases client if available
  let casesClient;
  try {
    casesClient = await endpointService.getCasesClient(request);
  } catch {
    // Cases client may not be available, continue without it
  }

  // Use the logger from deps
  const logger = deps.logger;

  // For endpoint agent type, we need to use a client that is NOT marked as automated
  // because 'execute' and some other commands are only supported for manual actions.
  // We'll create a minimal NormalizedExternalConnectorClient that doesn't require
  // external connector setup (which is only needed for SentinelOne, CrowdStrike, etc.)
  const connectorActionsClient = new NormalizedExternalConnectorClient(
    {
      execute: async () => ({ status: 'ok', data: {}, actionId: '' }),
      bulkEnqueueExecution: async () => ({ errors: false, items: [] }),
    } as any,
    logger,
    { spaceId }
  );

  // Create the response actions client WITHOUT isAutomated flag
  // This allows 'execute' and other manual-only actions to work
  const client = getResponseActionsClient(agentType, {
    esClient,
    casesClient,
    spaceId,
    endpointService,
    username,
    connectorActions: connectorActionsClient,
    // NOT setting isAutomated: true - this is critical for 'execute' to work
  });

  return { client, spaceId };
}

export async function getHostStatus(
  endpointIds: string[],
  deps: FleetManagementSkillDeps,
  spaceId: string
): Promise<any[]> {
  const endpointService = deps.getEndpointAppContextService();
  const metadataService = endpointService.getEndpointMetadataService(spaceId);

  const results = [];
  for (const endpointId of endpointIds) {
    try {
      const hostInfo = await metadataService.getEnrichedHostMetadata(endpointId);
      results.push({
        endpoint_id: endpointId,
        hostname: hostInfo.metadata.host.hostname,
        host_status: hostInfo.host_status,
        os: hostInfo.metadata.host.os,
        agent_version: hostInfo.metadata.agent.version,
        policy_info: hostInfo.policy_info,
        last_checkin: hostInfo.last_checkin,
        isolation_status: hostInfo.metadata.Endpoint?.state?.isolation ? 'isolated' : 'not_isolated',
      });
    } catch (error) {
      results.push({
        endpoint_id: endpointId,
        error: `Failed to get status: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return results;
}

export function createFleetManagementSkill(deps: FleetManagementSkillDeps): SkillDefinition {
  return {
    id: 'security.fleet_management',
    name: 'Fleet Management Response Actions',
    description: `Execute endpoint response actions on managed hosts using console-style command strings.

Parameters:
- command_string: The full command with flags (e.g., "execute --command ps -aux --comment checking processes")
- endpoint_ids: Array of endpoint IDs to target

Available commands and their flags:
- isolate [--comment <text>] - Isolate the host from the network
- release [--comment <text>] - Release the host from isolation
- status - Show host status information
- processes [--comment <text>] - List all running processes
- kill-process --entityId <id> | --pid <number> [--comment <text>] - Terminate a process
- suspend-process --entityId <id> | --pid <number> [--comment <text>] - Suspend a process
- get-file --path <filepath> [--comment <text>] - Retrieve a file from the host
- execute --command <shell_command> [--timeout <ms>] [--comment <text>] - Execute a shell command
- scan --path <filepath> [--comment <text>] - Scan a path for malware`,
    category: 'security',
    inputSchema: fleetManagementSchema,
    examples: [
      // Execute a shell command on an endpoint
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"execute --command whoami","endpoint_ids":["<endpoint_uuid>"]}})',
      // Execute ps -aux with a comment
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"execute --command ps -aux --comment checking processes","endpoint_ids":["<endpoint_uuid>"]}})',
      // Isolate a host
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"isolate --comment Investigating suspicious activity","endpoint_ids":["<endpoint_uuid>"]}})',
      // Release a host from isolation
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"release --comment Investigation complete","endpoint_ids":["<endpoint_uuid>"]}})',
      // Get host status
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"status","endpoint_ids":["<endpoint_uuid>"]}})',
      // List running processes
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"processes","endpoint_ids":["<endpoint_uuid>"]}})',
      // Kill a process by entity ID
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"kill-process --entityId <process_entity_id>","endpoint_ids":["<endpoint_uuid>"]}})',
      // Kill a process by PID
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"kill-process --pid 1234","endpoint_ids":["<endpoint_uuid>"]}})',
      // Get a file from the host
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"get-file --path /etc/passwd --comment retrieving file","endpoint_ids":["<endpoint_uuid>"]}})',
      // Scan a path for malware
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"scan --path /var/log --comment scanning logs","endpoint_ids":["<endpoint_uuid>"]}})',
    ],
    handler: async (params, context) => {
      const {
        command_string,
        endpoint_ids,
        agent_type = 'endpoint',
      } = params as z.infer<typeof fleetManagementSchema>;

      // Use logger from context if available, otherwise from deps
      const logger = 'logger' in context ? (context as ToolHandlerContext).logger : deps.logger;

      let parsedCommand: ParsedCommand;
      try {
        parsedCommand = parseCommandString(command_string);
      } catch (parseError) {
        return {
          error: `Failed to parse command: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          command_string,
          help: `Valid commands: ${VALID_COMMANDS.join(', ')}. Use --flag value syntax for parameters.`,
        };
      }

      const { action, comment, path, command: shellCommand, entityId, pid, timeout } = parsedCommand;

      try {
        // Handle status command separately as it doesn't use response actions client
        if (action === 'status') {
          const spaceId = 'default';
          const statusResults = await getHostStatus(endpoint_ids, deps, spaceId);
          return {
            command: action,
            endpoint_ids,
            results: statusResults,
          };
        }

        // Get response actions client
        const { client } = await getResponseActionsClientFromContext(
          context,
          deps,
          agent_type as ResponseActionAgentType
        );

        const baseRequestBody = {
          endpoint_ids,
          comment,
        };

        let actionResult;

        switch (action) {
          case 'isolate':
            actionResult = await client.isolate(baseRequestBody);
            break;

          case 'release':
            actionResult = await client.release(baseRequestBody);
            break;

          case 'processes':
            actionResult = await client.runningProcesses(baseRequestBody);
            break;

          case 'kill-process':
            if (!pid && !entityId) {
              return {
                error: 'kill-process requires either --pid or --entityId flag',
                help: 'Example: kill-process --pid 1234 or kill-process --entityId abc-123',
              };
            }
            actionResult = await client.killProcess({
              ...baseRequestBody,
              parameters: pid ? { pid } : { entity_id: entityId! },
            });
            break;

          case 'suspend-process':
            if (!pid && !entityId) {
              return {
                error: 'suspend-process requires either --pid or --entityId flag',
                help: 'Example: suspend-process --pid 1234 or suspend-process --entityId abc-123',
              };
            }
            actionResult = await client.suspendProcess({
              ...baseRequestBody,
              parameters: pid ? { pid } : { entity_id: entityId! },
            });
            break;

          case 'get-file':
            if (!path) {
              return {
                error: 'get-file requires --path flag',
                help: 'Example: get-file --path /etc/passwd',
              };
            }
            actionResult = await client.getFile({
              ...baseRequestBody,
              parameters: { path },
            });
            break;

          case 'execute':
            if (!shellCommand) {
              return {
                error: 'execute requires --command flag',
                help: 'Example: execute --command "ps -aux" or execute --command whoami',
              };
            }
            actionResult = await client.execute({
              ...baseRequestBody,
              parameters: {
                command: shellCommand,
                ...(timeout && { timeout }),
              },
            });
            break;

          case 'scan':
            if (!path) {
              return {
                error: 'scan requires --path flag',
                help: 'Example: scan --path /var/log',
              };
            }
            actionResult = await client.scan({
              ...baseRequestBody,
              parameters: { path },
            });
            break;

          default:
            return {
              error: `Unknown command: ${action}`,
              available_commands: VALID_COMMANDS,
            };
        }

        return {
          command: action,
          action_id: actionResult.id,
          status: actionResult.status,
          endpoint_ids,
          agents: actionResult.agents,
          started_at: actionResult.startedAt,
          comment: actionResult.comment,
          created_by: actionResult.createdBy,
          message: `Response action '${action}' initiated successfully`,
        };
      } catch (error) {
        logger.error(`Error executing fleet management action: ${error}`);
        return {
          error: `Failed to execute ${action}: ${error instanceof Error ? error.message : String(error)}`,
          command: action,
          endpoint_ids,
        };
      }
    },
  };
}

