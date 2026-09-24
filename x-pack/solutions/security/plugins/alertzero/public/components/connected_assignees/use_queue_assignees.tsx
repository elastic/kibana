/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useRef } from 'react';
import type { QueryKey } from '@kbn/react-query';
import { useQueryClient } from '@kbn/react-query';
import type { UseAssigneePickersOptions } from './use_assignee_pickers';
import { useAssigneePickers } from './use_assignee_pickers';

export type { UseAssigneePickersOptions };

export interface UseQueueAssigneesOptions<T> extends Omit<UseAssigneePickersOptions<T>, 'refresh'> {
  /**
   * Query key to invalidate (and await) after a successful mutation or an external signal
   * bump for a visible item.
   */
  queryKey: QueryKey;
}

/**
 * Assignee-picker logic for queue pages. Thin wrapper over `useAssigneePickers` that
 * converts a `queryKey` into a `refresh` function via `invalidateQueries`.
 *
 * Page call sites pass `queryKey` and get back a stable `renderAssignees(item)` render prop.
 */
export function useQueueAssignees<T>({
  queryKey,
  ...rest
}: UseQueueAssigneesOptions<T>): (item: T) => React.ReactNode {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeyRef.current }),
    [queryClient]
  );

  return useAssigneePickers({ ...rest, refresh });
}
