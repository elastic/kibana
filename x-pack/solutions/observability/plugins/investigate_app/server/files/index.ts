/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FileKind } from '@kbn/files-plugin/common';
import type { FilesSetup } from '@kbn/files-plugin/server';

import { INVESTIGATE_APP_ID } from '@kbn/deeplinks-observability/constants';
import { imageMimeTypes, MAX_IMAGE_FILE_SIZE } from '../../common/files/constant';
import {
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
  HttpApiPrivilegeOperation,
} from '../../common/files'; // Ensure this path is correct and the module exists
import type { Owner } from '../../common/files';

import {
  constructFileKindIdByOwner,
  constructFilesHttpOperationPrivilege,
} from '../../common/files';

const buildFileKind = (owner: Owner, isFipsMode = false): FileKind => {
  const hashes: FileKind['hashes'] = ['sha1', 'sha256'];
  if (!isFipsMode) {
    hashes.unshift('md5');
  }
  return {
    id: constructFileKindIdByOwner(owner),
    http: fileKindHttpTags(owner),
    maxSizeBytes: MAX_IMAGE_FILE_SIZE,
    allowedMimeTypes: imageMimeTypes,
    hashes,
  };
};

const fileKindHttpTags = (owner: Owner): FileKind['http'] => {
  return {
    create: buildPrivileges(owner, HttpApiPrivilegeOperation.Create),
    download: buildPrivileges(owner, HttpApiPrivilegeOperation.Read),
    getById: buildPrivileges(owner, HttpApiPrivilegeOperation.Read),
    list: buildPrivileges(owner, HttpApiPrivilegeOperation.Read),
  };
};

const buildPrivileges = (owner: Owner, operation: HttpApiPrivilegeOperation) => {
  return {
    requiredPrivileges: [constructFilesHttpOperationPrivilege(owner, operation)],
  };
};

// export const createMaxCallback =
//   (config: FilesConfig) =>
//     (file: FileJSON): number => {
//       // if the user set a max size, always return that
//       if (config.maxSize != null) {
//         return config.maxSize;
//       }

//       const allowedMimeTypesSet = new Set(config.allowedMimeTypes);

//       // if we have the mime type for the file and it exists within the allowed types and it is an image then return the
//       // image size
//       if (
//         file.mimeType != null &&
//         allowedMimeTypesSet.has(file.mimeType) &&
//         DefaultFileKind.kind.allowedMimeTypes?.includes(file.mimeType)
//       ) {
//         return MAX_IMAGE_FILE_SIZE;
//       }

//       return MAX_FILE_SIZE;
//     };

/**
 * The file kind definition for interacting with the file service for the backend
 */
const createFileKinds = (isFipsMode = false): Record<Owner, FileKind> => {
  return {
    [INVESTIGATE_APP_ID]: buildFileKind(INVESTIGATE_APP_ID, isFipsMode),
    [OBSERVABILITY_OWNER]: buildFileKind(OBSERVABILITY_OWNER, isFipsMode),
    [SECURITY_SOLUTION_OWNER]: buildFileKind(SECURITY_SOLUTION_OWNER, isFipsMode),
  };
};

export const registerInvestigateFileKinds = (filesSetupPlugin: FilesSetup, isFipsMode = false) => {
  // console.log('Called registerInvestigateFileKinds');
  const fileKinds = createFileKinds(isFipsMode);
  // console.log(fileKinds);
  for (const fileKind of Object.values(fileKinds)) {
    console.log('registerInvestigateFileKinds-Backend', fileKind);
    filesSetupPlugin.registerFileKind(fileKind);
  }
};
