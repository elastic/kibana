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
  MicrosoftDefenderEndpointRunScriptParams,
  MicrosoftDefenderGetLibraryFilesResponse,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import {
  type MicrosoftDefenderEndpointAgentDetailsParams,
  type MicrosoftDefenderEndpointIsolateHostParams,
  type MicrosoftDefenderEndpointMachine,
  type MicrosoftDefenderEndpointMachineAction,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import { groupBy } from 'lodash';
import type { Readable } from 'stream';
import type {
  IsolationRouteRequestBody,
  RunScriptActionRequestBody,
  UnisolationRouteRequestBody,
  MSDefenderRunScriptActionRequestParams,
} from '../../../../../../../../common/api/endpoint';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  MicrosoftDefenderEndpointActionRequestCommonMeta,
  MicrosoftDefenderEndpointActionRequestFileMeta,
  ResponseActionRunScriptOutputContent,
  ResponseActionRunScriptParameters,
  UploadedFileInfo,
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
import {
  ResponseActionAgentResponseEsDocNotFound,
  ResponseActionsClientError,
} from '../../../errors';
import type {
  CommonResponseActionMethodOptions,
  CustomScriptsResponse,
  GetFileDownloadMethodResponse,
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
   * @internal
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

  public async runscript(
    actionRequest: RunScriptActionRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<
    ActionDetails<ResponseActionRunScriptOutputContent, ResponseActionRunScriptParameters>
  > {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      RunScriptActionRequestBody['parameters'],
      {},
      MicrosoftDefenderEndpointActionRequestCommonMeta
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'runscript',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          const msActionResponse = await this.sendAction<
            MicrosoftDefenderEndpointMachineAction,
            MicrosoftDefenderEndpointRunScriptParams
          >(MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RUN_SCRIPT, {
            id: reqIndexOptions.endpoint_ids[0],
            comment: this.buildExternalComment(reqIndexOptions),
            parameters: {
              scriptName: (reqIndexOptions.parameters as MSDefenderRunScriptActionRequestParams)
                .scriptName,
              args: (reqIndexOptions.parameters as MSDefenderRunScriptActionRequestParams).args,
            },
          });

          if (msActionResponse?.data?.id) {
            reqIndexOptions.meta = { machineActionId: msActionResponse.data.id };
          } else {
            throw new ResponseActionsClientError(
              `Run Script request was sent to Microsoft Defender, but Machine Action Id was not provided!`
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

    return actionDetails as ActionDetails<
      ResponseActionRunScriptOutputContent,
      ResponseActionRunScriptParameters
    >;
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
              await this.checkPendingActions(
                typePendingActions as Array<
                  ResponseActionsClientPendingAction<
                    undefined,
                    {},
                    MicrosoftDefenderEndpointActionRequestCommonMeta
                  >
                >
              )
            );
          case 'runscript':
            addResponsesToQueueIfAny(
              await this.checkPendingActions(
                typePendingActions as Array<
                  ResponseActionsClientPendingAction<
                    undefined,
                    {},
                    MicrosoftDefenderEndpointActionRequestCommonMeta
                  >
                >,
                { downloadResult: true }
              )
            );
        }
      }
    }
  }

  private async checkPendingActions(
    actionRequests: Array<
      ResponseActionsClientPendingAction<
        undefined,
        {},
        MicrosoftDefenderEndpointActionRequestCommonMeta
      >
    >,
    options: { downloadResult?: boolean } = { downloadResult: false }
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
              message: `Unable to verify if action completed. Microsoft Defender machine action id ('meta.machineActionId') missing from the action request document!`,
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
            let additionalData = {};
            // In order to not copy paste most of the logic, I decided to add this additional check here to support `runscript` action and it's result that comes back as a link to download the file
            if (options.downloadResult) {
              additionalData = {
                meta: {
                  machineActionId: machineAction.id,
                  filename: `runscript-output-${machineAction.id}.json`,
                  createdAt: new Date().toISOString(),
                },
              };
            }
            completedResponses.push(
              this.buildActionResponseEsDoc({
                actionId: actionRequest.EndpointActions.action_id,
                agentId: Array.isArray(actionRequest.agent.id)
                  ? actionRequest.agent.id[0]
                  : actionRequest.agent.id,
                data: { command: actionRequest.EndpointActions.data.command },
                error: isError ? { message } : undefined,
                ...additionalData,
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

  async getCustomScripts(): Promise<CustomScriptsResponse> {
    try {
      const customScriptsResponse = (await this.sendAction(
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES,
        {}
      )) as ActionTypeExecutorResult<MicrosoftDefenderGetLibraryFilesResponse>;

      const scripts = customScriptsResponse.data?.value || [];

      // Transform MS Defender scripts to CustomScriptsResponse format
      const data = scripts.map((script) => ({
        // due to External EDR's schema nature - we expect a maybe() everywhere - empty strings are needed
        id: script.fileName || '',
        name: script.fileName || '',
        description: script.description || '',
      }));

      return { data } as CustomScriptsResponse;
    } catch (err) {
      const error = new ResponseActionsClientError(
        `Failed to fetch Microsoft Defender for Endpoint scripts, failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    }
  }

  async getFileInfo(actionId: string, agentId: string): Promise<UploadedFileInfo> {
    await this.ensureValidActionId(actionId);
    const {
      EndpointActions: {
        data: { command },
      },
    } = await this.fetchActionRequestEsDoc(actionId);

    const { microsoftDefenderEndpointRunScriptEnabled } =
      this.options.endpointService.experimentalFeatures;
    if (command === 'runscript' && !microsoftDefenderEndpointRunScriptEnabled) {
      throw new ResponseActionsClientError(
        `File downloads are not supported for ${this.agentType} agent type. Feature disabled.`,
        400
      );
    }

    const fileInfo: UploadedFileInfo = {
      actionId,
      agentId,
      id: agentId,
      agentType: this.agentType,
      status: 'AWAITING_UPLOAD',
      created: '',
      name: '',
      size: 0,
      mimeType: '',
    };

    try {
      switch (command) {
        case 'runscript':
          {
            const agentResponse = await this.fetchEsResponseDocForAgentId<
              {},
              MicrosoftDefenderEndpointActionRequestFileMeta
            >(actionId, agentId);

            fileInfo.status = 'READY';
            fileInfo.created = agentResponse.meta?.createdAt ?? '';
            fileInfo.name = agentResponse.meta?.filename ?? '';
            fileInfo.mimeType = 'application/octet-stream';
          }
          break;

        default:
          throw new ResponseActionsClientError(`${command} does not support file downloads`, 400);
      }
    } catch (e) {
      // Ignore "no response doc" error for the agent and just return the file info with the status of 'AWAITING_UPLOAD'
      if (!(e instanceof ResponseActionAgentResponseEsDocNotFound)) {
        throw e;
      }
    }

    return fileInfo;
  }

  async getFileDownload(actionId: string, agentId: string): Promise<GetFileDownloadMethodResponse> {
    await this.ensureValidActionId(actionId);
    const {
      EndpointActions: {
        data: { command },
      },
    } = await this.fetchActionRequestEsDoc(actionId);

    const { microsoftDefenderEndpointRunScriptEnabled } =
      this.options.endpointService.experimentalFeatures;
    if (command === 'runscript' && !microsoftDefenderEndpointRunScriptEnabled) {
      throw new ResponseActionsClientError(
        `File downloads are not supported for ${this.agentType} agent type. Feature disabled.`,
        400
      );
    }

    let downloadStream: Readable | undefined;
    let fileName: string = 'download.json';

    try {
      switch (command) {
        case 'runscript':
          {
            const runscriptAgentResponse = await this.fetchEsResponseDocForAgentId<
              {},
              MicrosoftDefenderEndpointActionRequestFileMeta
            >(actionId, agentId);

            if (!runscriptAgentResponse.meta?.machineActionId) {
              throw new ResponseActionsClientError(
                `Unable to retrieve file from Microsoft Defender for Endpoint. Response ES document is missing [meta.machineActionId]`
              );
            }

            const { data } = await this.sendAction<Readable>(
              MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
              { id: runscriptAgentResponse.meta?.machineActionId }
            );

            if (data) {
              downloadStream = data;
              fileName = runscriptAgentResponse.meta.filename;
            }
          }
          break;
      }

      if (!downloadStream) {
        throw new ResponseActionsClientError(
          `Unable to establish a file download Readable stream with Microsoft Defender for Endpoint for response action [${command}] [${actionId}]`
        );
      }
    } catch (e) {
      this.log.debug(
        () =>
          `Attempt to get file download stream from Microsoft Defender for Endpoint for response action failed with:\n${stringify(
            e
          )}`
      );

      throw e;
    }

    return {
      stream: downloadStream,
      mimeType: undefined,
      fileName,
    };
  }

  private async fetchEsResponseDocForAgentId<
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(actionId: string, agentId: string): Promise<LogsEndpointActionResponse<TOutputContent, TMeta>> {
    const agentResponse = (
      await this.fetchActionResponseEsDocs<TOutputContent, TMeta>(actionId, [agentId])
    )[agentId];

    if (!agentResponse) {
      throw new ResponseActionAgentResponseEsDocNotFound(
        `Action ID [${actionId}] for agent ID [${agentId}] is still pending`,
        404
      );
    }

    return agentResponse;
  }
}
