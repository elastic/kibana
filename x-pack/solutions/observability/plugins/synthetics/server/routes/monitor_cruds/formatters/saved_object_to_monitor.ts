/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { mergeWith, omit, omitBy } from 'lodash';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorFields,
  MonitorFieldsResult,
} from '../../../../common/runtime_types';

const keysToOmit = [
  ConfigKey.URLS,
  ConfigKey.SOURCE_INLINE,
  ConfigKey.HOSTS,
  ConfigKey.CONFIG_HASH,
  ConfigKey.JOURNEY_ID,
  ConfigKey.FORM_MONITOR_TYPE,
];

type Result = MonitorFieldsResult & {
  url?: string;
  host?: string;
  inline_script?: string;
  ssl: Record<string, any>;
  response: Record<string, any>;
  check: Record<string, any>;
};

export const transformPublicKeys = (result: Result) => {
  if (result[ConfigKey.SOURCE_INLINE]) {
    result.inline_script = result[ConfigKey.SOURCE_INLINE];
  }
  if (result[ConfigKey.HOSTS]) {
    result.host = result[ConfigKey.HOSTS];
  }
  if (result[ConfigKey.PARAMS]) {
    try {
      result[ConfigKey.PARAMS] = JSON.parse(result[ConfigKey.PARAMS] ?? '{}');
    } catch (e) {
      // ignore
    }
  }

  let formattedResult = {
    ...result,
    [ConfigKey.PARAMS]: formatParams(result),
    retest_on_failure: (result[ConfigKey.MAX_ATTEMPTS] ?? 1) > 1,
    ...(result[ConfigKey.HOSTS] && { host: result[ConfigKey.HOSTS] }),
    ...(result[ConfigKey.URLS] && { url: result[ConfigKey.URLS] }),
  };
  if (formattedResult[ConfigKey.MONITOR_TYPE] === 'browser') {
    formattedResult = {
      ...formattedResult,
      ...(result[ConfigKey.SOURCE_INLINE] && { inline_script: result[ConfigKey.SOURCE_INLINE] }),
      [ConfigKey.PLAYWRIGHT_OPTIONS]: formatPWOptions(result),
    };
  }
  return omit(formattedResult, keysToOmit) as Result;
};

export function mapSavedObjectToMonitor({
  monitor,
  internal = false,
}: {
  monitor: SavedObject<MonitorFields | EncryptedSyntheticsMonitor>;
  internal?: boolean;
}) {
  let result = {
    ...monitor.attributes,
    created_at: monitor.created_at,
    updated_at: monitor.updated_at,
  } as Result;
  if (internal) {
    return result;
  }
  result = transformPublicKeys(result);
  // omit undefined value or null value
  return omitBy(result, removeMonitorEmptyValues);
}
export function mergeSourceMonitor(
  normalizedPreviousMonitor: EncryptedSyntheticsMonitor,
  monitor: EncryptedSyntheticsMonitor
) {
  return mergeWith({ ...normalizedPreviousMonitor }, monitor, customizer);
}

// Ensure that METADATA is merged deeply, to protect AAD and prevent decryption errors
const customizer = (destVal: any, srcValue: any, key: string) => {
  if (key === ConfigKey.ALERT_CONFIG) {
    return { ...destVal, ...srcValue };
  }
  if (key !== ConfigKey.METADATA) {
    return srcValue;
  }
};

const formatParams = (config: MonitorFields) => {
  if (config[ConfigKey.PARAMS]) {
    try {
      return (config[ConfigKey.PARAMS] = JSON.parse(config[ConfigKey.PARAMS] ?? '{}'));
    } catch (e) {
      // ignore
      return {};
    }
  }
  return {};
};

const formatPWOptions = (config: MonitorFields) => {
  if (config[ConfigKey.PLAYWRIGHT_OPTIONS]) {
    try {
      return (config[ConfigKey.PLAYWRIGHT_OPTIONS] = JSON.parse(
        config[ConfigKey.PLAYWRIGHT_OPTIONS] ?? '{}'
      ));
    } catch (e) {
      // ignore
      return {};
    }
  }
  return {};
};

// combine same nested fields into same object
const formatNestedFields = (
  config: MonitorFields | Record<string, any>,
  nestedKey: 'ssl' | 'response' | 'check' | 'request'
): Record<string, any> => {
  const nestedFields = Object.keys(config).filter((key) =>
    key.startsWith(`${nestedKey}.`)
  ) as ConfigKey[];
  const obj: Record<string, any> = {};

  nestedFields.forEach((key) => {
    const newKey = key.replace(`${nestedKey}.`, '');
    obj[newKey] = config[key];
    delete config[key];
  });

  if (nestedKey === 'check') {
    return {
      request: formatNestedFields(obj, 'request'),
      response: formatNestedFields(obj, 'response'),
    };
  }

  return obj;
};

export const removeMonitorEmptyValues = (v: any) => {
  // value is falsy
  return (
    v === undefined ||
    v === null ||
    // value is empty string
    (typeof v === 'string' && v.trim() === '') ||
    // is empty array
    (Array.isArray(v) && v.length === 0) ||
    // object is has no values
    (typeof v === 'object' && Object.keys(v).length === 0)
  );
};
