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

/**
 * Represents a negated value with a boolean flag
 */
interface NegatedValue {
  /**
   * The value to negate
   */
  value: string | number;
  /**
   * Whether the value should be negated
   */
  negate: boolean;
}

/**
 * Type alias for filter values
 */
type FilterValue = string | number | NegatedValue | string[];

/**
 * Type alias for navigation filters
 */
export type NavFilter = Record<string, FilterValue>;

// URL parameter keys
export const QUERY_PARAM_KEY = 'cspq';
export const FLYOUT_PARAM_KEY = 'flyout';

/**
 * Safely encodes a value using rison encoding
 * @param value - The value to encode
 * @returns The rison-encoded string or undefined if encoding fails
 */
const encodeRison = (value: unknown): string | undefined => {
  try {
    return encode(value);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to encode rison:', error);
    return undefined;
  }
};

/**
 * Safely decodes a rison-encoded string
 * @param risonString - The rison-encoded string to decode
 * @returns The decoded value or undefined if decoding fails
 */
const decodeRison = <T extends unknown>(risonString: string): T | undefined => {
  try {
    return decode(risonString) as T;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to decode rison:', error);
    return undefined;
  }
};

/**
 * Encodes query parameters using rison and returns a search string with 'cspq=' prefix
 * @param query - The query object to encode
 * @returns The encoded search string or undefined if encoding fails
 */
export const encodeQuery = (query: unknown): LocationDescriptorObject['search'] => {
  const risonQuery = encodeRison(query);
  if (!risonQuery) return;
  return `${QUERY_PARAM_KEY}=${risonQuery}`;
};

/**
 * Encodes flyout parameters using rison and returns a search string with 'flyout=' prefix
 * @param flyout - The flyout object to encode
 * @returns The encoded search string or undefined if encoding fails
 */
export const encodeFlyout = (flyout: unknown): LocationDescriptorObject['search'] => {
  const risonFlyout = encodeRison(flyout);
  if (!risonFlyout) return;
  return `${FLYOUT_PARAM_KEY}=${risonFlyout}`;
};

/**
 * Generic function to encode any parameter with rison using a custom parameter key
 * @param paramKey - The parameter key to use in the URL
 * @param value - The value to encode
 * @returns The encoded search string or undefined if encoding fails
 */
export const encodeRisonParam = (
  paramKey: string,
  value: unknown
): LocationDescriptorObject['search'] => {
  const risonValue = encodeRison(value);
  if (!risonValue) return;
  return `${paramKey}=${risonValue}`;
};

/**
 * Decodes query parameters from a search string
 * @param search - The search string to decode
 * @returns The decoded query object or undefined if decoding fails
 */
export const decodeQuery = <T extends unknown>(search?: string): Partial<T> | undefined => {
  const risonQuery = new URLSearchParams(search).get(QUERY_PARAM_KEY);
  if (!risonQuery) return;
  return decodeRison<T>(risonQuery);
};

/**
 * Decodes flyout parameters from a search string
 * @param search - The search string to decode
 * @returns The decoded flyout object or undefined if decoding fails
 */
export const decodeFlyout = <T extends unknown>(search?: string): Partial<T> | undefined => {
  const risonFlyout = new URLSearchParams(search).get(FLYOUT_PARAM_KEY);
  if (!risonFlyout) return;
  return decodeRison<T>(risonFlyout);
};

/**
 * Generic function to decode any rison parameter from a search string
 * @param search - The search string to decode
 * @param paramKey - The parameter key to decode
 * @returns The decoded value or undefined if decoding fails
 */
export const decodeRisonParam = <T extends unknown>(
  search: string,
  paramKey: string
): Partial<T> | undefined => {
  const risonValue = new URLSearchParams(search).get(paramKey);
  if (!risonValue) return;
  return decodeRison<T>(risonValue);
};

/**
 * Encodes multiple rison parameters into a single search string
 * @param params - The parameters to encode
 * @returns The encoded search string or undefined if encoding fails
 */
export const encodeMultipleRisonParams = (
  params: Record<string, unknown>
): LocationDescriptorObject['search'] => {
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

/**
 * Decodes multiple rison parameters from a search string
 * @param search - The search string to decode
 * @param paramKeys - The parameter keys to decode
 * @returns The decoded parameters or undefined if decoding fails
 */
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

/**
 * Encodes query URL parameters using rison
 * @param servicesStart - The data plugin start services
 * @param filters - The filters to encode
 * @param groupBy - The group by fields to encode
 * @returns The encoded query URL parameters or undefined if encoding fails
 */
export const encodeQueryUrl = (
  servicesStart: DataPublicPluginStart,
  filters: Filter[],
  groupBy?: string[]
): LocationDescriptorObject['search'] => {
  return encodeQuery({
    query: servicesStart.query.queryString.getDefaultQuery(),
    filters,
    ...(groupBy && { groupBy }),
  });
};

/**
 * Composes query filters from navigation filters
 * @param filterParams - The navigation filters to compose
 * @param dataViewId - The data view ID to use
 * @returns The composed query filters
 */
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

/**
 * Creates a filter from a key and value
 * @param key - The filter key
 * @param filterValue - The filter value
 * @param dataViewId - The data view ID to use
 * @returns The created filter
 */
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
