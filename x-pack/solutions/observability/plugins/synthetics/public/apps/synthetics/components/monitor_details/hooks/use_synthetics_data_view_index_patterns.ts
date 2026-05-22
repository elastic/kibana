/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ExploratoryEmbeddableProps } from '@kbn/exploratory-view-plugin/public';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useGetUrlParams } from '../../../hooks';

type DataTypesIndexPatterns = NonNullable<ExploratoryEmbeddableProps['dataTypesIndexPatterns']>;

/**
 * Returns the `dataTypesIndexPatterns` prop value to pass to
 * `ExploratoryViewEmbeddable` for the currently displayed monitor.
 *
 * For local monitors the title resolves to `SYNTHETICS_INDEX_PATTERN`. For
 * remote (CCS) monitors — identified by the `remoteName` URL parameter — it
 * resolves to `${remoteName}:${SYNTHETICS_INDEX_PATTERN}`, which `Lens` then
 * uses to query the remote cluster via Cross-Cluster Search.
 *
 * Always returns an explicit override (never `undefined`) so the embeddable
 * does not fall back to a localStorage-cached value from a previously viewed
 * monitor — a value that may target a different cluster and would otherwise
 * leak across monitor detail pages within the same browser session.
 */
export const useSyntheticsDataViewIndexPatterns = (): DataTypesIndexPatterns => {
  const { remoteName } = useGetUrlParams();

  return useMemo(
    () => ({
      synthetics: remoteName
        ? `${remoteName}:${SYNTHETICS_INDEX_PATTERN}`
        : SYNTHETICS_INDEX_PATTERN,
    }),
    [remoteName]
  );
};
