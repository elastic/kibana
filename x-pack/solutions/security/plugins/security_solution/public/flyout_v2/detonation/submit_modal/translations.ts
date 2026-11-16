/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const t = (key: string, defaultMessage: string) =>
  i18n.translate(`xpack.securitySolution.flyoutV2.detonation.submitModal.${key}`, {
    defaultMessage,
  });

export const MODAL_TITLE = t('title', 'Submit for detonation');
export const MODAL_DESCRIPTION = t(
  'description',
  'Run the sample in an isolated sandbox and get a behavior report with a verdict. This runs on Elastic Defend as part of the Complete Detection suite.'
);
export const FILE_NAME = t('fileName', 'File name');
export const SHA_256 = t('sha256', 'SHA-256');
export const HOST = t('host', 'Host');
export const ATTACH_TO_CASE = t('attachToCase', 'Attach the report to a case');
export const SUBMIT_DISCLAIMER = t(
  'disclaimer',
  'Samples run in an isolated environment. Network traffic is captured and files are deleted after 30 days.'
);
export const CANCEL = t('cancel', 'Cancel');
export const DETONATE = t('detonate', 'Detonate');
export const ALREADY_DETONATED_TITLE = t(
  'alreadyDetonatedTitle',
  'This file has already been detonated'
);
export const ALREADY_DETONATED_TEXT = t(
  'alreadyDetonatedText',
  'There is an existing malware analysis for this file.'
);
export const SEE_ANALYSIS = t('seeAnalysis', 'See analysis');
export const SAMPLE_SOURCE = t('sampleSource', 'Sample');
export const SOURCE_UPLOAD = t('sourceUpload', 'Upload a file');
export const SOURCE_URL = t('sourceUrl', 'URL');
export const UPLOAD_PROMPT = t('uploadPrompt', 'Select or drag and drop a file');
export const URL_LABEL = t('urlLabel', 'Sample URL');
export const URL_PLACEHOLDER = t('urlPlaceholder', 'https://example.com/sample.exe');
