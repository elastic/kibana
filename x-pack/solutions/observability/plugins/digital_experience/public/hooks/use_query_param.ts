/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { omit } from 'lodash';
import qs from 'query-string';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { DigitalExperienceRoutes } from '../routes';
import { useDigitalExperienceParams } from './use_digital_experience_params';

/** List filters kept in the URL; the time range has its own hook, `useTimeRange`. */
type QueryParam = 'environment' | 'sourceFilter';

/** Their values as the route validates them, e.g. an application source for `sourceFilter`. */
type ListQueryParams = TypeOf<DigitalExperienceRoutes, '/'>['query'];

export interface QueryParamState<TValue> {
  /** The param's value, `undefined` when unset. */
  value: TValue | undefined;
  /** Sets the param, or removes it for `undefined`; the other params, e.g. the time range, stay. */
  setValue: (value: TValue | undefined) => void;
}

/** One list filter in the URL: its value and a setter that changes only that param. */
export const useQueryParam = <TKey extends QueryParam>(
  key: TKey
): QueryParamState<ListQueryParams[TKey]> => {
  const { query } = useDigitalExperienceParams('/');
  const history = useHistory();
  const location = useLocation();

  const setValue = useCallback(
    (value: ListQueryParams[TKey] | undefined) => {
      const rest = omit(qs.parse(location.search), key);
      // Sorted like the typed router's links, so a breadcrumb to this page matches the URL exactly.
      const search = qs.stringify(value ? { ...rest, [key]: value } : rest);
      history.push({ ...location, search });
    },
    [history, location, key]
  );

  // An empty param, e.g. `?environment=`, counts as unset.
  return { value: query[key] || undefined, setValue };
};
