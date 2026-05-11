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
import {
  UnsupportedAgentTypeError,
  UnsupportedCommandForAgentTypeError,
  MissingConnectorActionsError,
} from './errors';

export {
  UnsupportedAgentTypeError,
  UnsupportedCommandForAgentTypeError,
  MissingConnectorActionsError,
};

/**
 * Lookup callback used by the runner to resolve `(emulationId) -> ruleId/ruleName`
 * via the `emulation-rule-binding` saved object. Returning `undefined`
 * means the emulation is not bound to a rule, in which case the
 * dispatched action carries `ruleId: undefined`/`ruleName: undefined` —
 * the same shape it had before this lookup was wired.
 */
export type EmulationRuleBindingLookup = (
  emulationId: string
) => Promise<{ ruleId: string; ruleName?: string } | undefined>;

export interface EmulationRunnerOptions {
  endpointService: EndpointAppContextService;
  esClient: ElasticsearchClient;
  spaceId: string;
  casesClient?: CasesClient;
  username: string;
  logger: Logger;
  /** Required for non-endpoint agent types (sentinel_one, crowdstrike, microsoft_defender_endpoint). */
  connectorActions?: NormalizedExternalConnectorClient;
  /** Optional: resolves `(emulationId) -> rule binding` so dispatched actions carry rule context. */
  ruleBindingLookup?: EmulationRuleBindingLookup;
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
 * Vendor-agnostic emulation runner.
 *
 * Validates `agentType`, looks up the rule binding (if any), instantiates
 * the matching `ResponseActionsClient`, then dispatches the typed
 * request via `dispatch()`. The `dispatch()` switch is exhaustive over
 * the discriminated `RunEmulationCommandInput.command` union — a new
 * value in `RESPONSE_ACTION_API_COMMANDS_NAMES` will fail the build
 * here at the `_exhaustive: never` line until the case is added.
 */
export class EmulationRunner {
  private readonly endpointService: EndpointAppContextService;
  private readonly esClient: ElasticsearchClient;
  private readonly spaceId: string;
  private readonly casesClient?: CasesClient;
  private readonly username: string;
  private readonly logger: Logger;
  private readonly connectorActions?: NormalizedExternalConnectorClient;
  private readonly ruleBindingLookup?: EmulationRuleBindingLookup;

  constructor(options: EmulationRunnerOptions) {
    this.endpointService = options.endpointService;
    this.esClient = options.esClient;
    this.spaceId = options.spaceId;
    this.casesClient = options.casesClient;
    this.username = options.username;
    this.logger = options.logger;
    this.connectorActions = options.connectorActions;
    this.ruleBindingLookup = options.ruleBindingLookup;
  }

  /**
   * Execute a validated emulation command.
   *
   * Throws on inputs that should fail before any side effects:
   *   - `UnsupportedAgentTypeError`: schema slipped through with a bad agentType.
   *   - `UnsupportedCommandForAgentTypeError`: combination is rejected by `isActionSupportedByAgentType`.
   *   - `MissingConnectorActionsError`: non-endpoint agent type but no `connectorActions` was wired.
   *
   * Returns `{ status: 'error' }` for failures originating *inside* the
   * underlying response-actions client (Fleet down, connector
   * unavailable, etc.). The route maps each error class to a status code.
   */
  async run(input: RunEmulationCommandInput): Promise<RunEmulationResult> {
    const { emulationId, agentType, endpointIds, command } = input;

    this.logger.debug(
      `Executing emulation command [${command}] for emulation [${emulationId}] on agent type [${agentType}] targeting [${endpointIds.length}] endpoints`
    );

    if (!RESPONSE_ACTION_AGENT_TYPE.includes(agentType)) {
      throw new UnsupportedAgentTypeError(agentType);
    }

    // Emulation commands are manual/interactive — never automated.
    const actionType = 'manual' as const;
    if (!isActionSupportedByAgentType(agentType, command, actionType)) {
      throw new UnsupportedCommandForAgentTypeError(command, agentType);
    }

    // Non-endpoint clients require a `connectorActions` instance.
    // The current route does not resolve one, so reject here with a
    // clear, typed error rather than handing `undefined` to the
    // upstream client and crashing inside its constructor.
    if (agentType !== 'endpoint' && !this.connectorActions) {
      throw new MissingConnectorActionsError(agentType);
    }

    // Trace-only: the underlying ResponseActionsClient is the
    // authoritative RBAC enforcer; we just log what privilege would be
    // required for observability. The RBAC map does not cover every
    // console command (e.g. `cancel` has no dedicated privilege today),
    // so we treat a missing entry as "no extra privilege needed" rather
    // than a hard error.
    const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command];
    const rbacMap = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL as Record<
      string,
      string | undefined
    >;
    const requiredRbac = rbacMap[consoleCommand];
    if (requiredRbac) {
      this.logger.debug(
        `Command [${command}] requires RBAC privilege [${requiredRbac}] (validation delegated to ResponseActionsClient)`
      );
    }

    const ruleBinding = await this.resolveRuleBinding(emulationId);

