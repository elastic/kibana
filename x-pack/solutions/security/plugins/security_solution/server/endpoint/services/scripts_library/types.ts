/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import type {
  CreateScriptRequestBody,
  PatchUpdateRequestBody,
  ListScriptsRequestQuery,
} from '../../../../common/api/endpoint/scripts_library';
import type {
  EndpointScript,
  EndpointScriptListApiResponse,
} from '../../../../common/endpoint/types';

export type { ScriptsLibrarySavedObjectAttributes } from '../../lib/scripts_library';

export interface ScriptsLibraryClientInterface {
  create: (script: CreateScriptRequestBody) => Promise<EndpointScript>;
  /**
   * Updates an existing script with the data provided. This method accepts partial
   * script data allowing for only certain fields to be updated
   */
  update: (script: ScriptUpdateParams) => Promise<EndpointScript>;
  get: (scriptId: string) => Promise<EndpointScript>;
  list: (options?: ListScriptsRequestQuery) => Promise<EndpointScriptListApiResponse>;
  delete: (scriptId: string) => Promise<void>;
  download: (scriptId: string) => Promise<ScriptDownloadResponse>;
}

export type ScriptUpdateParams = Partial<PatchUpdateRequestBody> & { id: string };

export interface ScriptDownloadResponse {
  stream: Readable;
  fileName: string;
  mimeType?: string;
}
