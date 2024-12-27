/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { FieldResultSetting } from './types';

export const DEFAULT_SNIPPET_SIZE = 100;
export const SIZE_FIELD_MINIMUM = 20;
export const SIZE_FIELD_MAXIMUM = 1000;

export const RESULT_SETTINGS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.resultSettings.title',
  { defaultMessage: 'Result Settings' }
);

export const DEFAULT_FIELD_SETTINGS: FieldResultSetting = {
  raw: true,
  snippet: false,
  snippetFallback: false,
};

export const DISABLED_FIELD_SETTINGS: FieldResultSetting = {
  raw: false,
  snippet: false,
  snippetFallback: false,
};
