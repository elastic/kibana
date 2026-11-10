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

/** Params to set; `undefined` or an empty string removes the param. */
export type UrlQueryPatch = Readonly<Record<string, string | undefined>>;

export interface UpdateUrlQueryOptions {
  /** Replaces the history entry instead of adding one, so Back skips it. */
  replace?: boolean;
  /** Params to remove too, e.g. the page when what is listed changes. */
  remove?: readonly string[];
}

/**
 * Applies `patch` to a URL query. Sorted like the typed router's links, so a breadcrumb to the page
 * matches the URL exactly.
 */
export const patchUrlQuery = (
  search: string,
  patch: UrlQueryPatch,
  remove: readonly string[] = []
): string => {
  const next: Record<string, unknown> = omit(qs.parse(search), remove);
  for (const [key, value] of Object.entries(patch)) {
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
  }
  return qs.stringify(next);
};

/** Updates the URL's query; the path, hash, history state and other params stay. */
export const useUpdateUrlQuery = () => {
  const history = useHistory();
  const location = useLocation();

  return useCallback(
    (patch: UrlQueryPatch, { replace = false, remove }: UpdateUrlQueryOptions = {}) => {
      const nextLocation = { ...location, search: patchUrlQuery(location.search, patch, remove) };
      if (replace) {
        history.replace(nextLocation);
      } else {
        history.push(nextLocation);
      }
    },
    [history, location]
  );
};
