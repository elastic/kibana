/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_THROTTLING_VALUE } from '../../../../common/constants/monitor_defaults';
import { Formatter, commonFormatters } from './common_formatters';
import {
  arrayToJsonFormatter,
  objectToJsonFormatter,
  stringToJsonFormatter,
} from './formatting_utils';

import { tlsFormatters } from './tls_formatters';
import { BrowserFields, ConfigKey } from '../../../../common/runtime_types';

export type BrowserFormatMap = Record<keyof BrowserFields, Formatter>;

export const throttlingFormatter: Formatter = (fields) => {
  const throttling = fields[ConfigKey.THROTTLING_CONFIG];

  if (!throttling || throttling?.id === 'no-throttling' || !throttling?.value) {
    return 'false';
  }

  return JSON.stringify({
    download: Number(throttling?.value?.download || DEFAULT_THROTTLING_VALUE.download),
    upload: Number(throttling?.value?.upload || DEFAULT_THROTTLING_VALUE.upload),
    latency: Number(throttling?.value?.latency || DEFAULT_THROTTLING_VALUE),
  });
};

export const browserFormatters: BrowserFormatMap = {
  [ConfigKey.SOURCE_PROJECT_CONTENT]: null,
  [ConfigKey.SCREENSHOTS]: null,
  [ConfigKey.IGNORE_HTTPS_ERRORS]: null,
  [ConfigKey.PLAYWRIGHT_OPTIONS]: null,
  [ConfigKey.TEXT_ASSERTION]: stringToJsonFormatter,
  [ConfigKey.PORT]: stringToJsonFormatter,
  [ConfigKey.URLS]: stringToJsonFormatter,
  [ConfigKey.METADATA]: objectToJsonFormatter,
  [ConfigKey.SOURCE_INLINE]: stringToJsonFormatter,
  [ConfigKey.SYNTHETICS_ARGS]: arrayToJsonFormatter,
  [ConfigKey.JOURNEY_FILTERS_MATCH]: stringToJsonFormatter,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: arrayToJsonFormatter,
  [ConfigKey.THROTTLING_CONFIG]: throttlingFormatter,
  ...commonFormatters,
  ...tlsFormatters,
};
