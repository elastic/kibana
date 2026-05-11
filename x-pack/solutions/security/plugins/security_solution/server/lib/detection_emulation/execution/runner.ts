/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { RunEmulationCommandInput } from '../../../../common/detection_emulation/schemas';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL,
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
} from '../../../../common/endpoint/service/response_actions/constants';
import { isActionSupportedByAgentType } from '../../../../common/endpoint/service/response_actions/is_response_action_supported';
import type {
  ResponseActionsClient,
  CommonResponseActionMethodOptions,
} from '../../../endpoint/services/actions/clients/lib/types';
import type { GetResponseActionsClientConstructorOptions } from '../../../endpoint/services/actions/clients/get_response_actions_client';
import { getResponseActionsClient } from '../../../endpoint/services/actions/clients/get_response_actions_client';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { ActionDetails } from '../../../../common/endpoint/types';
import type { NormalizedExternalConnectorClient } from '../../../endpoint/services/actions/clients/lib/normalized_external_connector_client';
import { buildEmulationComment } from './audit_logger';

export interface EmulationRunnerOptions {
  endpointService: EndpointAppContextService;
  esClient: ElasticsearchClient;
  spaceId: string;
  casesClient?: CasesClient;
  username: string;
  logger: Logger;
  /** Required for non-endpoint agent types (sentinel_one, crowdstrike, microsoft_defender_endpoint) */
  connectorActions?: NormalizedExternalConnectorClient;
}

export interface RunEmulationResult {
  actionId: string;
  agentType: ResponseActionAgentType;
  command: string;
  status: 'dispatched' | 'error';
  error?: string;
  actionDetails?: ActionDetails;
}

/**
 * Vendor-agnostic emulation runner that dispatches commands to the appropriate
 * ResponseActionsClient based on the agentType.
 *
 * This is the core execution layer that:
 * - Validates agentType against RESPONSE_ACTION_AGENT_TYPE
 * - Checks command support for the given agentType
 * - Validates RBAC requirements via RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL
 * - Forwards the command to ResponseActionsClient with reason: 'emulation:<emulationId>'
 * - Leverages existing response_actions audit trail, RBAC model, and connector registry
 */
export class EmulationRunner {
  private readonly endpointService: EndpointAppContextService;
  private readonly esClient: ElasticsearchClient;
  private readonly spaceId: string;
  private readonly casesClient?: CasesClient;
  private readonly username: string;
  private readonly logger: Logger;
  private readonly connectorActions?: NormalizedExternalConnectorClient;

  constructor(options: EmulationRunnerOptions) {
    this.endpointService = options.endpointService;
    this.esClient = options.esClient;
    this.spaceId = options.spaceId;
    this.casesClient = options.casesClient;
    this.username = options.username;
    this.logger = options.logger;
    this.connectorActions = options.connectorActions;
  }

  /**
   * Execute an emulation command against the specified endpoints.
   *
   * @param input - The validated emulation command input
   * @returns Result containing action ID and dispatch status
   * @throws Error if agentType is not supported or command is not available for the agent type
   */
  async run(input: RunEmulationCommandInput): Promise<RunEmulationResult> {
    const { emulationId, agentType, endpointIds, command, parameters } = input;

    this.logger.debug(
      `Executing emulation command [${command}] for emulation [${emulationId}] on agent type [${agentType}] targeting [${endpointIds.length}] endpoints`
    );

    // Validate agentType is supported
    if (!RESPONSE_ACTION_AGENT_TYPE.includes(agentType)) {
      const error = `Agent type [${agentType}] is not supported. Supported types: ${RESPONSE_ACTION_AGENT_TYPE.join(
        ', '
      )}`;
      this.logger.error(error);
      throw new Error(error);
    }

    // Check if the command is supported by this agent type (emulation commands are manual/interactive)
    const actionType = 'manual' as const;
    if (!isActionSupportedByAgentType(agentType, command, actionType)) {
      const error = `Command [${command}] is not supported for agent type [${agentType}]`;
      this.logger.error(error);
      throw new Error(error);
    }

    // Get the console command for RBAC validation
    const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command];
    const requiredRbac = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL[consoleCommand];

    if (requiredRbac) {
      this.logger.debug(
        `Command [${command}] requires RBAC privilege [${requiredRbac}] (validation delegated to ResponseActionsClient)`
      );
    }

