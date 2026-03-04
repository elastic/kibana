/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SCRIPT_TAGS } from '../service/scripts_library/constants';
import type { SupportedHostOsType } from '../constants';

interface EndpointScriptBase {
  id: string;
  name: string;
  platform: Array<SupportedHostOsType>;
  fileName: string;
  /** Size of file in bytes */
  fileSize: number;
  /** SHA-256 hash of the file */
  fileHash: string;
  /** Id of the internally stored file for this script */
  fileId: string;
  /** If `true`, then the script, when invoked, requires input arguments to be provided */
  requiresInput: boolean;
  /**
   * The URI relative to Kibana's base path + space if any) to download the script associated with this script entry */
  downloadUri: string;
  tags: Array<keyof typeof SCRIPT_TAGS>;
  description?: string;
  instructions?: string;
  example?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  version: string;
}

/**
 * A script stored in the Endpoint (Elastic Defend) Scripts Library.
 * Discriminated union on `fileType`: when `'archive'`, `pathToExecutable` is a required string;
 * when `'script'`, `pathToExecutable` is `undefined`.
 */
export type EndpointScript =
  | (EndpointScriptBase & {
      /** The type of the file — a plain script */
      fileType: 'script';
      pathToExecutable?: undefined;
    })
  | (EndpointScriptBase & {
      /** The type of the file — an archive containing an executable */
      fileType: 'archive';
      /** The file path inside the archive to be executed */
      pathToExecutable: string;
    });

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

export type SortableScriptLibraryFields = keyof Pick<
  EndpointScript,
  'name' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'fileSize'
>;

export type SortDirection = EndpointScriptListApiResponse['sortDirection'];

export type EditableScriptFields = Partial<
  Pick<
    EndpointScript,
    | 'name'
    | 'platform'
    | 'fileType'
    | 'tags'
    | 'description'
    | 'instructions'
    | 'example'
    | 'pathToExecutable'
    | 'requiresInput'
  >
>;
