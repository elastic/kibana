/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ProfilingUsername {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  editorUser = 'editor',
}

export const PROFILING_TEST_PASSWORD = 'changeme';

export const profilingUsers: Record<ProfilingUsername, { builtInRoleNames?: string[] }> = {
  [ProfilingUsername.noAccessUser]: {},
  [ProfilingUsername.viewerUser]: {
    builtInRoleNames: ['viewer'],
  },
  [ProfilingUsername.editorUser]: {
    builtInRoleNames: ['editor'],
  },
};
