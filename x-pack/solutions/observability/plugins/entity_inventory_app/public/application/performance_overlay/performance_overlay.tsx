/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { ENTITY_INVENTORY_PERFORMANCE_OVERLAY_ENABLED } from '../../../common/feature_flags';
import { useKibana } from '../../hooks/use_kibana';
import type { PerformanceRecorder } from './performance_recorder';

const LazyPerformanceOverlayPanel = lazy(async () => {
  const { PerformanceOverlayPanel } = await import('./performance_overlay_panel');
  return { default: PerformanceOverlayPanel };
});

export interface PerformanceOverlayProps {
  recorder: PerformanceRecorder;
}

/** The developer performance overlay; renders nothing, and loads no overlay code, while the flag is off. */
export const PerformanceOverlay = ({ recorder }: PerformanceOverlayProps) => {
  const {
    services: { featureFlags },
  } = useKibana();
  const enabled = featureFlags.useBooleanValue(ENTITY_INVENTORY_PERFORMANCE_OVERLAY_ENABLED, false);

  if (!enabled) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyPerformanceOverlayPanel recorder={recorder} />
    </Suspense>
  );
};
