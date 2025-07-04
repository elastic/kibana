/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';

import { NotebookCatalogResponse } from '../../common/types';
import { useKibanaServices } from './use_kibana';
import { useNotebookList } from './use_notebooks_list';

export const useNotebooksCatalog = () => {
  const { http } = useKibanaServices();
  const list = useNotebookList();
  return useQuery({
    queryKey: [`fetchNotebooksCatalog-${list ?? 'default'}`],
    queryFn: () =>
      http.get<NotebookCatalogResponse>('/internal/search_notebooks/notebooks', {
        query: {
          list,
        },
      }),
  });
};
