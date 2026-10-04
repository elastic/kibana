/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { AlertZeroStartDependencies } from './types';

/**
 * Combines core and plugin start services, keeping core's service-account API
 * when the security plugin start contract replaces `security`.
 */
export const mergeKibanaServices = (
  core: CoreStart,
  startDeps: AlertZeroStartDependencies
): CoreStart & AlertZeroStartDependencies => {
  const { security: pluginSecurity, ...restDeps } = startDeps;

  return {
    ...core,
    ...restDeps,
    security: {
      ...core.security,
      ...pluginSecurity,
    },
  } as CoreStart & AlertZeroStartDependencies;
};