    try {
      const responseActionsClient = this.createResponseActionsClient(agentType);
      const actionDetails = await this.dispatch(responseActionsClient, input, ruleBinding);

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

  private async resolveRuleBinding(
    emulationId: string
  ): Promise<{ ruleId?: string; ruleName?: string }> {
    if (!this.ruleBindingLookup) {
      return {};
    }
    try {
      const binding = await this.ruleBindingLookup(emulationId);
      return binding ?? {};
    } catch (err) {
      // A missing binding is fine. Log unexpected lookup errors but do
      // not block dispatch — the action just lands without rule context.
      this.logger.warn(
        `Failed to look up rule binding for emulation [${emulationId}]: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return {};
    }
  }

  private createResponseActionsClient(agentType: ResponseActionAgentType): ResponseActionsClient {
    const constructorOptions = {
      endpointService: this.endpointService,
      esClient: this.esClient,
      spaceId: this.spaceId,
      casesClient: this.casesClient,
      username: this.username,
      isAutomated: false,
      // Safe: validated above — non-endpoint agent types require this.connectorActions and
      // we throw `MissingConnectorActionsError` before reaching this point if it's missing.
      connectorActions: this.connectorActions as NormalizedExternalConnectorClient,
    } satisfies GetResponseActionsClientConstructorOptions;

    return getResponseActionsClient(agentType, constructorOptions);
  }

  /**
   * Build the typed request and dispatch to the matching
   * `ResponseActionsClient` method. The discriminated union on
   * `RunEmulationCommandInput.command` lets each `case` access the
   * exact `parameters` shape that command needs without `as` casts —
   * a misnamed key is rejected at the schema layer.
   */
  private async dispatch(
    client: ResponseActionsClient,
    input: RunEmulationCommandInput,
    ruleBinding: { ruleId?: string; ruleName?: string }
  ): Promise<ActionDetails> {
    const { emulationId, command, endpointIds } = input;
    const userComment = input.parameters?.comment;
    const comment = buildEmulationComment(emulationId, command, userComment);
    const base = { endpoint_ids: endpointIds, comment };
    const options: CommonResponseActionMethodOptions = {
      ruleId: ruleBinding.ruleId,
      ruleName: ruleBinding.ruleName,
    };

    switch (input.command) {
      case 'isolate':
        return client.isolate(base, options);

      case 'unisolate':
        return client.release(base, options);

      case 'kill-process':
        // Schema guarantees exactly one of `pid` or `entity_id` is present.
        return client.killProcess(
          {
            ...base,
            parameters:
              'pid' in input.parameters
                ? { pid: input.parameters.pid }
                : { entity_id: input.parameters.entity_id },
          },
          options
        );

      case 'suspend-process':
        return client.suspendProcess(
          {
            ...base,
            parameters:
              'pid' in input.parameters
                ? { pid: input.parameters.pid }
                : { entity_id: input.parameters.entity_id },
          },
          options
        );

      case 'running-processes':
        return client.runningProcesses(base, options);

      case 'get-file':
        return client.getFile({ ...base, parameters: { path: input.parameters.path } }, options);

      case 'execute':
        return client.execute(
          {
            ...base,
            parameters: {
              command: input.parameters.command,
              timeout: input.parameters.timeout,
            },
          },
          options
        );

      case 'upload':
        return client.upload(
          {
            ...base,
            file: input.parameters.file as Parameters<ResponseActionsClient['upload']>[0]['file'],
            parameters: { overwrite: input.parameters.overwrite ?? false },
          },
          options
        );

      case 'scan':
        return client.scan({ ...base, parameters: { path: input.parameters.path } }, options);

      case 'runscript':
        // Schema is constrained to the endpoint shape today (one wired agent
        // type). The downstream client signature is broad (cross-EDR), so we
        // narrow with a single cast at the boundary.
        return client.runscript(
          {
            ...base,
            parameters: {
              scriptId: input.parameters.scriptId,
              scriptInput: input.parameters.scriptInput,
              timeout: input.parameters.timeout,
            },
          } as Parameters<ResponseActionsClient['runscript']>[0],
          options
        );

      case 'cancel':
        return client.cancel({ ...base, parameters: { id: input.parameters.id } }, options);

      case 'memory-dump': {
        // Inner discriminated union: `kernel` carries no pid/entity_id; the two
        // `process` variants carry exactly one of pid or entity_id.
        const memoryParams =
          input.parameters.type === 'kernel'
            ? { type: 'kernel' as const }
            : 'pid' in input.parameters
            ? { type: 'process' as const, pid: input.parameters.pid }
            : { type: 'process' as const, entity_id: input.parameters.entity_id };
        return client.memoryDump({ ...base, parameters: memoryParams }, options);
      }

      default: {
        // Exhaustiveness check: a new value in `RESPONSE_ACTION_API_COMMANDS_NAMES`
        // (and a corresponding schema variant) must add a case above — the
        // `satisfies never` makes the build fail when a variant goes
        // unhandled. At runtime we throw a typed error so an unexpected
        // value (e.g. forced via `as any` in tests) maps cleanly to a 400.
        const exhaustiveCheck: never = input;
        void exhaustiveCheck;
        throw new UnsupportedCommandForAgentTypeError(
          (input as RunEmulationCommandInput).command,
          (input as RunEmulationCommandInput).agentType
        );
      }
    }
  }
}
