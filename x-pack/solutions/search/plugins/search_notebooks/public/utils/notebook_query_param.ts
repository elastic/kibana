/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'query-string';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

function getBaseUrl() {
  return `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
}

function parseQueryString() {
  const [hashRoute, queryString] = (window.location.hash || window.location.search || '').split(
    '?'
  );

  const parsedQueryString = qs.parse(queryString || '', { sort: false });
  return {
    hasHash: !!window.location.hash,
    hashRoute,
    queryString: parsedQueryString,
  };
}

export const setNotebookParameter = (value: string) => {
  const baseUrl = getBaseUrl();
  const { hasHash, hashRoute, queryString } = parseQueryString();
  const notebookId = compressToEncodedURIComponent(value);
  queryString.notebookId = notebookId;
  const params = `?${qs.stringify(queryString)}`;
  const newUrl = hasHash ? `${baseUrl}${hashRoute}${params}` : `${baseUrl}${params}`;

  window.history.pushState({ path: newUrl }, '', newUrl);
};
export const removeNotebookParameter = () => {
  const baseUrl = getBaseUrl();
  const { hasHash, hashRoute, queryString } = parseQueryString();
  if (queryString.notebookId) {
    delete queryString.notebookId;

    const params = Object.keys(queryString).length ? `?${qs.stringify(queryString)}` : '';
    const newUrl = hasHash ? `${baseUrl}${hashRoute}${params}` : `${baseUrl}${params}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }
};
export const readNotebookParameter = (): string | undefined => {
  const { queryString } = parseQueryString();
  if (queryString.notebookId && typeof queryString.notebookId === 'string') {
    try {
      const notebookId = decompressFromEncodedURIComponent(queryString.notebookId);
      if (notebookId.length > 0) return notebookId;
    } catch {
      return undefined;
    }
  }
  return undefined;
};
