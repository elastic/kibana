/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup } from '@kbn/files-plugin/public';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';

import type { InvestigateFileKinds } from './types';
import { imageMimeTypes } from './constant';
export const SECURITY_SOLUTION_OWNER = 'securitySolution' as const;
export const OBSERVABILITY_OWNER = 'observability' as const;
export const GENERAL_INSTIGATE_OWNER = 'observability' as const; // TODO: Change this to "investigate" once the name is updated;

export const OWNERS = [
  GENERAL_INSTIGATE_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
] as const;
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB
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
