/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';

import { Notebook } from '../../common/types';
import { useKibanaServices } from './use_kibana';

export const useNotebook = (id: string) => {
  const { http } = useKibanaServices();
  return useQuery({
    queryKey: ['fetchSearchNotebook', id],
    queryFn: () => http.get<Notebook>(`/internal/search_notebooks/notebooks/${id}`),
  });
};
