/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { DigitalExperienceRoutes } from '../routes';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useUpdateUrlQuery } from './use_update_url_query';

/**
 * Filters kept in the URL, each with the route that declares it: the list's, and the mobile page's
 * OS and release. The time range has its own hook, `useTimeRange`.
 */
const QUERY_PARAM_ROUTES = {
  environment: '/',
  sourceFilter: '/',
  platformFilter: '/',
  applicationType: '/',
  osName: '/{serviceName}',
  release: '/{serviceName}',
} as const;

type QueryParam = keyof typeof QUERY_PARAM_ROUTES;

type ListQuery = TypeOf<DigitalExperienceRoutes, '/'>['query'];
type ApplicationQuery = TypeOf<DigitalExperienceRoutes, '/{serviceName}'>['query'];

/** Their values as the routes validate them, e.g. an application source for `sourceFilter`. */
type QueryParams = Pick<
  ListQuery,
  'environment' | 'sourceFilter' | 'platformFilter' | 'applicationType'
> &
  Pick<ApplicationQuery, 'osName' | 'release'>;

export interface QueryParamState<TValue> {
  /** The param's value, `undefined` when unset. */
  value: TValue | undefined;
  /** Sets the param, or removes it for `undefined`; the other params, e.g. the time range, stay. */
  setValue: (value: TValue | undefined) => void;
}

/** One filter in the URL: its value and a setter that changes only that param. */
export const useQueryParam = <TKey extends QueryParam>(
  key: TKey
): QueryParamState<QueryParams[TKey]> => {
  const query: Partial<QueryParams> = useDigitalExperienceParams(QUERY_PARAM_ROUTES[key]).query;
  const updateUrlQuery = useUpdateUrlQuery();

  const setValue = useCallback(
    (value: QueryParams[TKey] | undefined) => updateUrlQuery({ [key]: value }),
    [updateUrlQuery, key]
  );

  // An empty param, e.g. `?environment=`, counts as unset.
  return { value: query[key] || undefined, setValue };
};
