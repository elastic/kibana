/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEmpty } from 'lodash';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { type ConfigKey, type MonitorFields } from '../../../common/runtime_types';
import type { ParsedVars } from './lightweight_param_formatter';
import { replaceVarsWithParams } from './lightweight_param_formatter';
import variableParser from './variable_parser';
import { hasNoParams } from './param_utils';

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
