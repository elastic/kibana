/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import type { CreateScriptRequestBody } from '../../../../common/api/endpoint/scripts_library';
import type { EndpointScript } from '../../../../common/endpoint/types';

export interface ScriptsLibraryClientInterface {
  create: (script: CreateScriptRequestBody) => Promise<EndpointScript>;
  /**
   * Updates an existing script with the data provided. This method accepts partial
   * script data allowing for only certain fields to be updated
   */
  update: (script: Partial<CreateScriptRequestBody>) => Promise<EndpointScript>;
  get: (scriptId: string) => Promise<EndpointScript>;
  list: () => Promise<void>;
  delete: (scriptId: string) => Promise<void>;
  download: (scriptId: string) => Promise<ScriptDownloadResponse>;
}

export interface ScriptDownloadResponse {
  stream: Readable;
  fileName: string;
  mimeType?: string;
}
