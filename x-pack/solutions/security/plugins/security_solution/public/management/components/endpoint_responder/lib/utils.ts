/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ResponseActionParametersWithEntityId,
  ResponseActionParametersWithPid,
  ResponseActionParametersWithProcessName,
} from '../../../../../common/endpoint/types';

export const parsedKillOrSuspendParameter = (parameters: {
  pid?: string[];
  entityId?: string[];
  processName?: string[];
}):
  | ResponseActionParametersWithPid
  | ResponseActionParametersWithEntityId
  | ResponseActionParametersWithProcessName => {
  if (parameters.pid) {
    return { pid: Number(parameters.pid[0]) };
  }

  if (parameters.processName) {
    return {
      process_name: parameters.processName[0] ?? '',
    };
  }

  return {
    entity_id: parameters?.entityId?.[0] ?? '',
  };
};

const UNIT_TO_SECONDS = (value: number) => ({
  h: (): number => value * 60 * 60,
  m: (): number => value * 60,
  s: (): number => value,
});

const convertToSeconds = (value: number, unit: 'h' | 'm' | 's'): number =>
  UNIT_TO_SECONDS(value)[unit]();

const EXECUTE_TIMEOUT_REGEX = /^\d+(?=(h|m|s){1}$)/;
export const validateUnitOfTime = (value: string): boolean => EXECUTE_TIMEOUT_REGEX.test(value);

export const parsedExecuteTimeout = (timeout?: string): undefined | number => {
  const timeoutMatch = timeout?.trim().match(EXECUTE_TIMEOUT_REGEX);
  if (!timeoutMatch) {
    return;
  }

  return convertToSeconds(Number(timeoutMatch[0]), timeoutMatch[1] as 'h' | 'm' | 's');
};
