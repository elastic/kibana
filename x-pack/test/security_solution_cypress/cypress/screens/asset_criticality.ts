/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

export const PAGE_TITLE = getDataTestSubjectSelector('assetCriticalityUploadPage');
export const FILE_PICKER = getDataTestSubjectSelector('asset-criticality-file-picker');
export const ASSIGN_BUTTON = getDataTestSubjectSelector('asset-criticality-assign-button');
export const RESULT_STEP = getDataTestSubjectSelector('asset-criticality-result-step-success');
export const VALID_LINES_MESSAGE = getDataTestSubjectSelector(
  'asset-criticality-validLinesMessage'
);
export const INVALID_LINES_MESSAGE = getDataTestSubjectSelector(
  'asset-criticality-invalidLinesMessage'
);
