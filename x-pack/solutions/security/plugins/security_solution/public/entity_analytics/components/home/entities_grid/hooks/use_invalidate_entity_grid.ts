/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { ENTITY_GRID_QUERY_KEY } from '../common';

/** Returns a stable handler that refetches the entity grid, for changes made outside of it. */
export const useInvalidateEntityGrid = (): (() => void) => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [ENTITY_GRID_QUERY_KEY] });
  }, [queryClient]);
};
