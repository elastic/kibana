/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PathsOf } from '@kbn/typed-react-router-config';
import type { ProfilingRoutes } from '.';

/**
 * Pathnames compared against the raw `location.pathname`, where the typed router can't be used to
 * match the current route.
 */
export const PROFILING_PATHNAMES = {
  addDataInstructions: '/add-data-instructions',
  profilingNotEnabled: '/profiling-not-enabled',
  settings: '/settings',
  storageExplorer: '/storage-explorer',
} as const satisfies Record<string, PathsOf<ProfilingRoutes>>;
