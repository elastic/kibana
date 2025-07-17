/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import type {
  ActionDetails,
  KillProcessActionOutputContent,
  ResponseActionParametersWithProcessData,
  SuspendProcessActionOutputContent,
  GetProcessesActionOutputContent,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
  EndpointActionData,
  LogsEndpointActionResponse,
  UploadedFileInfo,
  ResponseActionScanOutputContent,
  ResponseActionScanParameters,
  ResponseActionRunScriptOutputContent,
  ResponseActionRunScriptParameters,
} from '../../../../../../common/endpoint/types';
import type {
  IsolationRouteRequestBody,
  UnisolationRouteRequestBody,
  GetProcessesRequestBody,
  ResponseActionGetFileRequestBody,
  ExecuteActionRequestBody,
  UploadActionApiRequestBody,
  ScanActionRequestBody,
  KillProcessRequestBody,
  SuspendProcessRequestBody,
  RunScriptActionRequestBody,
  BaseActionRequestBody,
} from '../../../../../../common/api/endpoint';

export type OmitUnsupportedAttributes<T extends BaseActionRequestBody> = Omit<
  T,
  // We don't need agent type in the Response Action client because each client is initialized for only 1 agent type
  'agent_type'
>;

/**
 * Additional options for response action methods that fall outside of the Request Body
 */
export interface CommonResponseActionMethodOptions
  /**
   * Host names are sometime passed in from the Alert when running in automated
   * mode so that it gets stored with the action request if the host is no
   * longer running elastic defend
   */
  extends Pick<EndpointActionData, 'hosts'> {
  /** Used when invoked from rules */
  ruleId?: string;
  /** Used when invoked from rules */
  ruleName?: string;
  /**
   * If defined, then action request will be created with an Error. Note that teh action will
   * not be dispatched to Fleet or an external EDR system if this value is defined
   */
  error?: string;
}

export interface ProcessPendingActionsMethodOptions {
  addToQueue: (...docs: LogsEndpointActionResponse[]) => void;
  abortSignal: AbortSignal;
}

export interface GetFileDownloadMethodResponse {
  stream: Readable;
  fileName: string;
  mimeType?: string;
}

export interface CustomScript {
  /**
   * Unique identifier for the script
   */
  id: string;
  /**
   * Display name of the script
   */
  name: string;
  /**
   * Description of what the script does
   */
  description: string;
}

export interface CustomScriptsResponse {
  data: CustomScript[];
}

/**
 * The interface required for a Response Actions provider
 */
export interface ResponseActionsClient {
  isolate: (
    actionRequest: OmitUnsupportedAttributes<IsolationRouteRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails>;

  release: (
    actionRequest: OmitUnsupportedAttributes<UnisolationRouteRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails>;

  killProcess: (
    actionRequest: OmitUnsupportedAttributes<KillProcessRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<
    ActionDetails<KillProcessActionOutputContent, ResponseActionParametersWithProcessData>
  >;

  suspendProcess: (
    actionRequest: OmitUnsupportedAttributes<SuspendProcessRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<
    ActionDetails<SuspendProcessActionOutputContent, ResponseActionParametersWithProcessData>
  >;

  runningProcesses: (
    actionRequest: OmitUnsupportedAttributes<GetProcessesRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<GetProcessesActionOutputContent>>;

  getFile: (
    actionRequest: OmitUnsupportedAttributes<ResponseActionGetFileRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters>>;

  execute: (
    actionRequest: OmitUnsupportedAttributes<ExecuteActionRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionExecuteOutputContent, ResponseActionsExecuteParameters>>;

  upload: (
    actionRequest: OmitUnsupportedAttributes<UploadActionApiRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters>>;

  /**
   * Will fetch all pending response actions and check to see if they can be Completed. If so, then
   * a Response record will be added to the queue to be written to the responses index.
   *
   * **NOTE**: the actual write to the index is done by the `QueueProcessor` instance - which at
   * the time of this writing, is being controlled by the background task.
   */
  processPendingActions: (options: ProcessPendingActionsMethodOptions) => Promise<void>;

  /**
   * Retrieves a list of all custom scripts for a given agent type - ** not a Response Action **
   */
  getCustomScripts: () => Promise<CustomScriptsResponse>;

  /**
   * Retrieve a file for download
   * @param actionId
   * @param fileId
   */
  getFileDownload(actionId: string, fileId: string): Promise<GetFileDownloadMethodResponse>;

  /**
   * Retrieve info about a file
   * @param actionId
   * @param fileId
   */
  getFileInfo(actionId: string, fileId: string): Promise<UploadedFileInfo>;

  /**
   * Scan a file path/folder
   * @param actionRequest
   * @param options
   */

  scan: (
    actionRequest: OmitUnsupportedAttributes<ScanActionRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<ActionDetails<ResponseActionScanOutputContent, ResponseActionScanParameters>>;

  /**
   * Run a script
   * @param actionRequest
   * @param options
   */
  runscript: (
    actionRequest: OmitUnsupportedAttributes<RunScriptActionRequestBody>,
    options?: CommonResponseActionMethodOptions
  ) => Promise<
    ActionDetails<ResponseActionRunScriptOutputContent, ResponseActionRunScriptParameters>
  >;
}
