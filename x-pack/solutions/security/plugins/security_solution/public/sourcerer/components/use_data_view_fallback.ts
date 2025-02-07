/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { useCreateAdhocDataView } from './use_create_adhoc_data_view';

interface UseDataViewFallbackConfig {
  /**
   * Called when user interacts with the error notification
   */
  onResolveErrorManually: VoidFunction;

  /**
   * Missing patterns that need to be wrapped in an adhoc adhocDataView
   */
  missingPatterns: string[];

  /**
   * Is fallback process enabled?
   */
  enableFallback: boolean;

  /**
   * Calls external function on dataview change
   */
  onApplyFallbackDataView: (dataView: DataViewSpec) => void;
}

export const useDataViewFallback = ({
  onResolveErrorManually,
  missingPatterns,
  enableFallback,
  onApplyFallbackDataView,
}: UseDataViewFallbackConfig) => {
  const { createAdhocDataView } = useCreateAdhocDataView(onResolveErrorManually);

  // NOTE: this exists because missingPatterns array reference is swapped very often and we only care about
  // the values here
  const stableMissingPatternsString = useMemo(() => missingPatterns.join(), [missingPatterns]);

  useEffect(() => {
    // NOTE: this lets us prevent setting the index on every commit,
    // as there is no way to pass in abort signal into the data view creation apis
    let ignore = false;

    if (!enableFallback) {
      return;
    }

    if (!stableMissingPatternsString.length) {
      return;
    }

    (async () => {
      const adhocDataView = await createAdhocDataView(stableMissingPatternsString.split(','));

      if (ignore) {
        return;
      }

      if (!adhocDataView || !adhocDataView.id) {
        return;
      }

      onApplyFallbackDataView(adhocDataView.toSpec());
    })();

    return () => {
      ignore = true;
    };
  }, [createAdhocDataView, onApplyFallbackDataView, enableFallback, stableMissingPatternsString]);
};
