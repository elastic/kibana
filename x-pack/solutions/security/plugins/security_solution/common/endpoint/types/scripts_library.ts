/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedHostOsType } from '../constants';

/**
 * A script stored in the Endpoint (Elastic Defend) Scripts Library
 */
export interface EndpointScript {
  id: string;
  name: string;
  platform: Array<SupportedHostOsType>;
  /** If `true`, then the script, when invoked, requires input arguments to be provided */
  requiresInput: boolean;
  /**
   * The URI relative to Kibana's base path + space if any) to download the script associated with this script entry */
  downloadUri: string;
  description?: string;
  instructions?: string;
  example?: string;
  /** If the file is an archive, this property would hold the file path in that archive to be executed */
  pathToExecutable?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  version: string;
}

export interface EndpointScriptApiResponse {
  data: EndpointScript;
}

export interface EndpointScriptListApiResponse {
  data: EndpointScript[];
  page: number;
  pageSize: number;
  total: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}
