/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode, decode } from '@kbn/rison';
import type { LocationDescriptorObject } from 'history';
import { Filter } from '@kbn/es-query';
import { SECURITY_DEFAULT_DATA_VIEW_ID } from '@kbn/cloud-security-posture-common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

interface NegatedValue {
  value: string | number;
  negate: boolean;
}

type FilterValue = string | number | NegatedValue | string[];

export type NavFilter = Record<string, FilterValue>;

const encodeRison = (v: unknown): string | undefined => {
  try {
    return encode(v);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};

const decodeRison = <T extends unknown>(query: string): T | undefined => {
  try {
    return decode(query) as T;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};

const QUERY_PARAM_KEY = 'cspq';
const FLYOUT_PARAM_KEY = 'flyout';

export const encodeQuery = (query: unknown): LocationDescriptorObject['search'] => {
  const risonQuery = encodeRison(query);
  if (!risonQuery) return;
  return `${QUERY_PARAM_KEY}=${risonQuery}`;
};

export const encodeFlyout = (flyout: unknown): LocationDescriptorObject['search'] => {
  const risonFlyout = encodeRison(flyout);
  if (!risonFlyout) return;
  return `${FLYOUT_PARAM_KEY}=${risonFlyout}`;
};

// Generic function to encode any parameter with rison
export const encodeRisonParam = (paramKey: string, value: unknown): LocationDescriptorObject['search'] => {
  const risonValue = encodeRison(value);
  if (!risonValue) return;
  return `${paramKey}=${risonValue}`;
};

export const decodeQuery = <T extends unknown>(search?: string): Partial<T> | undefined => {
  const risonQuery = new URLSearchParams(search).get(QUERY_PARAM_KEY);
  if (!risonQuery) return;
  return decodeRison<T>(risonQuery);
};

export const decodeFlyout = <T extends unknown>(search?: string): Partial<T> | undefined => {
  const risonFlyout = new URLSearchParams(search).get(FLYOUT_PARAM_KEY);
  if (!risonFlyout) return;
  return decodeRison<T>(risonFlyout);
};

// Generic function to decode any rison parameter
export const decodeRisonParam = <T extends unknown>(search: string, paramKey: string): Partial<T> | undefined => {
  const risonValue = new URLSearchParams(search).get(paramKey);
  if (!risonValue) return;
  return decodeRison<T>(risonValue);
};

// Function to encode multiple rison parameters into a single search string
export const encodeMultipleRisonParams = (params: Record<string, unknown>): LocationDescriptorObject['search'] => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    const risonValue = encodeRison(value);
    if (risonValue) {
      searchParams.set(key, risonValue);
    }
  });
  
  const searchString = searchParams.toString();
  return searchString ? searchString : undefined;
};

// Function to decode multiple rison parameters from a search string
export const decodeMultipleRisonParams = <T extends Record<string, unknown>>(
  search: string, 
  paramKeys: string[]
): Partial<T> => {
  const urlParams = new URLSearchParams(search);
  const result: Partial<T> = {};
  
  paramKeys.forEach((key) => {
    const risonValue = urlParams.get(key);
    if (risonValue) {
      const decoded = decodeRison(risonValue);
      if (decoded !== undefined) {
        (result as Record<string, unknown>)[key] = decoded;
      }
    }
  });
  
  return result;
};

export const encodeQueryUrl = (
  servicesStart: DataPublicPluginStart,
  filters: Filter[],
  groupBy?: string[]
): unknown => {
  return encodeQuery({
    query: servicesStart.query.queryString.getDefaultQuery(),
    filters,
    ...(groupBy && { groupBy }),
  });
};

// dataViewId is used to prevent FilterManager from falling back to the default in the sorcerer (logs-*)
export const composeQueryFilters = (
  filterParams: NavFilter = {},
  dataViewId = SECURITY_DEFAULT_DATA_VIEW_ID
): Filter[] => {
  return Object.entries(filterParams).flatMap(([key, filterValue]) => {
    if (Array.isArray(filterValue)) {
      return filterValue.map((value) => createFilter(key, value, dataViewId));
    }

    if (!filterValue) {
      return [];
    }

    return createFilter(key, filterValue, dataViewId);
  });
};

export const createFilter = (
  key: string,
  filterValue: Exclude<FilterValue, string[]>,
  dataViewId: string
): Filter => {
  let negate = false;
  let value = filterValue;
  if (typeof filterValue === 'object') {
    negate = filterValue.negate;
    value = filterValue.value;
  }
  // If the value is '*', we want to create an exists filter
  if (value === '*') {
    return {
      query: { exists: { field: key } },
      meta: { type: 'exists', index: dataViewId },
    };
  }
  return {
    meta: {
      alias: null,
      negate,
      disabled: false,
      type: 'phrase',
      key,
      index: dataViewId,
    },
    query: { match_phrase: { [key]: value } },
  };
};
