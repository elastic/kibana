/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  watches: {
    all: ['pnd', 'watches'] as const,
    list: () => [...queryKeys.watches.all, 'list'] as const,
    detail: (watchId: string | undefined) => [...queryKeys.watches.all, 'detail', watchId] as const,
  },
  investigations: {
    all: ['pnd', 'investigations'] as const,
    list: () => [...queryKeys.investigations.all, 'list'] as const,
    detail: (id: string | undefined) => [...queryKeys.investigations.all, 'detail', id] as const,
    proposals: (id: string | undefined) =>
      [...queryKeys.investigations.all, 'proposals', id] as const,
  },
};
