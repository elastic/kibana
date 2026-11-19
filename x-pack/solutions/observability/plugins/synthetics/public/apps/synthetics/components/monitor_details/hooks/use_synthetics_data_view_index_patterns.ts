/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ExploratoryEmbeddableProps } from '@kbn/exploratory-view-plugin/public';
import { getSyntheticsCcsIndex } from '../../../../../../common/get_synthetics_indices';
import { useGetUrlParams } from '../../../hooks';

type DataTypesIndexPatterns = NonNullable<ExploratoryEmbeddableProps['dataTypesIndexPatterns']>;

// Mirrors the default resolved by ExploratoryView's `getDataTypeIndices` for
// the `alerts` data type (see `observability_data_views.ts`). The pattern is
// not re-exported by the plugin's public API, so we duplicate it here rather
// than reach into internal modules.
const ALERTS_INDEX_PATTERN = '.alerts-observability*';

/**
 * Returns the `dataTypesIndexPatterns` prop value to pass to
 * `ExploratoryViewEmbeddable` for the currently displayed monitor.
 *
 * Provides overrides for both data types consumed by monitor-details views:
 *   - `synthetics`: heartbeat/ping data (Overview embeddables).
 *   - `alerts`: synthetics alert framework data (MonitorAlerts side panel).
 *
 * For local monitors the titles resolve to the platform defaults
 * (`SYNTHETICS_INDEX_PATTERN`, `.alerts-observability*`). For remote (CCS)
 * monitors — identified by the `remoteName` URL parameter — each title is
 * prefixed with `${remoteName}:`, which `Lens` then uses to query the remote
 * cluster via Cross-Cluster Search.
 *
 * Always returns an explicit override (never `undefined`) so the embeddable
 * does not fall back to a localStorage-cached value from a previously viewed
 * monitor — a value that may target a different cluster and would otherwise
 * leak across monitor detail pages within the same browser session.
 *
 * Both keys are returned unconditionally; the embeddable only reads the key
 * matching its `dataType`, so consumers can pass the result through to any
 * `ExploratoryViewEmbeddable` regardless of which data type it targets.
 */
export const useSyntheticsDataViewIndexPatterns = (): DataTypesIndexPatterns => {
  const { remoteName } = useGetUrlParams();

  return useMemo(
    () => ({
      synthetics: getSyntheticsCcsIndex(remoteName),
      alerts: getSyntheticsCcsIndex(remoteName, ALERTS_INDEX_PATTERN),
    }),
    [remoteName]
  );
};
