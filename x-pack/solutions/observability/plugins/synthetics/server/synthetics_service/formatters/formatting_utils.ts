/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEmpty } from 'lodash';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import {
  type ConfigKey,
  type MonitorFields,
  type SyntheticsMonitor,
  MonitorTypeEnum,
} from '../../../common/runtime_types';
import type { ParsedVars } from './lightweight_param_formatter';
import { replaceVarsWithParams } from './lightweight_param_formatter';
import variableParser from './variable_parser';
import { PARAMS_KEYS_TO_SKIP } from './common';

export type FormatterFn = (
  fields: Partial<MonitorFields>,
  key: ConfigKey
) => string | number | null;

export const replaceStringWithParams = (
  value: string | boolean | {} | [],
  params: Record<string, string>,
  logger?: Logger
) => {
  if (!value || typeof value === 'boolean' || isEmpty(params)) {
    return value as string | null;
  }

  try {
    if (typeof value !== 'string') {
      const strValue = JSON.stringify(value);
      if (hasNoParams(strValue)) {
        return value as string | null;
      }

      const parsedVars: ParsedVars = variableParser.parse(strValue);

      const parseValue = replaceVarsWithParams(parsedVars, params);
      return JSON.parse(parseValue);
    }
    if (hasNoParams(value)) {
      return value as string | null;
    }

    const parsedVars: ParsedVars = variableParser.parse(value);

    if (allParamsAreMissing(parsedVars, params)) {
      return value as string | null;
    }

    return replaceVarsWithParams(parsedVars, params);
  } catch (e) {
    logger?.error(`error parsing vars for value ${JSON.stringify(value)}, ${e}`);
  }

  return value as string | null;
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

const SHELL_PARAMS_REGEX = /\$\{[a-zA-Z_][a-zA-Z0-9\._\-?:]*\}/g;

export const hasNoParams = (strVal: string) => {
  return strVal.match(SHELL_PARAMS_REGEX) === null;
};

/**
 * Extracts all parameter names referenced in a string using ${paramName} syntax.
 * Handles optional default values (${paramName:default}) and nested syntax.
 *
 * @param strVal - The string to extract parameter references from
 * @returns Array of unique parameter names found in the string
 */
export const extractParamReferences = (strVal: string): string[] => {
  const matches = strVal.match(SHELL_PARAMS_REGEX);
  if (!matches) {
    return [];
  }

  const paramNames = new Set<string>();
  for (const match of matches) {
    // Remove ${ and } and extract just the param name (before any : for defaults)
    const content = match.slice(2, -1);
    // Handle ${paramName:default} syntax - extract just the param name
    const paramName = content.split(':')[0].split('?')[0];
    if (paramName) {
      paramNames.add(paramName);
    }
  }

  return Array.from(paramNames);
};

/**
 * Checks if a value (string, object, or array) contains any global parameter references.
 *
 * @param value - The value to check for parameter references
 * @returns true if the value contains at least one parameter reference
 */
export const valueContainsParams = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return !hasNoParams(value);
  }

  if (typeof value === 'object') {
    const strValue = JSON.stringify(value);
    return !hasNoParams(strValue);
  }

  return false;
};

/**
 * Checks if a monitor configuration uses global parameters.
 *
 * For lightweight monitors (HTTP, TCP, ICMP): checks for ${paramName} syntax in fields.
 * For browser monitors: always returns true since they access params via JavaScript
 * (params.paramName) which we cannot reliably detect by scanning the script content.
 *
 * @param monitor - The monitor configuration to check
 * @param modifiedParamKeys - Optional array of specific param keys to check for.
 *                            If provided, only checks if the monitor uses any of these specific params.
 *                            If not provided, checks if the monitor uses any global params.
 * @returns true if the monitor uses at least one global parameter reference
 */
export const monitorUsesGlobalParams = (
  monitor: SyntheticsMonitor,
  modifiedParamKeys?: string[]
): boolean => {
  // Browser monitors access params via JavaScript (params.paramName), not ${paramName} syntax.
  // We cannot reliably parse JavaScript to detect param usage, so we always include
  // browser monitors in global params sync to ensure they receive updated param values.
  if (monitor.type === MonitorTypeEnum.BROWSER) {
    return true;
  }

  // For lightweight monitors (HTTP, TCP, ICMP), check for ${paramName} syntax in fields
  const keysToCheck = Object.keys(monitor) as Array<keyof SyntheticsMonitor>;
  const referencedParams = new Set<string>();

  for (const key of keysToCheck) {
    // Skip fields that don't support parameter substitution
    if (PARAMS_KEYS_TO_SKIP.includes(key as ConfigKey)) {
      continue;
    }

    const value = monitor[key];
    if (value === null || value === undefined) {
      continue;
    }

    // Extract param references from the value
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    const params = extractParamReferences(strValue);
    params.forEach((p) => referencedParams.add(p));
  }

  // If no specific params to check, return true if any params are referenced
  if (!modifiedParamKeys || modifiedParamKeys.length === 0) {
    return referencedParams.size > 0;
  }

  // Check if any of the modified params are referenced by this monitor
  return modifiedParamKeys.some((key) => referencedParams.has(key));
};

export const secondsToCronFormatter: FormatterFn = (fields, key) => {
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

export const formatMWs = (mws?: MaintenanceWindow[], strRes = true) => {
  if (!mws) {
    return;
  }
  const formatted = mws.map((mw) => {
    const mwRule = mw?.rRule;
    if (mw && mwRule) {
      return {
        ...mwRule,
        freq: frequencyToString(mwRule.freq),
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
