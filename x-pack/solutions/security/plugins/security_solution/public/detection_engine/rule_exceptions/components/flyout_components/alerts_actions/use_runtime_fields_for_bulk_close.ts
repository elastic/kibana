/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { DataViewBase } from '@kbn/es-query';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import type { RuntimeFieldType } from '../../../../../../common/api/detection_engine/signals/set_signal_status/set_signals_status_route.gen';
import { collectRuntimeFieldTypes } from './utils';

export interface RuntimeFieldsResolution {
  runtimeFields: Record<string, RuntimeFieldType>;
  hasUntypedFields: boolean;
  /**
   * True while any of the index-field fetches the map is derived from — the
   * alerts index or the rule's source indices — haven't completed. Callers
   * must not bulk-close with `runtimeFields` until this is false; the map is
   * empty/incomplete until then. Stays true if the alerts-index fetch fails
   * (deliberate — the map can't be computed correctly without the alerts
   * fields, so the gate must stay closed).
   */
  isResolving: boolean;
}

interface UseRuntimeFieldsForBulkCloseArgs {
  exceptionListItems: ExceptionsBuilderReturnExceptionItem[];
  shouldBulkCloseAlert: boolean;
  /** Omitted for callers without a rule context — nothing to resolve, ever. */
  sourceIndexPatterns?: DataViewBase;
  isSourceIndexPatternsLoading?: boolean;
  /** The alerts-index fields, e.g. from `useSignalIndexPatterns`. */
  alertsIndexPatterns: DataViewBase;
  areAlertsIndexPatternsReady: boolean;
}

const IDLE_RESOLUTION: RuntimeFieldsResolution = {
  runtimeFields: {},
  hasUntypedFields: false,
  isResolving: false,
};

const PENDING_RESOLUTION: RuntimeFieldsResolution = {
  runtimeFields: {},
  hasUntypedFields: false,
  isResolving: true,
};

/**
 * Resolves the `runtimeFields` map bulk-close sends with the close-by-query
 * request: for every exception entry field missing from the alerts index,
 * the field's ES type looked up on the rule's source indices.
 *
 * Pure derivation over its inputs — the index-field fetches feeding it are
 * owned by the caller (see `useSignalIndexPatterns`).
 */
export const useRuntimeFieldsForBulkClose = ({
  exceptionListItems,
  shouldBulkCloseAlert,
  sourceIndexPatterns,
  isSourceIndexPatternsLoading,
  alertsIndexPatterns,
  areAlertsIndexPatternsReady,
}: UseRuntimeFieldsForBulkCloseArgs): RuntimeFieldsResolution => {
  return useMemo((): RuntimeFieldsResolution => {
    if (!shouldBulkCloseAlert || sourceIndexPatterns == null) {
      return IDLE_RESOLUTION;
    }
    if (isSourceIndexPatternsLoading || !areAlertsIndexPatternsReady) {
      return PENDING_RESOLUTION;
    }
    return {
      ...collectRuntimeFieldTypes(exceptionListItems, sourceIndexPatterns, alertsIndexPatterns),
      isResolving: false,
    };
  }, [
    shouldBulkCloseAlert,
    sourceIndexPatterns,
    isSourceIndexPatternsLoading,
    areAlertsIndexPatternsReady,
    alertsIndexPatterns,
    exceptionListItems,
  ]);
};
