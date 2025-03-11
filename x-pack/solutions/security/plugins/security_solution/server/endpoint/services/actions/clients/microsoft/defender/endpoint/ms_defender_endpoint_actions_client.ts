/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import {
  MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/constants';
import type {
  MicrosoftDefenderEndpointGetActionsParams,
  MicrosoftDefenderEndpointGetActionsResponse,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import {
  type MicrosoftDefenderEndpointAgentDetailsParams,
  type MicrosoftDefenderEndpointIsolateHostParams,
  type MicrosoftDefenderEndpointMachine,
  type MicrosoftDefenderEndpointMachineAction,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import { groupBy } from 'lodash';
import type {
  IsolationRouteRequestBody,
  UnisolationRouteRequestBody,
} from '../../../../../../../../common/api/endpoint';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  MicrosoftDefenderEndpointActionRequestCommonMeta,
} from '../../../../../../../../common/endpoint/types';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../../../../../common/endpoint/service/response_actions/constants';
import type { NormalizedExternalConnectorClient } from '../../../lib/normalized_external_connector_client';
import type {
  ResponseActionsClientPendingAction,
  ResponseActionsClientValidateRequestResponse,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
} from '../../../lib/base_response_actions_client';
import {
  ResponseActionsClientImpl,
  type ResponseActionsClientOptions,
} from '../../../lib/base_response_actions_client';
import { stringify } from '../../../../../../utils/stringify';
import { ResponseActionsClientError } from '../../../errors';
import type {
  CommonResponseActionMethodOptions,
  ProcessPendingActionsMethodOptions,
} from '../../../lib/types';

export type MicrosoftDefenderActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: NormalizedExternalConnectorClient;
};

export class MicrosoftDefenderEndpointActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'microsoft_defender_endpoint';
  private readonly connectorActionsClient: NormalizedExternalConnectorClient;

  constructor({ connectorActions, ...options }: MicrosoftDefenderActionsClientOptions) {
    super(options);
    this.connectorActionsClient = connectorActions;
    connectorActions.setup(MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID);
  }

  protected async handleResponseActionCreation<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    actionRequestOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      TMeta
    >
  ): Promise<{
    actionEsDoc: LogsEndpointAction<TParameters, TOutputContent, TMeta>;
    actionDetails: ActionDetails<TOutputContent, TParameters>;
  }> {
    const actionRequestDoc = await this.writeActionRequestToEndpointIndex<
      TParameters,
      TOutputContent,
      TMeta
    >(actionRequestOptions);

    await this.updateCases({
      command: actionRequestOptions.command,
      caseIds: actionRequestOptions.case_ids,
      alertIds: actionRequestOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: actionRequestOptions.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: actionRequestOptions.comment,
    });

    return {
      actionEsDoc: actionRequestDoc,
      actionDetails: await this.fetchActionDetails<ActionDetails<TOutputContent, TParameters>>(
        actionRequestDoc.EndpointActions.action_id
      ),
    };
  }

  /**
   * Sends actions to Ms Defender for Endpoint directly (via Connector)
   * @private
   */
  private async sendAction<
    TResponse = unknown,
    TParams extends Record<string, unknown> = Record<string, unknown>
  >(
    actionType: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
    actionParams: TParams
  ): Promise<ActionTypeExecutorResult<TResponse>> {
    const executeOptions: Parameters<typeof this.connectorActionsClient.execute>[0] = {
      params: {
        subAction: actionType,
        subActionParams: actionParams,
      },
    };

    this.log.debug(
      () =>
        `calling connector actions 'execute()' for Microsoft Defender for Endpoint with:\n${stringify(
          executeOptions
        )}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    if (actionSendResponse.status === 'error') {
      this.log.error(stringify(actionSendResponse));

      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to Microsoft Defender for Endpoint failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    }

    this.log.debug(() => `Response:\n${stringify(actionSendResponse)}`);

    return actionSendResponse as ActionTypeExecutorResult<TResponse>;
  }

  protected async writeActionRequestToEndpointIndex<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = MicrosoftDefenderEndpointActionRequestCommonMeta
  >(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      TMeta
    >
  ): Promise<LogsEndpointAction<TParameters, TOutputContent, TMeta>> {
    const agentId = actionRequest.endpoint_ids[0];
    const agentDetails = await this.getAgentDetails(agentId);

    const doc = await super.writeActionRequestToEndpointIndex<TParameters, TOutputContent, TMeta>({
      ...actionRequest,
      hosts: {
        [agentId]: { name: agentDetails.computerDnsName },
      },
    });

    return doc;
  }

  /** Gets agent details directly from MS Defender for Endpoint */
  private async getAgentDetails(agentId: string): Promise<MicrosoftDefenderEndpointMachine> {
    const cachedEntry = this.cache.get<MicrosoftDefenderEndpointMachine>(agentId);

    if (cachedEntry) {
      this.log.debug(
        `Found cached agent details for UUID [${agentId}]:\n${stringify(cachedEntry)}`
      );
      return cachedEntry;
    }

    let msDefenderEndpointGetMachineDetailsApiResponse:
      | MicrosoftDefenderEndpointMachine
      | undefined;

    try {
      const agentDetailsResponse = await this.sendAction<
        MicrosoftDefenderEndpointMachine,
        MicrosoftDefenderEndpointAgentDetailsParams
      >(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_DETAILS, { id: agentId });

      msDefenderEndpointGetMachineDetailsApiResponse = agentDetailsResponse.data;
    } catch (err) {
      throw new ResponseActionsClientError(
        `Error while attempting to retrieve Microsoft Defender for Endpoint host with agent id [${agentId}]: ${err.message}`,
        500,
        err
      );
    }

    if (!msDefenderEndpointGetMachineDetailsApiResponse) {
      throw new ResponseActionsClientError(
        `Microsoft Defender for Endpoint agent id [${agentId}] not found`,
        404
      );
    }

    this.cache.set(agentId, msDefenderEndpointGetMachineDetailsApiResponse);

    return msDefenderEndpointGetMachineDetailsApiResponse;
  }

  protected async validateRequest(
    payload: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<ResponseActionsClientValidateRequestResponse> {
    // TODO: support multiple agents
    if (payload.endpoint_ids.length > 1) {
      return {
        isValid: false,
        error: new ResponseActionsClientError(
          `[body.endpoint_ids]: Multiple agents IDs not currently supported for Microsoft Defender for Endpoint`,
          400
        ),
      };
    }

    return super.validateRequest(payload);
  }

  async isolate(
    actionRequest: IsolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      undefined,
      {},
      MicrosoftDefenderEndpointActionRequestCommonMeta
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'isolate',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          const msActionResponse = await this.sendAction<
            MicrosoftDefenderEndpointMachineAction,
            MicrosoftDefenderEndpointIsolateHostParams
          >(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.ISOLATE_HOST, {
            id: actionRequest.endpoint_ids[0],
            comment: this.buildExternalComment(reqIndexOptions),
          });

          if (msActionResponse?.data?.id) {
            reqIndexOptions.meta = { machineActionId: msActionResponse.data.id };
          } else {
            throw new ResponseActionsClientError(
              `Isolate request was sent to Microsoft Defender, but Machine Action Id was not provided!`
            );
          }
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const { actionDetails } = await this.handleResponseActionCreation(reqIndexOptions);

    return actionDetails;
  }

  async release(
    actionRequest: UnisolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      undefined,
      {},
      MicrosoftDefenderEndpointActionRequestCommonMeta
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'unisolate',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          const msActionResponse = await this.sendAction<
            MicrosoftDefenderEndpointMachineAction,
            MicrosoftDefenderEndpointIsolateHostParams
          >(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RELEASE_HOST, {
            id: actionRequest.endpoint_ids[0],
            comment: this.buildExternalComment(reqIndexOptions),
          });

          if (msActionResponse?.data?.id) {
            reqIndexOptions.meta = { machineActionId: msActionResponse.data.id };
          } else {
            throw new ResponseActionsClientError(
              `Un-Isolate request was sent to Microsoft Defender, but Machine Action Id was not provided!`
            );
          }
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const { actionDetails } = await this.handleResponseActionCreation(reqIndexOptions);

    return actionDetails;
  }

  async processPendingActions({
    abortSignal,
    addToQueue,
  }: ProcessPendingActionsMethodOptions): Promise<void> {
    if (abortSignal.aborted) {
      return;
    }

    const addResponsesToQueueIfAny = (responseList: LogsEndpointActionResponse[]): void => {
      if (responseList.length > 0) {
        addToQueue(...responseList);

        this.sendActionResponseTelemetry(responseList);
      }
    };

    for await (const pendingActions of this.fetchAllPendingActions<
      EndpointActionDataParameterTypes,
      EndpointActionResponseDataOutput,
      MicrosoftDefenderEndpointActionRequestCommonMeta
    >()) {
      if (abortSignal.aborted) {
        return;
      }

      const pendingActionsByType = groupBy(pendingActions, 'action.EndpointActions.data.command');

      for (const [actionType, typePendingActions] of Object.entries(pendingActionsByType)) {
        if (abortSignal.aborted) {
          return;
        }

        switch (actionType as ResponseActionsApiCommandNames) {
          case 'isolate':
          case 'unisolate':
            addResponsesToQueueIfAny(
              await this.checkPendingIsolateReleaseActions(
                typePendingActions as Array<
                  ResponseActionsClientPendingAction<
                    undefined,
                    {},
                    MicrosoftDefenderEndpointActionRequestCommonMeta
                  >
                >
              )
            );
        }
      }
    }
  }

  private async checkPendingIsolateReleaseActions(
    actionRequests: Array<
      ResponseActionsClientPendingAction<
        undefined,
        {},
        MicrosoftDefenderEndpointActionRequestCommonMeta
      >
    >
  ): Promise<LogsEndpointActionResponse[]> {
    const completedResponses: LogsEndpointActionResponse[] = [];
    const warnings: string[] = [];
    const actionsByMachineId: Record<
      string,
      Array<LogsEndpointAction<undefined, {}, MicrosoftDefenderEndpointActionRequestCommonMeta>>
    > = {};
    const machineActionIds: string[] = [];
    const msApiOptions: MicrosoftDefenderEndpointGetActionsParams = {
      id: machineActionIds,
      pageSize: 1000,
    };

    for (const { action } of actionRequests) {
      const command = action.EndpointActions.data.command;
      const machineActionId = action.meta?.machineActionId;

      if (!machineActionId) {
        warnings.push(
          `${command} response action ID [${action.EndpointActions.action_id}] is missing Microsoft Defender for Endpoint machine action id, thus unable to check on it's status. Forcing it to complete as failure.`
        );

        completedResponses.push(
          this.buildActionResponseEsDoc({
            actionId: action.EndpointActions.action_id,
            agentId: Array.isArray(action.agent.id) ? action.agent.id[0] : action.agent.id,
            data: { command },
            error: {
              message: `Unable to very if action completed. Microsoft Defender machine action id ('meta.machineActionId') missing on action request document!`,
            },
          })
        );
      } else {
        if (!actionsByMachineId[machineActionId]) {
          actionsByMachineId[machineActionId] = [];
        }

        actionsByMachineId[machineActionId].push(action);
        machineActionIds.push(machineActionId);
      }
    }

    const { data: machineActions } =
      await this.sendAction<MicrosoftDefenderEndpointGetActionsResponse>(
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
        msApiOptions
      );

    if (machineActions?.value) {
      for (const machineAction of machineActions.value) {
        const { isPending, isError, message } = this.calculateMachineActionState(machineAction);

        if (!isPending) {
          const pendingActionRequests = actionsByMachineId[machineAction.id] ?? [];

          for (const actionRequest of pendingActionRequests) {
            completedResponses.push(
              this.buildActionResponseEsDoc({
                actionId: actionRequest.EndpointActions.action_id,
                agentId: Array.isArray(actionRequest.agent.id)
                  ? actionRequest.agent.id[0]
                  : actionRequest.agent.id,
                data: { command: actionRequest.EndpointActions.data.command },
                error: isError ? { message } : undefined,
              })
            );
          }
        }
      }
    }

    this.log.debug(
      () =>
        `${completedResponses.length} action responses generated:\n${stringify(completedResponses)}`
    );

    if (warnings.length > 0) {
      this.log.warn(warnings.join('\n'));
    }

    return completedResponses;
  }

  private calculateMachineActionState(machineAction: MicrosoftDefenderEndpointMachineAction): {
    isPending: boolean;
    isError: boolean;
    message: string;
  } {
    let isPending = true;
    let isError = false;
    let message = '';

    switch (machineAction.status) {
      case 'Failed':
      case 'TimeOut':
        isPending = false;
        isError = true;
        message = `Response action ${machineAction.status} (Microsoft Defender for Endpoint machine action ID: ${machineAction.id})`;
        break;

      case 'Cancelled':
        isPending = false;
        isError = true;
        message = `Response action was canceled by [${
          machineAction.cancellationRequestor
        }] (Microsoft Defender for Endpoint machine action ID: ${machineAction.id})${
          machineAction.cancellationComment ? `: ${machineAction.cancellationComment}` : ''
        }`;
        break;

      case 'Succeeded':
        isPending = false;
        isError = false;
        break;

      default:
        // covers 'Pending' | 'InProgress'
        isPending = true;
        isError = false;
    }

    return { isPending, isError, message };
  }
}
