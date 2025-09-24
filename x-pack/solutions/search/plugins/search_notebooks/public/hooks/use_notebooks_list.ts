/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import queryString from 'query-string';
import { useKibanaServices } from './use_kibana';

export const readNotebookListFromParam = () => {
  const [, query] = (window.location.search || window.location.hash || '').split('?');

  const queryParams = queryString.parse(query || '', { sort: false });
  if (queryParams && queryParams.nblist && typeof queryParams.nblist === 'string') {
    return queryParams.nblist;
  }
  return undefined;
};

export const useNotebookList = () => {
  const {
    notebooks: { getNotebookList },
  } = useKibanaServices();
  const nbList = useMemo(() => getNotebookList(), [getNotebookList]);
  const nbListQueryParam = useMemo(() => readNotebookListFromParam(), []);

  if (nbListQueryParam) return nbListQueryParam;
  if (nbList) return nbList;
  return undefined;
};
