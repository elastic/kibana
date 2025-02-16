/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup } from '@kbn/files-plugin/public';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import { MAX_IMAGE_FILE_SIZE } from '../../common/files/constant';
import { Owner, constructFileKindIdByOwner, OWNERS } from '../../common/files';
import { InvestigateFileKinds } from './types';
import { imageMimeTypes } from './constant';

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

export const registerInvestigateFileKinds = (filesSetupPlugin: FilesSetup) => {
  const fileKinds = createFileKinds();

  for (const fileKind of fileKinds.values()) {
    filesSetupPlugin.registerFileKind(fileKind);
  }
};
