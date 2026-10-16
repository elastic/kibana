/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../plugin';
import type { ClassicRumDashboardProps } from './types';

/** The Classic RUM dashboard as a component that loads its code and the active space on first render. */
export const createLazyClassicRumDashboard = (deps: {
  core: CoreStart;
  setupDeps: ApmPluginSetupDeps;
  startDeps: ApmPluginStartDeps;
  isDev: boolean;
}): React.ComponentType<ClassicRumDashboardProps> => {
  const LazyDashboard = lazy(async () => {
    const [{ createClassicRumDashboard }, activeSpace] = await Promise.all([
      import('./classic_rum_dashboard'),
      deps.startDeps.spaces?.getActiveSpace(),
    ]);
    return {
      default: createClassicRumDashboard({ ...deps, spaceId: activeSpace?.id ?? 'default' }),
    };
  });

  return (props) => (
    <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
      <LazyDashboard {...props} />
    </Suspense>
  );
};
