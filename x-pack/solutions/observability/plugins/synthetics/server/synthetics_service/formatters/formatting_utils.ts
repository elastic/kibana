/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEmpty } from 'lodash';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { ConfigKey, type MonitorFields } from '../../../common/runtime_types';
import type { ParsedVars } from './lightweight_param_formatter';
import { replaceVarsWithParams } from './lightweight_param_formatter';
import variableParser from './variable_parser';
import { hasNoParams } from './param_utils';
import { PARAMS_KEYS_TO_SKIP } from './common';

export {
  hasNoParams,
  extractParamReferences,
  valueContainsParams,
  monitorUsesGlobalParams,
} from './param_utils';

export type FormatterFn<T = number> = (
  fields: Partial<MonitorFields>,
  key: ConfigKey
) => string | T | null;

const replaceSingleStringWithParams = (
  value: string,
  params: Record<string, string>,
  logger?: Logger
): string => {
  if (!value || hasNoParams(value)) {
    return value;
  }
  try {
    const parsedVars: ParsedVars = variableParser.parse(value);
    return allParamsAreMissing(parsedVars, params)
      ? value
      : replaceVarsWithParams(parsedVars, params);
  } catch (e) {
    logger?.error(`error parsing vars for value ${JSON.stringify(value)}, ${e}`);
    return value;
  }
};

export const replaceStringWithParams = (
  value: string | boolean | {} | [],
  params: Record<string, string>,
  logger?: Logger
): string | null => {
  if (!value || typeof value === 'boolean' || typeof value === 'number' || isEmpty(params)) {
    return value as string | null;
  }
  if (typeof value === 'string') {
    return replaceSingleStringWithParams(value, params, logger);
  }
  if (Array.isArray(value)) {
    return value.map((item: string | boolean | {} | []) =>
      replaceStringWithParams(item, params, logger)
    ) as unknown as string | null;
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        replaceSingleStringWithParams(k, params, logger),
        replaceStringWithParams(v as string | boolean | {} | [], params, logger),
      ])
    ) as unknown as string | null;
  }
  return value as string | null;
};

/**
 * Resolve `${params}` on each Kerberos/NTLM string field individually so
 * values with quotes/newlines stay valid when the object is later serialized.
 * Shared by public Heartbeat and private Fleet formatters; those keys are in
 * PARAMS_KEYS_TO_SKIP so the whole-object JSON-stringify path is not used.
 */
export const resolveHttpAuthParams = <T extends Partial<MonitorFields>>(
  config: T,
  params: Record<string, string>,
  logger?: Logger
): T => {
  const next = { ...config };

  const resolveAuthObject = <A extends Record<string, unknown>>(auth: A): A => {
    const resolved = { ...auth };
    for (const [field, fieldValue] of Object.entries(auth)) {
      if (typeof fieldValue === 'string') {
        (resolved as Record<string, unknown>)[field] = replaceStringWithParams(
          fieldValue,
          params,
          logger
        );
      }
    }
    return resolved;
  };

  const kerberos = next[ConfigKey.KERBEROS];
  if (kerberos?.enabled) {
    next[ConfigKey.KERBEROS] = resolveAuthObject(kerberos);
  }
  const ntlm = next[ConfigKey.NTLM];
  if (ntlm?.enabled) {
    next[ConfigKey.NTLM] = resolveAuthObject(ntlm);
  }
  return next;
};

const resolvePlaywrightOptions = (
  raw: string,
  params: Record<string, string>,
  logger?: Logger
): string => {
  if (!raw.trim() || hasNoParams(raw)) {
    return raw;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return JSON.stringify(replaceStringWithParams(parsed, params, logger));
    }
  } catch {
    // Fall through to post-substitution JSON normalization.
  }
  const replaced = replaceSingleStringWithParams(raw, params, logger);
  try {
    return JSON.stringify(JSON.parse(replaced));
  } catch {
    return JSON.stringify(replaced);
  }
};

/**
 * Resolves `${params}` on raw monitor fields before private-location YAML/JSON
 * formatters run, so parameter values cannot break out of serialized scalars.
 */
export const resolveMonitorConfigParams = <T extends Partial<MonitorFields>>(
  config: T,
  params: Record<string, string>,
  logger?: Logger
): T => {
  const next = resolveHttpAuthParams(config, params, logger);
  if (isEmpty(params)) {
    return next;
  }

  for (const [key, fieldValue] of Object.entries(next)) {
    if (PARAMS_KEYS_TO_SKIP.includes(key as ConfigKey) || fieldValue == null) {
      continue;
    }
    (next as Record<string, unknown>)[key] =
      key === ConfigKey.PLAYWRIGHT_OPTIONS && typeof fieldValue === 'string'
        ? resolvePlaywrightOptions(fieldValue, params, logger)
        : replaceStringWithParams(fieldValue as string | boolean | {} | [], params, logger);
  }

  return next;
};

const allParamsAreMissing = (parsedVars: ParsedVars, params: Record<string, string>) => {
  const hasDefault = parsedVars.some(
    (parsedVar) => parsedVar.type === 'var' && parsedVar.content.default
  );
  if (hasDefault) {
    return false;
  }
  const varKeys = parsedVars
    .filter((parsedVar) => parsedVar.type === 'var')
    .map((v) => (typeof v.content === 'string' ? v.content : v.content.name));
  return varKeys.every((v) => !params[v]);
};

export const secondsToCronFormatter: FormatterFn<string> = (fields, key) => {
  const value = (fields[key] as string) ?? '';

  return value ? `${value}s` : null;
};

export const maxAttemptsFormatter: FormatterFn = (fields, key) => {
  return (fields[key] as number) ?? 2;
};

enum Frequency {
  YEARLY,
  MONTHLY,
  WEEKLY,
  DAILY,
  HOURLY,
  MINUTELY,
  SECONDLY,
}

function frequencyToString(value?: number): string | undefined {
  if (value === undefined || value === null) {
    return;
  }
  const name = Frequency[value];
  return name ? name.toLowerCase() : 'unknown';
}

// A one-off window created through the public API is stored without a freq, and Heartbeat cannot
// unpack a window without one. Send it as a single yearly occurrence, the shape the UI stores.
const ONE_OFF_RULE_DEFAULTS = { freq: 'yearly', count: 1 } as const;

export const formatMWs = (mws?: MaintenanceWindow[], strRes = true) => {
  if (!mws) {
    return;
  }
  const formatted = mws.map((mw) => {
    const mwRule = mw?.rRule;
    if (mw && mwRule) {
      const freq = frequencyToString(mwRule.freq);
      return {
        ...mwRule,
        ...(freq === undefined ? ONE_OFF_RULE_DEFAULTS : { freq }),
        duration: `${mw.duration}ms`,
      };
    }
  });
  if (!strRes) {
    return formatted;
  }
  return JSON.stringify(formatted);
};

function escapeTemplateLiterals(script: string): string {
  return script.replace(/\$\{/g, '$$${');
}

export const inlineSourceFormatter: FormatterFn = (fields, key) => {
  const value = fields[key] as string;
  if (!value?.trim()) return value;

  // Escape template literals to prevent unintended interpolation
  return escapeTemplateLiterals(value).trim();
};

export const handleMultilineStringFormatter = (value: string) => {
  return value.replace(/(\n+)/g, '$1\n');
};
