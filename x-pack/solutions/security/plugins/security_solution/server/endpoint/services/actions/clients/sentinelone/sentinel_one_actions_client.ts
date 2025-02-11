/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import { groupBy } from 'lodash';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type {
  SentinelOneDownloadAgentFileParams,
  SentinelOneExecuteScriptResponse,
  SentinelOneGetActivitiesParams,
  SentinelOneGetActivitiesResponse,
  SentinelOneGetAgentsResponse,
  SentinelOneGetAgentsParams,
  SentinelOneGetRemoteScriptResultsApiResponse,
  SentinelOneGetRemoteScriptsParams,
  SentinelOneGetRemoteScriptsResponse,
  SentinelOneGetRemoteScriptStatusApiResponse,
  SentinelOneRemoteScriptExecutionStatus,
  SentinelOneIsolateHostParams,
  SentinelOneFetchAgentFilesParams,
  SentinelOneExecuteScriptParams,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type {
  QueryDslQueryContainer,
  SearchHit,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { Readable } from 'stream';
import type { Mutable } from 'utility-types';
import type {
  SentinelOneKillProcessScriptArgs,
  SentinelOneProcessListScriptArgs,
  SentinelOneScriptArgs,
} from './types';
import { ACTIONS_SEARCH_PAGE_SIZE } from '../../constants';
import type { NormalizedExternalConnectorClient } from '../lib/normalized_external_connector_client';
import { SENTINEL_ONE_ACTIVITY_INDEX_PATTERN } from '../../../../../../common';
import { catchAndWrapError } from '../../../../utils';
import type {
  CommonResponseActionMethodOptions,
  GetFileDownloadMethodResponse,
  ProcessPendingActionsMethodOptions,
} from '../lib/types';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_ZIP_PASSCODE } from '../../../../../../common/endpoint/service/response_actions/constants';
import { stringify } from '../../../../utils/stringify';
import { ResponseActionAgentResponseEsDocNotFound, ResponseActionsClientError } from '../errors';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
  GetProcessesActionOutputContent,
  KillProcessActionOutputContent,
  LogsEndpointAction,
  LogsEndpointActionResponse,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionParametersWithProcessData,
  ResponseActionParametersWithProcessName,
  SentinelOneActionRequestCommonMeta,
  SentinelOneActivityDataForType80,
  SentinelOneActivityEsDoc,
  SentinelOneGetFileRequestMeta,
  SentinelOneGetFileResponseMeta,
  SentinelOneIsolationRequestMeta,
  SentinelOneIsolationResponseMeta,
  SentinelOneKillProcessRequestMeta,
  SentinelOneKillProcessResponseMeta,
  SentinelOneProcessesRequestMeta,
  SentinelOneProcessesResponseMeta,
  UploadedFileInfo,
} from '../../../../../../common/endpoint/types';
import type {
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  KillProcessRequestBody,
  UnisolationRouteRequestBody,
} from '../../../../../../common/api/endpoint';
import type {
  ResponseActionsClientOptions,
  ResponseActionsClientPendingAction,
  ResponseActionsClientValidateRequestResponse,
  ResponseActionsClientWriteActionRequestToEndpointIndexOptions,
} from '../lib/base_response_actions_client';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';

const NOOP_THROW = () => {
  throw new ResponseActionsClientError('not implemented!');
};

export type SentinelOneActionsClientOptions = ResponseActionsClientOptions & {
  connectorActions: NormalizedExternalConnectorClient;
};

interface FetchScriptInfoResponse<
  TScriptOptions extends SentinelOneScriptArgs = SentinelOneScriptArgs
> {
  scriptId: string;
  scriptInfo: SentinelOneGetRemoteScriptsResponse['data'][number];
  /** A helper method that will build the arguments for the given script */
  buildScriptArgs: (options: TScriptOptions) => string;
}

