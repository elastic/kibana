/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup } from '@kbn/files-plugin/public';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import { INVESTIGATE_APP_ID } from '@kbn/deeplinks-observability/constants';
import type { InvestigateFileKinds } from './types';
import { MAX_IMAGE_FILE_SIZE, imageMimeTypes } from './constant';
export enum HttpApiPrivilegeOperation {
  Read = 'Read',
  Create = 'Create',
  Delete = 'Delete',
}

export const SECURITY_SOLUTION_OWNER = 'securitySolution' as const;
export const OBSERVABILITY_OWNER = 'observability' as const;
export const GENERAL_INVESTIGATE_OWNER = INVESTIGATE_APP_ID; // TODO: Change this to "investigate" once the name is updated;
export const constructFilesHttpOperationPrivilege = (
  owner: Owner,
  operation: HttpApiPrivilegeOperation
) => {
  return `${owner}${FILE_KIND_DELIMITER}${operation}`;
};
export const OWNERS = [
  GENERAL_INVESTIGATE_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
] as const;
export type Owner = (typeof OWNERS)[number];

export const constructFileKindIdByOwner = (owner: Owner) => `${owner}${FILE_KIND_DELIMITER}`;
const FILE_KIND_DELIMITER = 'FilesInvestigateApp';

const buildFileKind = (owner: Owner): FileKindBrowser => {
  return {
    id: constructFileKindIdByOwner(owner),
    allowedMimeTypes: imageMimeTypes,
    maxSizeBytes: MAX_IMAGE_FILE_SIZE,
  };
};

/**
 * The file kind definition for interacting with the file service for the UI
 */
const createFileKinds = (): InvestigateFileKinds => {
  const caseFileKinds = new Map<Owner, FileKindBrowser>();
  for (const owner of OWNERS) {
    caseFileKinds.set(owner, buildFileKind(owner));
  }
  return caseFileKinds;
};

export const registerCaseFileKinds = (filesSetupPlugin: FilesSetup) => {
  const fileKinds = createFileKinds();
  for (const fileKind of fileKinds.values()) {
    filesSetupPlugin.registerFileKind(fileKind);
  }
};
