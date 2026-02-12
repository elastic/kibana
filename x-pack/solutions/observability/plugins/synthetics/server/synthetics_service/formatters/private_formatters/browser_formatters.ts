/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_THROTTLING_VALUE, HEARTBEAT_BROWSER_MONITOR_TIMEOUT_OVERHEAD_SECONDS } from '../../../../common/constants/monitor_defaults';
import type { Formatter } from './common_formatters';
import { commonFormatters } from './common_formatters';
import {
  arrayToJsonFormatter,
  objectToJsonFormatter,
  stringToJsonFormatter,
} from './formatting_utils';

import { tlsFormatters } from './tls_formatters';
import type { BrowserFields } from '../../../../common/runtime_types';
import { ConfigKey, MonitorTypeEnum } from '../../../../common/runtime_types';

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

export const timeoutFormatterPrivate: Formatter = (fields) => {
  const value = (fields[ConfigKey.TIMEOUT] as string) ?? '';
  if (!value) return null;

  // Heartbeat adds a 30s overhead to browser monitor timeouts internally,
  // so we subtract it to match the user's expected total timeout.
  // Clamp to 0 to guard against negative values if validation is bypassed.
  if (fields[ConfigKey.MONITOR_TYPE] === MonitorTypeEnum.BROWSER) {
    const timeoutSeconds = parseInt(value, 10);
    const adjustedTimeout = Math.max(
      0,
      timeoutSeconds - HEARTBEAT_BROWSER_MONITOR_TIMEOUT_OVERHEAD_SECONDS
    );
    return `${adjustedTimeout}s`;
  }

  return `${value}s`;
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
  [ConfigKey.TIMEOUT]: timeoutFormatterPrivate,
  ...tlsFormatters,
};
