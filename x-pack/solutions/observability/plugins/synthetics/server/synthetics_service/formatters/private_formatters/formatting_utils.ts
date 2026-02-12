/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inlineSourceFormatter } from '../formatting_utils';
import type { MonitorFields } from '../../../../common/runtime_types';
import { ConfigKey, MonitorTypeEnum } from '../../../../common/runtime_types';
import { HEARTBEAT_BROWSER_MONITOR_TIMEOUT_OVERHEAD_SECONDS } from '../../../../common/constants/monitor_defaults';

export type FormatterFn = (fields: Partial<MonitorFields>, key: ConfigKey) => string | null;

export const arrayToJsonFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string[]) ?? [];
  return value.length ? JSON.stringify(value) : null;
};

export const objectToJsonFormatter: FormatterFn = (fields, fieldKey) => {
  const value = (fields[fieldKey] as Record<string, any>) ?? {};
  if (Object.keys(value).length === 0) return null;

  return JSON.stringify(value);
};

// only add tls settings if they are enabled by the user and isEnabled is true
export const tlsValueToYamlFormatter: FormatterFn = (fields, key) => {
  if (fields[ConfigKey.METADATA]?.is_tls_enabled) {
    const tlsValue = (fields[key] as string) ?? '';

    return tlsValue ? JSON.stringify(tlsValue) : null;
  } else {
    return null;
  }
};

export const tlsValueToStringFormatter: FormatterFn = (fields, key) => {
  if (fields[ConfigKey.METADATA]?.is_tls_enabled) {
    const tlsValue = (fields[key] as string) ?? '';

    return tlsValue || null;
  } else {
    return null;
  }
};

export const tlsArrayToYamlFormatter: FormatterFn = (fields, key) => {
  if (fields[ConfigKey.METADATA]?.is_tls_enabled) {
    const tlsValue = (fields[key] as string[]) ?? [];

    return tlsValue.length ? JSON.stringify(tlsValue) : null;
  } else {
    return null;
  }
};

export const stringToJsonFormatter: FormatterFn = (fields, key) => {
  if (key === ConfigKey.SOURCE_INLINE) {
    const value = inlineSourceFormatter(fields, key);

    return value ? JSON.stringify(value) : null;
  }
  const value = (fields[key] as string) ?? '';
  return value ? JSON.stringify(value) : null;
};

export const stringifyString = (value?: string) => {
  if (!value) return value;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return value;
  }
};

export const secondsToCronFormatter: FormatterFn = (fields, key) => {
  const value = (fields[key] as string) ?? '';

  return value ? `${value}s` : null;
};

export const privateTimeoutFormatter: FormatterFn = (fields) => {
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
    return secondsToCronFormatter({ [ConfigKey.TIMEOUT]: adjustedTimeout }, ConfigKey.TIMEOUT);
  }

  return secondsToCronFormatter(fields, ConfigKey.TIMEOUT);
};
