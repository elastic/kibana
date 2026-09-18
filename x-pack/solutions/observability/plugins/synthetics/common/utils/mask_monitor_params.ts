/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MASKED_PARAM_VALUE = '********';

type ParameterValue =
  | string
  | number
  | boolean
  | null
  | ParameterValue[]
  | { readonly [key: string]: ParameterValue };

interface MonitorParams {
  readonly [key: string]: ParameterValue;
}

const isMonitorParams = (value: ParameterValue): value is MonitorParams =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parseMonitorParams = (params: string): MonitorParams | undefined => {
  try {
    const parsedParams = JSON.parse(params) as ParameterValue;
    return isMonitorParams(parsedParams) ? parsedParams : undefined;
  } catch {
    return undefined;
  }
};

/** Masks every monitor parameter value while retaining the parameter names. */
export const maskMonitorParams = (params?: string): string | undefined => {
  if (!params) {
    return params;
  }

  const parsedParams = parseMonitorParams(params);
  if (!parsedParams) {
    return MASKED_PARAM_VALUE;
  }

  return JSON.stringify(
    Object.fromEntries(Object.keys(parsedParams).map((key) => [key, MASKED_PARAM_VALUE]))
  );
};

/** Restores previously stored values for parameter placeholders returned by a masked edit form. */
export const restoreMaskedMonitorParams = ({
  previousParams,
  submittedParams,
}: {
  previousParams?: string;
  submittedParams?: string;
}): string | undefined => {
  if (!submittedParams) {
    return submittedParams;
  }

  if (submittedParams === MASKED_PARAM_VALUE) {
    return previousParams;
  }

  const parsedSubmittedParams = parseMonitorParams(submittedParams);
  if (!parsedSubmittedParams) {
    return submittedParams;
  }

  const parsedPreviousParams = previousParams ? parseMonitorParams(previousParams) : undefined;

  return JSON.stringify(
    Object.fromEntries(
      Object.entries(parsedSubmittedParams).map(([key, value]) => {
        const previousValue = parsedPreviousParams?.[key];
        return [
          key,
          value === MASKED_PARAM_VALUE && previousValue !== undefined ? previousValue : value,
        ];
      })
    )
  );
};