    try {
      // Create the response actions client for this agent type
      const responseActionsClient = this.createResponseActionsClient(agentType);

      // Build the request and dispatch in a single typed call
      const actionDetails = await this.dispatch(
        responseActionsClient,
        command,
        endpointIds,
        parameters,
        emulationId
      );

      this.logger.info(
        `Successfully dispatched emulation command [${command}] for emulation [${emulationId}], action ID: ${actionDetails.id}`
      );

      return {
        actionId: actionDetails.id,
        agentType,
        command,
        status: 'dispatched',
        actionDetails,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to execute emulation command [${command}] for emulation [${emulationId}]: ${errorMessage}`
      );

      return {
        actionId: '',
        agentType,
        command,
        status: 'error',
        error: errorMessage,
      };
    }
  }

  /**
   * Create a ResponseActionsClient instance for the given agent type.
   */
  private createResponseActionsClient(agentType: ResponseActionAgentType): ResponseActionsClient {
    const constructorOptions = {
      endpointService: this.endpointService,
      esClient: this.esClient,
      spaceId: this.spaceId,
      casesClient: this.casesClient,
      username: this.username,
      isAutomated: false, // Emulation commands are manual/interactive
      // connectorActions is required by non-endpoint clients (sentinel_one, crowdstrike, etc.)
      // EndpointActionsClient ignores this field so the cast is safe for agentType === 'endpoint'
      connectorActions: this.connectorActions as NormalizedExternalConnectorClient,
    } satisfies GetResponseActionsClientConstructorOptions;

    return getResponseActionsClient(agentType, constructorOptions);
  }

  /**
   * Build the typed request and dispatch to the appropriate ResponseActionsClient method.
   * Collapses request construction and dispatch into a single switch so each case can
   * use the exact type expected by the corresponding client method.
   */
  private async dispatch(
    client: ResponseActionsClient,
    command: string,
    endpointIds: string[],
    parameters: Record<string, unknown> | undefined,
    emulationId: string
  ): Promise<ActionDetails> {
    const comment = buildEmulationComment(
      emulationId,
      command,
      parameters?.comment as string | undefined
    );
    const base = { endpoint_ids: endpointIds, comment };
    const options: CommonResponseActionMethodOptions = { ruleId: undefined, ruleName: undefined };

    switch (command) {
      case 'isolate':
        return client.isolate(base, options);

      case 'unisolate':
        return client.release(base, options);

      case 'kill-process':
        return client.killProcess(
          {
            ...base,
            parameters: {
              pid: parameters?.pid as number | undefined,
              entity_id: parameters?.entity_id as string | undefined,
            },
          },
          options
        );

      case 'suspend-process':
        return client.suspendProcess(
          {
            ...base,
            parameters: {
              pid: parameters?.pid as number | undefined,
              entity_id: parameters?.entity_id as string | undefined,
            },
          },
          options
        );

      case 'running-processes':
        return client.runningProcesses(base, options);

      case 'get-file':
        return client.getFile(
          { ...base, parameters: { path: (parameters?.path as string) ?? '' } },
          options
        );

      case 'execute':
        return client.execute(
          {
            ...base,
            parameters: {
              command: (parameters?.command as string) ?? '',
              timeout: parameters?.timeout as number | undefined,
            },
          },
          options
        );

      case 'upload':
        return client.upload(
          {
            ...base,
            file: parameters?.file as Parameters<ResponseActionsClient['upload']>[0]['file'],
            parameters: { overwrite: (parameters?.overwrite as boolean) ?? false },
          },
          options
        );

      case 'scan':
        return client.scan(
          { ...base, parameters: { path: (parameters?.path as string) ?? '' } },
          options
        );

      case 'runscript':
        return client.runscript(
          {
            ...base,
            parameters: {
              script: (parameters?.script as string) ?? '',
              timeout: parameters?.timeout as number | undefined,
            },
          },
          options
        );

      case 'cancel':
        return client.cancel(base, options);

      case 'memory-dump':
        return client.memoryDump(
          {
            ...base,
            parameters: {
              pid: parameters?.pid as number | undefined,
              entity_id: parameters?.entity_id as string | undefined,
            },
          },
          options
        );

      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }
}
