/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RowValidationErrors } from './validations';

export interface ValidatedFile {
  name: string;
  size: number;
  validLines: {
    text: string;
    count: number;
  };
  invalidLines: {
    text: string;
    count: number;
    errors: RowValidationErrors[];
  };
}

export interface OnCompleteParams {
  processingStartTime: string;
  processingEndTime: string;
  tookMs: number;
  validatedFile: ValidatedFile;
}

export enum FileUploaderSteps {
  FILE_PICKER = 1,
  VALIDATION = 2,
  RESULT = 3,
}
