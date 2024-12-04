/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `activity` document ingested from SentinelOne via the integration
 *
 * NOTE:  not all properties are currently mapped below. Check the index definition if wanting to
 *        see what else is available and add it bellow if needed
 */
export interface SentinelOneActivityEsDoc<TData = unknown> {
  sentinel_one: {
    activity: {
      agent: {
        /** This is the internal ID of the host in sentinelOne (NOT the agent's UUID) */
        id: string;
      };
      updated_at: string;
      description: {
        primary: string;
        secondary?: string;
      };
      id: string;
      /** The activity type. Valid values can be retrieved from S1 via API: `/web/api/v2.1/activities/types` */
      type: number;
      /** Activity specific data */
      data: TData;
    };
  };
}

/**
 * Activity data for file uploaded to S1 by an Agent:
 * ```
 * {
 *   "action": "Agent Uploaded Fetched Files",
 *   "descriptionTemplate": "Agent {{ computer_name }} ({{ external_ip }}) successfully uploaded {{ filename }}.",
 *   "id": 80
 * },
 * ```
 */
export interface SentinelOneActivityDataForType80 {
  flattened: {
    commandId: number;
    commandBatchUuid: string;
    filename: string;
    sourceType: string;
    uploadedFilename: string;
  };
  site: {
    name: string;
  };
  group_name: string;
  scope: {
    level: string;
    name: string;
  };
  fullscope: {
    details: string;
    details_path: string;
  };
  downloaded: {
    url: string;
  };
  account: {
    name: string;
  };
}

export interface SentinelOneActionRequestCommonMeta {
  /** The S1 agent id */
  agentId: string;
  /** The S1 agent assigned UUID */
  agentUUID: string;
  /** The host name */
  hostName: string;
}

/** Metadata capture for the isolation actions (`isolate` and `release`) */
export type SentinelOneIsolationRequestMeta = SentinelOneActionRequestCommonMeta;

/** Metadata captured when creating the isolation response document in ES for both `isolate` and `release` */
export interface SentinelOneIsolationResponseMeta {
  /** The document ID in the Elasticsearch S1 activity index that was used to complete the response action */
  elasticDocId: string;
  /** The SentinelOne activity log entry ID */
  activityLogEntryId: string;
  /** The SentinelOne activity log entry type */
  activityLogEntryType: number;
  /** The SentinelOne activity log primary description */
  activityLogEntryDescription: string;
}

export interface SentinelOneGetFileRequestMeta extends SentinelOneActionRequestCommonMeta {
  /** The SentinelOne activity log entry id for the Get File request */
  activityId: string;
  /**
   * The command batch UUID is a value that appears in both the Request and the Response, thus it
   * is stored in the request to facilitate locating the response later by the background task
   */
  commandBatchUuid: string;
}

export interface SentinelOneGetFileResponseMeta {
  /** The document ID in the Elasticsearch S1 activity index that was used to complete the response action */
  elasticDocId: string;
  /** The SentinelOne activity log entry ID */
  activityLogEntryId: string;
  /** The S1 download url (relative URI) for the file that was retrieved */
  downloadUrl: string;
  /** When the file was created/uploaded to SentinelOne */
  createdAt: string;
  filename: string;
}

export interface SentinelOneProcessesRequestMeta extends SentinelOneActionRequestCommonMeta {
  /**
   * The Parent Task Is that is executing the kill process action in SentinelOne.
   * Used to check on the status of that action
   */
  parentTaskId: string;
}

export interface SentinelOneProcessesResponseMeta {
  /** The SentinelOne task ID associated with the completion of the running-processes action */
  taskId: string;
}

export interface SentinelOneKillProcessRequestMeta extends SentinelOneIsolationRequestMeta {
  /**
   * The Parent Task Is that is executing the kill process action in SentinelOne.
   * Used to check on the status of that action
   */
  parentTaskId: string;
}

export interface SentinelOneKillProcessResponseMeta {
  /** The SentinelOne task ID associated with the completion of the kill-process action */
  taskId: string;
}
