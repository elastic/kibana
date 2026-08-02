/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THREAD_GROUP_FOLD_AFTER } from '../../types';

export interface FoldChildrenArgs<T> {
  readonly children: readonly T[];
  readonly expanded: boolean;
  readonly foldAfter?: number;
}

export interface FoldChildrenResult<T> {
  readonly hiddenCount: number;
  readonly visible: readonly T[];
}

/**
 * Thread-mode child fold: keep `foldAfter` children visible until the analyst
 * expands. Type sections do not fold — paging lives at group level (Q7).
 */
export const foldChildren = <T>({
  children,
  expanded,
  foldAfter = THREAD_GROUP_FOLD_AFTER,
}: FoldChildrenArgs<T>): FoldChildrenResult<T> => {
  const hiddenCount = Math.max(children.length - foldAfter, 0);

  if (expanded || hiddenCount === 0) {
    return { hiddenCount, visible: children };
  }

  return { hiddenCount, visible: children.slice(0, foldAfter) };
};
