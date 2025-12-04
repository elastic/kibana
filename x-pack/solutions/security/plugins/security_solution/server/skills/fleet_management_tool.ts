/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ToolHandlerContext } from '@kbn/onechat-server';
import type { SkillTool } from '@kbn/agent-skills-common';
import type { EndpointAppContextService } from '../endpoint/endpoint_app_context_services';
import type { ResponseActionAgentType } from '../../common/endpoint/service/response_actions/constants';
import {
  fleetManagementSchema,
  parseCommandString,
  getResponseActionsClientFromContext,
  getHostStatus,
  VALID_COMMANDS,
  type ParsedCommand,
} from './fleet_management_skill';

interface FleetManagementToolDeps {
  coreSetup: CoreSetup<any, any>;
  getEndpointAppContextService: () => EndpointAppContextService;
  logger: Logger;
}

export function getFleetManagementSkillTool(
  deps: FleetManagementToolDeps
): SkillTool<typeof fleetManagementSchema> {
  return {
    id: 'security.fleet_management',
    name: 'Fleet Management Response Actions',
    shortDescription: 'Execute endpoint response actions on managed hosts',
    fullDescription: `Execute endpoint response actions on managed hosts using console-style command strings.

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
    categories: ['security'],
    inputSchema: fleetManagementSchema,
    examples: [
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"execute --command whoami","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"execute --command ps -aux --comment checking processes","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"isolate --comment Investigating suspicious activity","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"release --comment Investigation complete","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"status","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"processes","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"kill-process --entityId <process_entity_id>","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"kill-process --pid 1234","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"get-file --path /etc/passwd --comment retrieving file","endpoint_ids":["<endpoint_uuid>"]}})',
      'tool("invoke_skill", {"skillId":"security.fleet_management","params":{"command_string":"scan --path /var/log --comment scanning logs","endpoint_ids":["<endpoint_uuid>"]}})',
    ],
    handler: async (params, context) => {
      const {
        command_string,
        endpoint_ids,
        agent_type = 'endpoint',
      } = params;

      const logger =
        'logger' in context ? (context as ToolHandlerContext).logger : deps.logger;

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

      const { action, comment, path, command: shellCommand, entityId, pid, timeout } =
        parsedCommand;

      try {
        // Handle status command separately as it doesn't use response actions client
        if (action === 'status') {
          const spaceId = 'default';
          const statusResults = await getHostStatus(
            endpoint_ids,
            {
              coreSetup: deps.coreSetup,
              getEndpointAppContextService: deps.getEndpointAppContextService,
              logger: deps.logger,
            },
            spaceId
          );
          return {
            command: action,
            endpoint_ids,
            results: statusResults,
          };
        }

        // Get response actions client
        const { client } = await getResponseActionsClientFromContext(
          context,
          {
            coreSetup: deps.coreSetup,
            getEndpointAppContextService: deps.getEndpointAppContextService,
            logger: deps.logger,
          },
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

