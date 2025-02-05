/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetActionRequest } from '@kbn/fleet-plugin/server/services/actions';
import { v4 as uuidv4 } from 'uuid';
import { CustomHttpRequestError } from '../../../../../utils/custom_http_request_error';
import { getActionRequestExpiration } from '../../utils';
import { ResponseActionsClientError } from '../errors';
import { stringify } from '../../../../utils/stringify';
import type { HapiReadableStream } from '../../../../../types';
import type {
  ResponseActionsApiCommandNames,
  ResponseActionAgentType,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import type {
  ExecuteActionRequestBody,
  GetProcessesRequestBody,
  IsolationRouteRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
  ResponseActionsRequestBody,
  ScanActionRequestBody,
  SuspendProcessRequestBody,
  KillProcessRequestBody,
  UnisolationRouteRequestBody,
} from '../../../../../../common/api/endpoint';
import { ResponseActionsClientImpl } from '../lib/base_response_actions_client';
import type {
  ActionDetails,
  HostMetadata,
  GetProcessesActionOutputContent,
  KillProcessActionOutputContent,
  ResponseActionExecuteOutputContent,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionParametersWithProcessData,
  ResponseActionsExecuteParameters,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
  SuspendProcessActionOutputContent,
  LogsEndpointAction,
  EndpointActionDataParameterTypes,
  UploadedFileInfo,
  ResponseActionScanParameters,
  ResponseActionScanOutputContent,
} from '../../../../../../common/endpoint/types';
import type {
  CommonResponseActionMethodOptions,
  GetFileDownloadMethodResponse,
} from '../lib/types';
import { DEFAULT_EXECUTE_ACTION_TIMEOUT } from '../../../../../../common/endpoint/service/response_actions/constants';

const getInvalidAgentsWarning = (invalidAgents: string[]) =>
  invalidAgents.length
    ? `The following agent ids are not valid: ${JSON.stringify(
        invalidAgents
      )} and will not be included in action request`
    : '';

export class EndpointActionsClient extends ResponseActionsClientImpl {
  protected readonly agentType: ResponseActionAgentType = 'endpoint';

  private async checkAgentIds(ids: string[]): Promise<{
    valid: string[];
    invalid: string[];
    allValid: boolean;
    hosts: HostMetadata[];
  }> {
    const uniqueIds = [...new Set(ids)];
    const foundEndpointHosts = await this.options.endpointService
      .getEndpointMetadataService()
      .getMetadataForEndpoints(uniqueIds);
    const validIds = foundEndpointHosts.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);
    const invalidIds = ids.filter((id) => !validIds.includes(id));

    if (invalidIds.length) {
      this.log.warn(getInvalidAgentsWarning(invalidIds));
    }

    return {
      valid: validIds,
      invalid: invalidIds,
      allValid: invalidIds.length === 0,
      hosts: foundEndpointHosts,
    };
  }

  private async handleResponseAction<
    TOptions extends ResponseActionsRequestBody = ResponseActionsRequestBody,
    TResponse extends ActionDetails = ActionDetails,
    TMethodOptions extends CommonResponseActionMethodOptions = CommonResponseActionMethodOptions
  >(
    command: ResponseActionsApiCommandNames,
    actionReq: TOptions,
    options?: TMethodOptions
  ): Promise<TResponse> {
    const validatedAgents = await this.checkAgentIds(actionReq.endpoint_ids);
    const actionId = uuidv4();
    const { error: validationError } = await this.validateRequest({
      ...actionReq,
      command,
      endpoint_ids: validatedAgents.valid || [],
    });

    const { hosts, ruleName, ruleId, error } = this.getMethodOptions<TMethodOptions>(options);
    let actionError: string | undefined = validationError?.message || error;

    if (actionError && !this.options.isAutomated) {
      throw new ResponseActionsClientError(actionError, 400);
    }

    // Dispatch action to Endpoint using Fleet
    if (!actionError) {
      try {
        await this.dispatchActionViaFleet({
          actionId,
          agents: validatedAgents.valid,
          data: {
            command,
            comment: actionReq.comment,
            parameters: actionReq.parameters as EndpointActionDataParameterTypes,
          },
        });
      } catch (e) {
        // If not in Automated mode, then just throw, else save the error and write
        // it to the Endpoint Action request doc
        if (!this.options.isAutomated) {
          throw e;
        }

        actionError = e.message;
      }
    }

    // Append warning message to comment if there are invalid agents
    const commentMessage = actionReq.comment ? actionReq.comment : '';
    const warningMessage = `(WARNING: ${getInvalidAgentsWarning(validatedAgents.invalid)})`;
    const comment = validatedAgents.invalid.length
      ? commentMessage
        ? `${commentMessage}. ${warningMessage}`
        : warningMessage
      : actionReq.comment;

    // Write action to endpoint index
    await this.writeActionRequestToEndpointIndex({
      ...actionReq,
      endpoint_ids: validatedAgents.valid,
      error: actionError,
      ruleId,
      ruleName,
      hosts,
      actionId,
      command,
      comment,
    });

    // Update cases
    await this.updateCases({
      command,
      actionId,
      comment,
      caseIds: actionReq.case_ids,
      alertIds: actionReq.alert_ids,
      hosts: validatedAgents.valid.map((hostId) => {
        return {
          hostId,
          hostname:
            validatedAgents.hosts.find((host) => host.agent.id === hostId)?.host.hostname ??
            hosts?.[hostId].name ??
            '',
        };
      }),
    });

    return this.fetchActionDetails<TResponse>(actionId);
  }

  private async dispatchActionViaFleet({
    actionId = uuidv4(),
    agents,
    data,
  }: Pick<FleetActionRequest, 'agents'> & {
    actionId?: string;
    data: LogsEndpointAction['EndpointActions']['data'];
  }): Promise<FleetActionRequest> {
    const [messageSigningService, fleetActionsService] = await Promise.all([
      this.options.endpointService.getMessageSigningService(),
      this.options.endpointService.getFleetActionsClient(),
    ]);
    const fleetActionDoc: FleetActionRequest = {
      '@timestamp': new Date().toISOString(),
      input_type: 'endpoint',
      type: 'INPUT_ACTION',
      timeout: 300, // 5 minutes
      expiration: getActionRequestExpiration(),
      user_id: this.options.username,
      action_id: actionId || uuidv4(),
      agents,
      // Casting needed because Fleet type definition, which accepts any object, but was not defined using `any`
      data: data as unknown as FleetActionRequest['data'],
    };
    const signedAction = await messageSigningService.sign(fleetActionDoc);

    fleetActionDoc.signed = {
      data: signedAction.data.toString('base64'),
      signature: signedAction.signature,
    };

    this.log.debug(`Signed Fleet endpoint action request:\n${stringify(fleetActionDoc)}`);

    return fleetActionsService.create(fleetActionDoc).catch((err) => {
      const error = new ResponseActionsClientError(
        `Attempt to create Fleet [${
          data.command
        }] response action request for agents [${agents.join(', ')}] failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    });
  }

  async isolate(
    actionRequest: IsolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    return this.handleResponseAction<IsolationRouteRequestBody, ActionDetails>(
      'isolate',
      actionRequest,
      options
    );
  }

  async release(
    actionRequest: UnisolationRouteRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails> {
    return this.handleResponseAction<UnisolationRouteRequestBody, ActionDetails>(
      'unisolate',
      actionRequest,
      options
    );
  }

  async killProcess(
    actionRequest: KillProcessRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithProcessData>
  > {
    return this.handleResponseAction<
      KillProcessRequestBody,
      ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithProcessData>
    >('kill-process', actionRequest, options);
  }

  async suspendProcess(
    actionRequest: SuspendProcessRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithProcessData>
  > {
    return this.handleResponseAction<
      SuspendProcessRequestBody,
      ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithProcessData>
    >('suspend-process', actionRequest, options);
  }

  async runningProcesses(
    actionRequest: GetProcessesRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails<GetProcessesActionOutputContent>> {
    return this.handleResponseAction<
      GetProcessesRequestBody,
      ActionDetails<GetProcessesActionOutputContent>
    >('running-processes', actionRequest, options);
  }

  async getFile(
    actionRequest: ResponseActionGetFileRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>> {
    return this.handleResponseAction<
      ResponseActionGetFileRequestBody,
      ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>
    >('get-file', actionRequest, options);
  }

  async execute(
    actionRequest: ExecuteActionRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>> {
    let actionRequestWithDefaults = actionRequest;

    // Default for `timeout` applied here if not defined on request
    if (!actionRequestWithDefaults.parameters.timeout) {
      actionRequestWithDefaults = {
        ...actionRequest,
        parameters: {
          ...actionRequest.parameters,
          timeout: DEFAULT_EXECUTE_ACTION_TIMEOUT,
        },
      };
    }

    return this.handleResponseAction<
      ExecuteActionRequestBody,
      ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>
    >('execute', actionRequestWithDefaults, options);
  }

  async scan(
    actionRequest: ScanActionRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails<ResponseActionScanOutputContent, ResponseActionScanParameters>> {
    return this.handleResponseAction<
      ScanActionRequestBody,
      ActionDetails<ResponseActionScanOutputContent, ResponseActionScanParameters>
    >('scan', actionRequest, options);
  }

  async upload(
    actionRequest: UploadActionApiRequestBody,
    options: CommonResponseActionMethodOptions = {}
  ): Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>> {
    const fleetFiles = await this.options.endpointService.getFleetToHostFilesClient();
    const fileStream = actionRequest.file as HapiReadableStream;
    const { file: _, parameters: userParams, ...actionPayload } = actionRequest;
    const uploadParameters: ResponseActionUploadParameters = {
      ...userParams,
      file_id: '',
      file_name: '',
      file_sha256: '',
      file_size: 0,
    };

    const createdFile = await fleetFiles.create(fileStream, actionPayload.endpoint_ids);

    uploadParameters.file_id = createdFile.id;
    uploadParameters.file_name = createdFile.name;
    uploadParameters.file_sha256 = createdFile.sha256;
    uploadParameters.file_size = createdFile.size;

    const createFileActionOptions = {
      ...actionPayload,
      parameters: uploadParameters,
      command: 'upload' as ResponseActionsApiCommandNames,
    };

    try {
      const createdAction = await this.handleResponseAction<
        typeof createFileActionOptions,
        ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>
      >('upload', createFileActionOptions, options);

      // Update the file meta to include the action id, and if any errors (unlikely),
      // then just log them and still allow api to return success since the action has
      // already been created and potentially dispatched to Endpoint. Action ID is not
      // needed by the Endpoint or fleet-server's API, so no need to fail here
      try {
        await fleetFiles.update(uploadParameters.file_id, { actionId: createdAction.id });
      } catch (e) {
        this.log.warn(`Attempt to update File meta with Action ID failed: ${e.message}`, e);
      }

      return createdAction;
    } catch (err) {
      if (uploadParameters.file_id) {
        // Try to delete the created file since creating the action threw an error
        try {
          await fleetFiles.delete(uploadParameters.file_id);
        } catch (e) {
          this.log.error(
            `Attempt to clean up file id [${uploadParameters.file_id}] (after action creation was unsuccessful) failed; ${e.message}`,
            e
          );
        }
      }

      throw err;
    }
  }

  async getFileDownload(actionId: string, fileId: string): Promise<GetFileDownloadMethodResponse> {
    await this.ensureValidActionId(actionId);

    const fleetFiles = await this.options.endpointService.getFleetFromHostFilesClient();
    const file = await fleetFiles.get(fileId);

    if (file.actionId !== actionId) {
      throw new CustomHttpRequestError(`Invalid file id [${fileId}] for action [${actionId}]`, 400);
    }

    return fleetFiles.download(fileId);
  }

  async getFileInfo(actionId: string, fileId: string): Promise<UploadedFileInfo> {
    await this.ensureValidActionId(actionId);

    const fleetFiles = await this.options.endpointService.getFleetFromHostFilesClient();
    const {
      name,
      id,
      mimeType,
      size,
      status,
      created,
      agents,
      actionId: fileActionId,
    } = await fleetFiles.get(fileId);

    if (fileActionId !== actionId) {
      throw new ResponseActionsClientError(
        `Invalid file ID. File [${fileId}] not associated with action ID [${actionId}]`
      );
    }

    return {
      name,
      id,
      mimeType,
      size,
      status,
      created,
      actionId,
      agentId: agents[0],
      agentType: this.agentType,
    };
  }
}