export class SentinelOneActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'sentinel_one';
  private readonly connectorActionsClient: NormalizedExternalConnectorClient;

  constructor({ connectorActions, ...options }: SentinelOneActionsClientOptions) {
    super(options);
    this.connectorActionsClient = connectorActions;
    connectorActions.setup(SENTINELONE_CONNECTOR_ID);
  }

  private async handleResponseActionCreation<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      Partial<TMeta>
    >
  ): Promise<{
    actionEsDoc: LogsEndpointAction<TParameters, TOutputContent, TMeta>;
    actionDetails: ActionDetails<TOutputContent, TParameters>;
  }> {
    const actionRequestDoc = await this.writeActionRequestToEndpointIndex<
      TParameters,
      TOutputContent,
      TMeta
    >(reqIndexOptions);

    await this.updateCases({
      command: reqIndexOptions.command,
      caseIds: reqIndexOptions.case_ids,
      alertIds: reqIndexOptions.alert_ids,
      actionId: actionRequestDoc.EndpointActions.action_id,
      hosts: reqIndexOptions.endpoint_ids.map((agentId) => {
        return {
          hostId: agentId,
          hostname: actionRequestDoc.EndpointActions.data.hosts?.[agentId].name ?? '',
        };
      }),
      comment: reqIndexOptions.comment,
    });

    return {
      actionEsDoc: actionRequestDoc,
      actionDetails: await this.fetchActionDetails<ActionDetails<TOutputContent, TParameters>>(
        actionRequestDoc.EndpointActions.action_id
      ),
    };
  }

  protected async writeActionRequestToEndpointIndex<
    TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes,
    TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
    TMeta extends {} = {}
  >(
    actionRequest: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      TParameters,
      TOutputContent,
      Partial<TMeta> // Partial<> because the common Meta properties are actually set in this method for all requests
    >
  ): Promise<
    LogsEndpointAction<TParameters, TOutputContent, TMeta & SentinelOneActionRequestCommonMeta>
  > {
    const agentId = actionRequest.endpoint_ids[0];
    const agentDetails = await this.getAgentDetails(agentId);

    const doc = await super.writeActionRequestToEndpointIndex<
      TParameters,
      TOutputContent,
      TMeta & SentinelOneActionRequestCommonMeta
    >({
      ...actionRequest,
      hosts: {
        [agentId]: { name: agentDetails.computerName },
      },
      meta: {
        // Add common meta data
        agentUUID: agentId,
        agentId: agentDetails.id,
        hostName: agentDetails.computerName,
        ...(actionRequest.meta ?? {}),
      } as TMeta & SentinelOneActionRequestCommonMeta,
    });

    return doc;
  }

  /**
   * Sends actions to SentinelOne directly (via Connector)
   * @private
   */
  private async sendAction<
    TResponse = unknown,
    TParams extends Record<string, any> = Record<string, any>
  >(actionType: SUB_ACTION, actionParams: TParams): Promise<ActionTypeExecutorResult<TResponse>> {
    const executeOptions: Parameters<typeof this.connectorActionsClient.execute>[0] = {
      params: {
        subAction: actionType,
        subActionParams: actionParams,
      },
    };

    this.log.debug(
      () =>
        `calling connector actions 'execute()' for SentinelOne with:\n${stringify(executeOptions)}`
    );

    const actionSendResponse = await this.connectorActionsClient.execute(executeOptions);

    if (actionSendResponse.status === 'error') {
      this.log.error(stringify(actionSendResponse));

      throw new ResponseActionsClientError(
        `Attempt to send [${actionType}] to SentinelOne failed: ${
          actionSendResponse.serviceMessage || actionSendResponse.message
        }`,
        500,
        actionSendResponse
      );
    }

    this.log.debug(() => `Response:\n${stringify(actionSendResponse)}`);

    return actionSendResponse as ActionTypeExecutorResult<TResponse>;
  }

  /** Gets agent details directly from SentinelOne */
  private async getAgentDetails(
    agentId: string
  ): Promise<SentinelOneGetAgentsResponse['data'][number]> {
    const cachedEntry = this.cache.get<SentinelOneGetAgentsResponse['data'][number]>(agentId);

    if (cachedEntry) {
      this.log.debug(
        `Found cached agent details for UUID [${agentId}]:\n${stringify(cachedEntry)}`
      );
      return cachedEntry;
    }

    const s1ApiResponse = (
      await this.sendAction<SentinelOneGetAgentsResponse, SentinelOneGetAgentsParams>(
        SUB_ACTION.GET_AGENTS,
        { ids: agentId }
      )
    ).data;

    if (!s1ApiResponse || !s1ApiResponse.data[0]) {
      throw new ResponseActionsClientError(`SentinelOne agent id [${agentId}] not found`, 404);
    }

    this.cache.set(agentId, s1ApiResponse.data[0]);

    return s1ApiResponse.data[0];
  }

  protected async validateRequest(
    payload: ResponseActionsClientWriteActionRequestToEndpointIndexOptions
  ): Promise<ResponseActionsClientValidateRequestResponse> {
    // TODO:PT support multiple agents
    if (payload.endpoint_ids.length > 1) {
      return {
        isValid: false,
        error: new ResponseActionsClientError(
          `[body.endpoint_ids]: Multiple agents IDs not currently supported for SentinelOne`,
          400
        ),
      };
    }

    // KILL-PROCESS:
    // validate that we have a `process_name`. We need this here because the schema for this command
    // specifically because `KillProcessRequestBody` allows 3 types of parameters.
    if (payload.command === 'kill-process') {
      if (
        !payload.parameters ||
        !('process_name' in payload.parameters) ||
        !payload.parameters.process_name
      ) {
        return {
          isValid: false,
          error: new ResponseActionsClientError(
            '[body.parameters.process_name]: missing parameter or value is empty'
          ),
        };
      }
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
      SentinelOneIsolationRequestMeta
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'isolate',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          await this.sendAction<unknown, SentinelOneIsolateHostParams>(SUB_ACTION.ISOLATE_HOST, {
            ids: actionRequest.endpoint_ids[0],
          });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const { actionDetails, actionEsDoc: actionRequestDoc } =
      await this.handleResponseActionCreation(reqIndexOptions);

    if (
      !actionRequestDoc.error &&
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled
    ) {
      await this.writeActionResponseToEndpointIndex({
        actionId: actionRequestDoc.EndpointActions.action_id,
        agentId: actionRequestDoc.agent.id,
        data: {
          command: actionRequestDoc.EndpointActions.data.command,
        },
      });

      return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
    }

    return actionDetails;
  }

  async release(
    actionRequest: UnisolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      undefined,
      {},
      SentinelOneIsolationRequestMeta
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'unisolate',
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        try {
          await this.sendAction<unknown, SentinelOneIsolateHostParams>(SUB_ACTION.RELEASE_HOST, {
            ids: actionRequest.endpoint_ids[0],
          });
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const { actionDetails, actionEsDoc: actionRequestDoc } =
      await this.handleResponseActionCreation(reqIndexOptions);

    if (
      !actionRequestDoc.error &&
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneV2Enabled
    ) {
      await this.writeActionResponseToEndpointIndex({
        actionId: actionRequestDoc.EndpointActions.action_id,
        agentId: actionRequestDoc.agent.id,
        data: {
          command: actionRequestDoc.EndpointActions.data.command,
        },
      });

      return this.fetchActionDetails(actionRequestDoc.EndpointActions.action_id);
    }

    return actionDetails;
  }

  async getFile(
    actionRequest: ResponseActionGetFileRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    if (
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneGetFileEnabled
    ) {
      throw new ResponseActionsClientError(
        `get-file not supported for ${this.agentType} agent type. Feature disabled`,
        400
      );
    }

    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      ResponseActionGetFileParameters,
      ResponseActionGetFileOutputContent,
      Partial<SentinelOneGetFileRequestMeta>
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'get-file',
    };

    const agentId = actionRequest.endpoint_ids[0];

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;
      const timestamp = new Date().toISOString();

      if (!error) {
        try {
          await this.sendAction<unknown, SentinelOneFetchAgentFilesParams>(
            SUB_ACTION.FETCH_AGENT_FILES,
            {
              agentId: actionRequest.endpoint_ids[0],
              files: [actionRequest.parameters.path],
              zipPassCode: RESPONSE_ACTIONS_ZIP_PASSCODE.sentinel_one,
            }
          );
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }

      if (!error) {
        const activitySearchCriteria: SentinelOneGetActivitiesParams = {
          // Activity type for fetching a file from a host machine in SentinelOne:
          // {
          //   "id": 81
          //   "action": "User Requested Fetch Files",
          //   "descriptionTemplate": "The management user {{ username }} initiated a fetch file command to the agent {{ computer_name }} ({{ external_ip }}).",
          // },
          activityTypes: '81',
          limit: 1,
          sortBy: 'createdAt',
          sortOrder: 'asc',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          createdAt__gte: timestamp,
          agentIds: agentId,
        };

        // Fetch the Activity log entry for this get-file request and store needed data
        const activityLogSearchResponse = await this.sendAction<
          SentinelOneGetActivitiesResponse<{ commandBatchUuid: string }>
        >(SUB_ACTION.GET_ACTIVITIES, activitySearchCriteria);

        if (activityLogSearchResponse.data?.data.length) {
          const activityLogItem = activityLogSearchResponse.data?.data[0];

          reqIndexOptions.meta = {
            commandBatchUuid: activityLogItem?.data.commandBatchUuid,
            activityId: activityLogItem?.id,
          };
        } else {
          this.log.warn(
            `Unable to find a fetch file command entry in SentinelOne activity log. May be unable to complete response action. Search criteria used:\n${stringify(
              activitySearchCriteria
            )}`
          );
        }
      }
    }

    return (
      await this.handleResponseActionCreation<
        ResponseActionGetFileParameters,
        ResponseActionGetFileOutputContent,
        SentinelOneGetFileRequestMeta
      >(reqIndexOptions)
    ).actionDetails;
  }

  async getFileInfo(actionId: string, agentId: string): Promise<UploadedFileInfo> {
    await this.ensureValidActionId(actionId);
    const {
      EndpointActions: {
        data: { command },
      },
    } = await this.fetchActionRequestEsDoc(actionId);

    const {
      responseActionsSentinelOneGetFileEnabled: isGetFileEnabled,
      responseActionsSentinelOneProcessesEnabled: isRunningProcessesEnabled,
    } = this.options.endpointService.experimentalFeatures;

    if (
      (command === 'get-file' && !isGetFileEnabled) ||
      (command === 'running-processes' && !isRunningProcessesEnabled)
    ) {
      throw new ResponseActionsClientError(
        `File downloads are not supported for ${this.agentType} agent type. Feature disabled`,
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
        case 'get-file':
          {
            const agentResponse = await this.fetchEsResponseDocForAgentId<
              ResponseActionGetFileOutputContent,
              SentinelOneGetFileResponseMeta
            >(actionId, agentId);

            // Unfortunately, there is no way to determine if a file is still available in SentinelOne without actually
            // calling the download API, which would return the following error:
            // {  "errors":[ {
            //      "code":4100010,
            //      "detail":"The requested files do not exist. Fetched files are deleted after 3 days, or earlier if more than 30 files are fetched.",
            //      "title":"Resource not found"
            // } ] }
            fileInfo.status = 'READY';
            fileInfo.created = agentResponse.meta?.createdAt ?? '';
            fileInfo.name = agentResponse.meta?.filename ?? '';
            fileInfo.mimeType = 'application/octet-stream';
          }
          break;

        case 'running-processes':
          {
            const agentResponse = await this.fetchEsResponseDocForAgentId<
              GetProcessesActionOutputContent,
              SentinelOneProcessesResponseMeta
            >(actionId, agentId);
            const s1TaskId = agentResponse.meta?.taskId ?? '';

            fileInfo.created = agentResponse['@timestamp'];

            const { data: s1ScriptResultsApiResponse } =
              await this.sendAction<SentinelOneGetRemoteScriptResultsApiResponse>(
                SUB_ACTION.GET_REMOTE_SCRIPT_RESULTS,
                {
                  taskIds: [s1TaskId],
                }
              );

            const fileDownloadLink = (s1ScriptResultsApiResponse?.data.download_links ?? []).find(
              (linkInfo) => {
                return linkInfo.taskId === s1TaskId;
              }
            );

            if (!fileDownloadLink) {
              this.log.debug(
                `No download link found in SentinelOne for Task Id [${s1TaskId}]. Setting file status to DELETED`
              );

              fileInfo.status = 'DELETED';
            } else {
              fileInfo.status = 'READY';
              fileInfo.name = fileDownloadLink.fileName ?? `${actionId}-${agentId}.zip`;
              fileInfo.mimeType = 'application/octet-stream';
            }
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

    const {
      responseActionsSentinelOneGetFileEnabled: isGetFileEnabled,
      responseActionsSentinelOneProcessesEnabled: isRunningProcessesEnabled,
    } = this.options.endpointService.experimentalFeatures;

    if (
      (command === 'get-file' && !isGetFileEnabled) ||
      (command === 'running-processes' && !isRunningProcessesEnabled)
    ) {
      throw new ResponseActionsClientError(
        `File downloads are not supported for ${this.agentType} agent type. Feature disabled`,
        400
      );
    }

    let downloadStream: Readable | undefined;
    let fileName: string = 'download.zip';

    try {
      switch (command) {
        case 'get-file':
          {
            const getFileAgentResponse = await this.fetchEsResponseDocForAgentId<
              ResponseActionGetFileOutputContent,
              SentinelOneGetFileResponseMeta
            >(actionId, agentId);

            if (!getFileAgentResponse.meta?.activityLogEntryId) {
              throw new ResponseActionsClientError(
                `Unable to retrieve file from SentinelOne. Response ES document is missing [meta.activityLogEntryId]`
              );
            }

            const downloadAgentFileMethodOptions: SentinelOneDownloadAgentFileParams = {
              agentId,
              activityId: getFileAgentResponse.meta?.activityLogEntryId,
            };
            const { data } = await this.sendAction<Readable>(
              SUB_ACTION.DOWNLOAD_AGENT_FILE,
              downloadAgentFileMethodOptions
            );

            if (data) {
              downloadStream = data;
              fileName = getFileAgentResponse.meta.filename;
            }
          }
          break;

        case 'running-processes':
          {
            const processesAgentResponse = await this.fetchEsResponseDocForAgentId<
              {},
              SentinelOneProcessesResponseMeta
            >(actionId, agentId);

            if (!processesAgentResponse.meta?.taskId) {
              throw new ResponseActionsClientError(
                `Unable to retrieve file from SentinelOne for Response Action [${actionId}]. Response ES document is missing [meta.taskId]`
              );
            }

            const { data } = await this.sendAction<Readable>(
              SUB_ACTION.DOWNLOAD_REMOTE_SCRIPT_RESULTS,
              {
                taskId: processesAgentResponse.meta?.taskId,
              }
            );

            if (data) {
              downloadStream = data;
              fileName = `${actionId}_${agentId}.zip`;
            }
          }
          break;

        default:
          throw new ResponseActionsClientError(`${command} does not support file downloads`, 400);
      }

      if (!downloadStream) {
        throw new ResponseActionsClientError(
          `Unable to establish a file download Readable stream with SentinelOne for response action [${command}] [${actionId}]`
        );
      }
    } catch (e) {
      this.log.debug(
        () =>
          `Attempt to get file download stream from SentinelOne for response action failed with:\n${stringify(
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

  async killProcess(
    actionRequest: KillProcessRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithProcessData>
  > {
    if (
      !this.options.endpointService.experimentalFeatures
        .responseActionsSentinelOneKillProcessEnabled
    ) {
      throw new ResponseActionsClientError(
        `kill-process not supported for ${this.agentType} agent type. Feature disabled`,
        400
      );
    }

    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      ResponseActionParametersWithProcessName,
      KillProcessActionOutputContent,
      Partial<SentinelOneKillProcessRequestMeta>
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'kill-process',
      meta: { parentTaskId: '' },
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        const s1AgentDetails = await this.getAgentDetails(reqIndexOptions.endpoint_ids[0]);
        const terminateScriptInfo = await this.fetchScriptInfo<SentinelOneKillProcessScriptArgs>(
          'kill-process',
          s1AgentDetails.osType
        );

        try {
          const s1Response = await this.sendAction<
            SentinelOneExecuteScriptResponse,
            SentinelOneExecuteScriptParams
          >(SUB_ACTION.EXECUTE_SCRIPT, {
            filter: {
              ids: actionRequest.endpoint_ids[0],
            },
            script: {
              scriptId: terminateScriptInfo.scriptId,
              taskDescription: this.buildExternalComment(reqIndexOptions),
              requiresApproval: false,
              outputDestination: 'SentinelCloud',
              inputParams: terminateScriptInfo.buildScriptArgs({
                // @ts-expect-error TS2339: Property 'process_name' does not exist (`.validateRequest()` has already validated that `process_name` exists)
                processName: reqIndexOptions.parameters.process_name,
              }),
            },
          });

          reqIndexOptions.meta = {
            parentTaskId: s1Response.data?.data?.parentTaskId ?? '',
          };
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const { actionDetails } = await this.handleResponseActionCreation<
      ResponseActionParametersWithProcessData,
      KillProcessActionOutputContent
    >(reqIndexOptions);

    return actionDetails;
  }

  async runningProcesses(
    actionRequest: GetProcessesRequestBody,
    options?: CommonResponseActionMethodOptions
  ): Promise<ActionDetails<GetProcessesActionOutputContent>> {
    if (
      !this.options.endpointService.experimentalFeatures.responseActionsSentinelOneProcessesEnabled
    ) {
      throw new ResponseActionsClientError(
        `processes not supported for ${this.agentType} agent type. Feature disabled`,
        400
      );
    }

    const reqIndexOptions: ResponseActionsClientWriteActionRequestToEndpointIndexOptions<
      undefined,
      GetProcessesActionOutputContent,
      Partial<SentinelOneProcessesRequestMeta>
    > = {
      ...actionRequest,
      ...this.getMethodOptions(options),
      command: 'running-processes',
      meta: { parentTaskId: '' },
    };

    if (!reqIndexOptions.error) {
      let error = (await this.validateRequest(reqIndexOptions)).error;

      if (!error) {
        const s1AgentDetails = await this.getAgentDetails(reqIndexOptions.endpoint_ids[0]);
        const processesScriptInfo = await this.fetchScriptInfo<SentinelOneProcessListScriptArgs>(
          'running-processes',
          s1AgentDetails.osType
        );

        try {
          const s1Response = await this.sendAction<
            SentinelOneExecuteScriptResponse,
            SentinelOneExecuteScriptParams
          >(SUB_ACTION.EXECUTE_SCRIPT, {
            filter: {
              ids: actionRequest.endpoint_ids[0],
            },
            script: {
              scriptId: processesScriptInfo.scriptId,
              taskDescription: this.buildExternalComment(reqIndexOptions),
              requiresApproval: false,
              outputDestination: 'SentinelCloud',
              inputParams: processesScriptInfo.buildScriptArgs({}),
            },
          });

          reqIndexOptions.meta = {
            parentTaskId: s1Response.data?.data?.parentTaskId ?? '',
          };
        } catch (err) {
          error = err;
        }
      }

      reqIndexOptions.error = error?.message;

      if (!this.options.isAutomated && error) {
        throw error;
      }
    }

    const { actionDetails } = await this.handleResponseActionCreation<
      undefined,
      GetProcessesActionOutputContent
    >(reqIndexOptions);

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

    for await (const pendingActions of this.fetchAllPendingActions()) {
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
              await this.checkPendingIsolateOrReleaseActions(
                typePendingActions as Array<
                  ResponseActionsClientPendingAction<undefined, {}, SentinelOneIsolationRequestMeta>
                >,
                actionType as 'isolate' | 'unisolate'
              )
            );
            break;

          case 'running-processes':
            addResponsesToQueueIfAny(
              await this.checkPendingRunningProcessesAction(
                typePendingActions as Array<
                  ResponseActionsClientPendingAction<
                    undefined,
                    GetProcessesActionOutputContent,
                    SentinelOneProcessesRequestMeta
                  >
                >
              )
            );
            break;

          case 'get-file':
            addResponsesToQueueIfAny(
              await this.checkPendingGetFileActions(
                typePendingActions as Array<
                  ResponseActionsClientPendingAction<
                    ResponseActionGetFileParameters,
                    ResponseActionGetFileOutputContent,
                    SentinelOneGetFileRequestMeta
                  >
                >
              )
            );
            break;

          case 'kill-process':
            addResponsesToQueueIfAny(
              await this.checkPendingKillProcessActions(
                typePendingActions as Array<
                  ResponseActionsClientPendingAction<
                    ResponseActionParametersWithProcessName,
                    KillProcessActionOutputContent,
                    SentinelOneKillProcessRequestMeta
                  >
                >
              )
            );
            break;
        }
      }
    }
  }

  /**
   * retrieve script info. for scripts that are used to handle Elastic response actions
   * @param scriptType
   * @param osType
   * @private
   */
  private async fetchScriptInfo<
    TScriptOptions extends SentinelOneScriptArgs = SentinelOneScriptArgs
  >(
    scriptType: Extract<ResponseActionsApiCommandNames, 'kill-process' | 'running-processes'>,
    osType: string | 'linux' | 'macos' | 'windows'
  ): Promise<FetchScriptInfoResponse<TScriptOptions>> {
    const searchQueryParams: Mutable<Partial<SentinelOneGetRemoteScriptsParams>> = {
      query: '',
      osTypes: osType,
    };
    let buildScriptArgs: FetchScriptInfoResponse<TScriptOptions>['buildScriptArgs'] =
      NOOP_THROW as FetchScriptInfoResponse<TScriptOptions>['buildScriptArgs'];
    let isDesiredScript: (
      scriptInfo: SentinelOneGetRemoteScriptsResponse['data'][number]
    ) => boolean = () => false;

    // Set the query value for filtering the list of scripts in S1
    switch (scriptType) {
      case 'kill-process':
        searchQueryParams.query = 'terminate';
        searchQueryParams.scriptType = 'action';
        isDesiredScript = (scriptInfo) => {
          return (
            scriptInfo.creator === 'SentinelOne' &&
            scriptInfo.creatorId === '-1' &&
            // Using single `-` (instead of double `--`) in match below to ensure both windows and macos/linux are matched
            /-terminate/i.test(scriptInfo.inputInstructions ?? '') &&
            /-processes/i.test(scriptInfo.inputInstructions ?? '')
          );
        };
        break;

      case 'running-processes':
        if (osType === 'windows') {
          throw new ResponseActionsClientError(
            `Retrieval of running processes for Windows host is not supported by SentinelOne`,
            405
          );
        }

        searchQueryParams.query = 'process list';
        searchQueryParams.scriptType = 'dataCollection';
        isDesiredScript = (scriptInfo) => {
          return scriptInfo.creator === 'SentinelOne' && scriptInfo.creatorId === '-1';
        };

        break;

      default:
        throw new ResponseActionsClientError(
          `Unable to fetch SentinelOne script for OS [${osType}]. Unknown script type [${scriptType}]`
        );
    }

    const { data: scriptSearchResults } =
      await this.sendAction<SentinelOneGetRemoteScriptsResponse>(
        SUB_ACTION.GET_REMOTE_SCRIPTS,
        searchQueryParams
      );

    const s1Script: SentinelOneGetRemoteScriptsResponse['data'][number] | undefined = (
      scriptSearchResults?.data ?? []
    ).find(isDesiredScript);

    if (!s1Script) {
      throw new ResponseActionsClientError(
        `Unable to find a script from SentinelOne to handle [${scriptType}] response action for host running [${osType}])`
      );
    }

    // Define the `buildScriptArgs` callback for the Script type
    switch (scriptType) {
      case 'kill-process':
        buildScriptArgs = ((args: SentinelOneKillProcessScriptArgs) => {
          if (!args.processName) {
            throw new ResponseActionsClientError(
              `'processName' missing while building script args for [${s1Script.scriptName} (id: ${s1Script.id})] script`
            );
          }

          if (osType === 'windows') {
            return `-Terminate -Processes "${args.processName}" -Force`;
          }

          // Linux + Macos
          return `--terminate --processes "${args.processName}" --force`;
        }) as FetchScriptInfoResponse<TScriptOptions>['buildScriptArgs'];

        break;

      case 'running-processes':
        buildScriptArgs = () => '';
        break;
    }

    return {
      scriptId: s1Script.id,
      scriptInfo: s1Script,
      buildScriptArgs,
    } as FetchScriptInfoResponse<TScriptOptions>;
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
        `Action ID [${actionId}] for agent ID [${actionId}] is still pending`,
        404
      );
    }

    return agentResponse;
  }

  /**
   * Checks if the provided Isolate or Unisolate actions are complete and if so, then it builds the Response
   * document for them and returns it. (NOTE: the response is NOT written to ES - only returned)
   * @param actionRequests
   * @param command
   * @private
   */
  private async checkPendingIsolateOrReleaseActions(
    actionRequests: Array<
      ResponseActionsClientPendingAction<undefined, {}, SentinelOneIsolationRequestMeta>
    >,
    command: ResponseActionsApiCommandNames & ('isolate' | 'unisolate')
  ): Promise<LogsEndpointActionResponse[]> {
    const completedResponses: LogsEndpointActionResponse[] = [];
    const actionsByAgentId: {
      [s1AgentId: string]: Array<
        LogsEndpointAction<undefined, {}, SentinelOneIsolationRequestMeta>
      >;
    } = {};
    const warnings: string[] = [];

    // Create the `OR` clause that filters for each agent id and an updated date of greater than the date when
    // the isolate request was created
    const agentListQuery: QueryDslQueryContainer[] = actionRequests.reduce(
      (acc, pendingActionData) => {
        const action = pendingActionData.action;
        const s1AgentId = action.meta?.agentId;

        if (s1AgentId) {
          if (!actionsByAgentId[s1AgentId]) {
            actionsByAgentId[s1AgentId] = [];
          }

          actionsByAgentId[s1AgentId].push(action);

          acc.push({
            bool: {
              filter: [
                { term: { 'sentinel_one.activity.agent.id': s1AgentId } },
                { range: { 'sentinel_one.activity.updated_at': { gt: action['@timestamp'] } } },
              ],
            },
          });
        } else {
          // This is an edge case and should never happen. But just in case :-)
          warnings.push(
            `${command} response action ID [${action.EndpointActions.action_id}] missing SentinelOne agent ID, thus unable to check on it's status. Forcing it to complete as failure.`
          );

          completedResponses.push(
            this.buildActionResponseEsDoc<{}, SentinelOneIsolationResponseMeta>({
              actionId: action.EndpointActions.action_id,
              agentId: Array.isArray(action.agent.id) ? action.agent.id[0] : action.agent.id,
              data: { command },
              error: {
                message: `Unable to very if action completed. SentinelOne agent id ('meta.agentId') missing on action request document!`,
              },
            })
          );
        }

        return acc;
      },
      [] as QueryDslQueryContainer[]
    );

    if (agentListQuery.length > 0) {
      const query: QueryDslQueryContainer = {
        bool: {
          must: [
            {
              terms: {
                // Activity Types can be retrieved from S1 via API: `/web/api/v2.1/activities/types`
                'sentinel_one.activity.type':
                  command === 'isolate'
                    ? [
                        // {
                        //    "id": 1001
                        //    "action": "Agent Disconnected From Network",
                        //    "descriptionTemplate": "Agent {{ computer_name }} was disconnected from network.",
                        // },
                        1001,

                        // {
                        //    "id": 2010
                        //    "action": "Agent Mitigation Report Quarantine Network Failed",
                        //    "descriptionTemplate": "Agent {{ computer_name }} was unable to disconnect from network.",
                        // },
                        2010,
                      ]
                    : [
                        // {
                        //    "id": 1002
                        //    "action": "Agent Reconnected To Network",
                        //    "descriptionTemplate": "Agent {{ computer_name }} was connected to network.",
                        // },
                        1002,
                      ],
              },
            },
          ],
          should: agentListQuery,
          minimum_should_match: 1,
        },
      };

      const searchRequestOptions: SearchRequest = {
        index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
        query,
        // There may be many documents for each host/agent, so we collapse it and only get back the
        // first one that came in after the isolate request was sent
        collapse: {
          field: 'sentinel_one.activity.agent.id',
          inner_hits: {
            name: 'first_found',
            size: 1,
            sort: [{ 'sentinel_one.activity.updated_at': 'asc' }],
          },
        },
        // we don't need the source. The document will be stored in `inner_hits.first_found`
        // due to use of `collapse
        _source: false,
        sort: [{ 'sentinel_one.activity.updated_at': { order: 'asc' } }],
        size: ACTIONS_SEARCH_PAGE_SIZE,
      };

      this.log.debug(
        () =>
          `searching for ${command} responses from [${SENTINEL_ONE_ACTIVITY_INDEX_PATTERN}] index with:\n${stringify(
            searchRequestOptions,
            15
          )}`
      );

      const searchResults = await this.options.esClient
        .search<SentinelOneActivityEsDoc>(searchRequestOptions)
        .catch(catchAndWrapError);

      this.log.debug(
        () =>
          `Search results for SentinelOne ${command} activity documents:\n${stringify(
            searchResults
          )}`
      );

      for (const searchResultHit of searchResults.hits.hits) {
        const isolateActivityResponseDoc = searchResultHit.inner_hits?.first_found.hits
          .hits[0] as SearchHit<SentinelOneActivityEsDoc>;

        if (isolateActivityResponseDoc && isolateActivityResponseDoc._source) {
          const s1ActivityData = isolateActivityResponseDoc._source.sentinel_one.activity;

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const elasticDocId = isolateActivityResponseDoc._id!;
          const s1AgentId = s1ActivityData.agent.id;
          const activityLogEntryId = s1ActivityData.id;
          const activityLogEntryType = s1ActivityData.type;
          const activityLogEntryDescription = s1ActivityData.description.primary;

          for (const actionRequest of actionsByAgentId[s1AgentId]) {
            completedResponses.push(
              this.buildActionResponseEsDoc<{}, SentinelOneIsolationResponseMeta>({
                actionId: actionRequest.EndpointActions.action_id,
                agentId: Array.isArray(actionRequest.agent.id)
                  ? actionRequest.agent.id[0]
                  : actionRequest.agent.id,
                data: { command },
                error:
                  activityLogEntryType === 2010 && command === 'isolate'
                    ? {
                        message:
                          activityLogEntryDescription ??
                          `Action failed. SentinelOne activity log entry [${activityLogEntryId}] has a 'type' value of 2010 indicating a failure to disconnect`,
                      }
                    : undefined,
                meta: {
                  elasticDocId,
                  activityLogEntryId,
                  activityLogEntryType,
                  activityLogEntryDescription,
                },
              })
            );
          }
        }
      }
    } else {
      this.log.debug(`Nothing to search for. List of agents IDs is empty.`);
    }

    this.log.debug(
      () =>
        `${completedResponses.length} ${command} action responses generated:\n${stringify(
          completedResponses
        )}`
    );

    if (warnings.length > 0) {
      this.log.warn(warnings.join('\n'));
    }

    return completedResponses;
  }

  private async checkPendingRunningProcessesAction(
    actionRequests: Array<
      ResponseActionsClientPendingAction<
        undefined,
        GetProcessesActionOutputContent,
        SentinelOneProcessesRequestMeta
      >
    >
  ): Promise<LogsEndpointActionResponse[]> {
    const warnings: string[] = [];
    const completedResponses: LogsEndpointActionResponse[] = [];

    for (const pendingAction of actionRequests) {
      const actionRequest = pendingAction.action;
      const s1ParentTaskId = actionRequest.meta?.parentTaskId;

      if (!s1ParentTaskId) {
        completedResponses.push(
          this.buildActionResponseEsDoc<
            GetProcessesActionOutputContent,
            SentinelOneProcessesResponseMeta
          >({
            actionId: actionRequest.EndpointActions.action_id,
            agentId: Array.isArray(actionRequest.agent.id)
              ? actionRequest.agent.id[0]
              : actionRequest.agent.id,
            data: {
              command: 'running-processes',
              comment: '',
            },
            error: {
              message: `Action request missing SentinelOne 'parentTaskId' value - unable check on its status`,
            },
          })
        );

        warnings.push(
          `Response Action [${actionRequest.EndpointActions.action_id}] is missing [meta.parentTaskId]! (should not have happened)`
        );
      } else {
        const s1TaskStatusApiResponse =
          await this.sendAction<SentinelOneGetRemoteScriptStatusApiResponse>(
            SUB_ACTION.GET_REMOTE_SCRIPT_STATUS,
            { parentTaskId: s1ParentTaskId }
          );

        if (s1TaskStatusApiResponse.data?.data.length) {
          const processListScriptExecStatus = s1TaskStatusApiResponse.data.data[0];
          const taskState = this.calculateTaskState(processListScriptExecStatus);

          if (!taskState.isPending) {
            this.log.debug(`Action is completed - generating response doc for it`);

            const error: LogsEndpointActionResponse['error'] = taskState.isError
              ? {
                  message: `Action failed to execute in SentinelOne. message: ${taskState.message}`,
                }
              : undefined;

            completedResponses.push(
              this.buildActionResponseEsDoc<
                GetProcessesActionOutputContent,
                SentinelOneProcessesResponseMeta
              >({
                actionId: actionRequest.EndpointActions.action_id,
                agentId: Array.isArray(actionRequest.agent.id)
                  ? actionRequest.agent.id[0]
                  : actionRequest.agent.id,
                data: {
                  command: 'running-processes',
                  comment: taskState.message,
                  output: {
                    type: 'json',
                    content: {
                      code: '',
                      entries: [],
                    },
                  },
                },
                error,
                meta: {
                  taskId: processListScriptExecStatus.id,
                },
              })
            );
          }
        }
      }
    }

    this.log.debug(
      () =>
        `${completedResponses.length} running-processes action responses generated:\n${stringify(
          completedResponses
        )}`
    );

    if (warnings.length > 0) {
      this.log.warn(warnings.join('\n'));
    }

    return completedResponses;
  }

  private async checkPendingGetFileActions(
    actionRequests: Array<
      ResponseActionsClientPendingAction<
        ResponseActionGetFileParameters,
        ResponseActionGetFileOutputContent,
        SentinelOneGetFileRequestMeta
      >
    >
  ): Promise<LogsEndpointActionResponse[]> {
    const warnings: string[] = [];
    const completedResponses: LogsEndpointActionResponse[] = [];
    const actionsByAgentAndBatchId: {
      [agentIdAndCommandBatchUuid: string]: LogsEndpointAction<
        ResponseActionGetFileParameters,
        ResponseActionGetFileOutputContent,
        SentinelOneGetFileRequestMeta
      >;
    } = {};
    // Utility to create the key to lookup items in the `actionByAgentAndBatchId` grouping above
    const getLookupKey = (agentId: string, commandBatchUuid: string): string =>
      `${agentId}:${commandBatchUuid}`;
    const searchRequestOptions: SearchRequest = {
      index: SENTINEL_ONE_ACTIVITY_INDEX_PATTERN,
      size: ACTIONS_SEARCH_PAGE_SIZE,
      query: {
        bool: {
          must: [
            {
              term: {
                // Activity Types can be retrieved from S1 via API: `/web/api/v2.1/activities/types`
                // {
                //   "action": "Agent Uploaded Fetched Files",
                //   "descriptionTemplate": "Agent {{ computer_name }} ({{ external_ip }}) successfully uploaded {{ filename }}.",
                //   "id": 80
                // },
                'sentinel_one.activity.type': 80,
              },
            },
          ],
          should: actionRequests.reduce((acc, { action }) => {
            const s1AgentId = action.meta?.agentId;
            const s1CommandBatchUUID = action.meta?.commandBatchUuid;

            if (s1AgentId && s1CommandBatchUUID) {
              actionsByAgentAndBatchId[getLookupKey(s1AgentId, s1CommandBatchUUID)] = action;

              acc.push({
                bool: {
                  filter: [
                    { term: { 'sentinel_one.activity.agent.id': s1AgentId } },
                    {
                      term: {
                        'sentinel_one.activity.data.flattened.commandBatchUuid': s1CommandBatchUUID,
                      },
                    },
                  ],
                },
              });
            } else {
              // This is an edge case and should never happen. But just in case :-)
              warnings.push(
                `get-file response action ID [${action.EndpointActions.action_id}] missing SentinelOne agent ID or commandBatchUuid value(s). Unable to check on it's status - forcing it to complete as a failure.`
              );

              completedResponses.push(
                this.buildActionResponseEsDoc<{}, {}>({
                  actionId: action.EndpointActions.action_id,
                  agentId: Array.isArray(action.agent.id) ? action.agent.id[0] : action.agent.id,
                  data: { command: 'get-file' },
                  error: {
                    message: `Unable to very if action completed. SentinelOne agent id or commandBatchUuid missing on action request document!`,
                  },
                })
              );
            }

            return acc;
          }, [] as QueryDslQueryContainer[]),
          minimum_should_match: 1,
        },
      },
    };

    if (Object.keys(actionsByAgentAndBatchId).length) {
      this.log.debug(
        () =>
          `searching for get-file responses from [${SENTINEL_ONE_ACTIVITY_INDEX_PATTERN}] index with:\n${stringify(
            searchRequestOptions,
            15
          )}`
      );

      const searchResults = await this.options.esClient
        .search<SentinelOneActivityEsDoc<SentinelOneActivityDataForType80>>(searchRequestOptions)
        .catch(catchAndWrapError);

      this.log.debug(
        () =>
          `Search results for SentinelOne get-file activity documents:\n${stringify(searchResults)}`
      );

      for (const s1Hit of searchResults.hits.hits) {
        const s1ActivityDoc = s1Hit._source;
        const s1AgentId = s1ActivityDoc?.sentinel_one.activity.agent.id;
        const s1CommandBatchUuid =
          s1ActivityDoc?.sentinel_one.activity.data.flattened.commandBatchUuid ?? '';
        const activityLogEntryId = s1ActivityDoc?.sentinel_one.activity.id ?? '';

        if (s1AgentId && s1CommandBatchUuid) {
          const actionRequest =
            actionsByAgentAndBatchId[getLookupKey(s1AgentId, s1CommandBatchUuid)];

          if (actionRequest) {
            const downloadUrl = s1ActivityDoc?.sentinel_one.activity.data.downloaded.url ?? '';
            const error = !downloadUrl
              ? {
                  message: `File retrieval failed (No download URL defined in SentinelOne activity log id [${activityLogEntryId}])`,
                }
              : undefined;

            completedResponses.push(
              this.buildActionResponseEsDoc<
                ResponseActionGetFileOutputContent,
                SentinelOneGetFileResponseMeta
              >({
                actionId: actionRequest.EndpointActions.action_id,
                agentId: Array.isArray(actionRequest.agent.id)
                  ? actionRequest.agent.id[0]
                  : actionRequest.agent.id,
                data: {
                  command: 'get-file',
                  comment: s1ActivityDoc?.sentinel_one.activity.description.primary ?? '',
                  output: {
                    type: 'json',
                    content: {
                      // code applies only to Endpoint agents
                      code: '',
                      // We don't know the file size for S1 retrieved files
                      zip_size: 0,
                      // We don't have the contents of the zip file for S1
                      contents: [],
                    },
                  },
                },
                error,
                meta: {
                  activityLogEntryId,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  elasticDocId: s1Hit._id!,
                  downloadUrl,
                  createdAt: s1ActivityDoc?.sentinel_one.activity.updated_at ?? '',
                  filename: s1ActivityDoc?.sentinel_one.activity.data.flattened.filename ?? '',
                },
              })
            );
          } else {
            warnings.push(
              `Activity log entry ${s1Hit._id} was a matched, but no action request for it (should not happen)`
            );
          }
        }
      }
    } else {
      this.log.debug(`Nothing to search for. No pending get-file actions`);
    }

    this.log.debug(
      () =>
        `${completedResponses.length} get-file action responses generated:\n${stringify(
          completedResponses
        )}`
    );

    if (warnings.length > 0) {
      this.log.warn(warnings.join('\n'));
    }

    return completedResponses;
  }

  /**
   * Calculates the state of a SentinelOne Task using the response from their task status API. It
   * returns a normalized object with basic info derived from the task status value
   * @param taskStatusRecord
   * @private
   */
  private calculateTaskState(taskStatusRecord: SentinelOneRemoteScriptExecutionStatus): {
    isPending: boolean;
    isError: boolean;
    message: string;
  } {
    const taskStatusValue = taskStatusRecord.status;
    let message =
      taskStatusRecord.detailedStatus ?? taskStatusRecord.statusDescription ?? taskStatusValue;
    let isPending: boolean;
    let isError: boolean;

    switch (taskStatusValue) {
      // PENDING STATUSES ------------------------------------------
      case 'created':
      case 'pending':
      case 'pending_user_action':
      case 'scheduled':
      case 'in_progress':
      case 'partially_completed':
        isPending = true;
        isError = true;
        break;

      // COMPLETE STATUSES ------------------------------------------
      case 'canceled':
        isPending = false;
        isError = true;
        message = `SentinelOne Parent Task Id [${taskStatusRecord.parentTaskId}] was canceled${
          taskStatusRecord.detailedStatus ? ` - ${taskStatusRecord.detailedStatus}` : ''
        }`;
        break;

      case 'completed':
        isPending = false;
        isError = false;
        break;

      case 'expired':
        isPending = false;
        isError = true;
        break;

      case 'failed':
        isPending = false;
        isError = true;
        break;

      default:
        isPending = false;
        isError = true;
        message = `Unable to determine task state - unknown SentinelOne task status value [${taskStatusRecord}] for task parent id [${taskStatusRecord.parentTaskId}]`;
    }

    return {
      isPending,
      isError,
      message,
    };
  }

  private async checkPendingKillProcessActions(
    actionRequests: Array<
      ResponseActionsClientPendingAction<
        ResponseActionParametersWithProcessName,
        KillProcessActionOutputContent,
        SentinelOneKillProcessRequestMeta
      >
    >
  ): Promise<LogsEndpointActionResponse[]> {
    const warnings: string[] = [];
    const completedResponses: LogsEndpointActionResponse[] = [];

    for (const pendingAction of actionRequests) {
      const actionRequest = pendingAction.action;
      const s1ParentTaskId = actionRequest.meta?.parentTaskId;

      if (!s1ParentTaskId) {
        completedResponses.push(
          this.buildActionResponseEsDoc<
            KillProcessActionOutputContent,
            SentinelOneKillProcessResponseMeta
          >({
            actionId: actionRequest.EndpointActions.action_id,
            agentId: Array.isArray(actionRequest.agent.id)
              ? actionRequest.agent.id[0]
              : actionRequest.agent.id,
            data: {
              command: 'kill-process',
              comment: '',
            },
            error: {
              message: `Action request missing SentinelOne 'parentTaskId' value - unable check on its status`,
            },
          })
        );

        warnings.push(
          `Response Action [${actionRequest.EndpointActions.action_id}] is missing [meta.parentTaskId]! (should not have happened)`
        );
      } else {
        const s1TaskStatusApiResponse =
          await this.sendAction<SentinelOneGetRemoteScriptStatusApiResponse>(
            SUB_ACTION.GET_REMOTE_SCRIPT_STATUS,
            { parentTaskId: s1ParentTaskId }
          );

        if (s1TaskStatusApiResponse.data?.data.length) {
          const killProcessStatus = s1TaskStatusApiResponse.data.data[0];
          const taskState = this.calculateTaskState(killProcessStatus);

          if (!taskState.isPending) {
            this.log.debug(`Action is completed - generating response doc for it`);

            const error: LogsEndpointActionResponse['error'] = taskState.isError
              ? {
                  message: `Action failed to execute in SentinelOne. message: ${taskState.message}`,
                }
              : undefined;

            completedResponses.push(
              this.buildActionResponseEsDoc<
                KillProcessActionOutputContent,
                SentinelOneKillProcessResponseMeta
              >({
                actionId: actionRequest.EndpointActions.action_id,
                agentId: Array.isArray(actionRequest.agent.id)
                  ? actionRequest.agent.id[0]
                  : actionRequest.agent.id,
                data: {
                  command: 'kill-process',
                  comment: taskState.message,
                  output: {
                    type: 'json',
                    content: {
                      code: killProcessStatus.statusCode ?? killProcessStatus.status,
                      command: actionRequest.EndpointActions.data.command,
                      process_name: actionRequest.EndpointActions.data.parameters?.process_name,
                    },
                  },
                },
                error,
                meta: {
                  taskId: killProcessStatus.id,
                },
              })
            );
          }
        }
      }
    }

    this.log.debug(
      () =>
        `${completedResponses.length} kill-process action responses generated:\n${stringify(
          completedResponses
        )}`
    );

    if (warnings.length > 0) {
      this.log.warn(warnings.join('\n'));
    }

    return completedResponses;
  }
}
