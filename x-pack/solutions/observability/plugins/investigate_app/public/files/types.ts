/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import { Owner } from '../../common/files';

export interface InvestigateUiConfigType {
  markdownPlugins: {
    lens: boolean;
  };
  files: {
    maxSize?: number;
    allowedMimeTypes: string[];
  };
  stack: {
    enabled: boolean;
  };
}
export type FilesConfig = InvestigateUiConfigType['files'];

export type InvestigateFileKinds = Map<Owner, FileKindBrowser>;
