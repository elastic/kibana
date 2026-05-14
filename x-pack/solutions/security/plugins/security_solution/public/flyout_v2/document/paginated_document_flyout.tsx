/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { useAlertsContext } from '../../detections/components/alerts_table/alerts_context';
import { cellActionRenderer } from '../shared/components/cell_actions';
import { DocumentFlyout } from './main';

export interface PaginatedDocumentFlyoutProps {
  /**
   * Scope id of the alerts table that opened this flyout. Forwarded to
   * downstream components so cell actions, refetches and telemetry stay
   * tied to the originating table.
   */
  scopeId: string;
}

/**
 * Flyout V2 entry point used by the alerts table when in-flyout pagination
 * is active. Reads the currently-selected alert from
 * `alertsTablePaginationStore` (via `useAlertsContext`) and renders
 * `<DocumentFlyout>` with the resolved hit.
 *
 * During cross-page navigation the store transiently has
 * `isFlyoutAlertLoading=true` and the freshly-clicked `flyoutAlertIndex`
 * before the parallel `useSearchAlertsQuery` resolves the new alert. We
 * keep rendering the previously displayed hit so the V2 `DocumentFlyout`'s
 * loading branch (header + centered spinner) has the previous alert's
 * metadata to show, mirroring V1's `RightPanel` behaviour.
 */
export const PaginatedDocumentFlyout = memo(({ scopeId }: PaginatedDocumentFlyoutProps) => {
  const { alertsTableRef, flyoutAlert } = useAlertsContext();

  // Cache the last DataTableRecord built from `flyoutAlert`, keyed on the
  // raw alert `_id` (distinct from the composite DataTableRecord `id` of
  // `_index::_id::routing`, see `getDocId`). Using a render-time ref cache
  // instead of state + effect avoids the extra render that
  // `useState`/`useEffect` would introduce on every alert swap, and the
  // previously cached hit is reused when `flyoutAlert` transiently goes
  // stale during cross-page navigation.
  const cacheRef = useRef<{ id: string; hit: DataTableRecord } | null>(null);
  if (flyoutAlert && cacheRef.current?.id !== flyoutAlert._id) {
    cacheRef.current = { id: flyoutAlert._id, hit: buildHitFromAlert(flyoutAlert) };
  }
  const currentHit = cacheRef.current?.hit ?? null;

  const renderCellActions = useMemo(
    () => ((props) => cellActionRenderer({ ...props, scopeId })) as typeof cellActionRenderer,
    [scopeId]
  );

  const handleAlertUpdated = useCallback(() => {
    alertsTableRef.current?.refresh();
  }, [alertsTableRef]);

  if (!currentHit) {
    return null;
  }

  return (
    <DocumentFlyout
      hit={currentHit}
      renderCellActions={renderCellActions}
      onAlertUpdated={handleAlertUpdated}
    />
  );
});

PaginatedDocumentFlyout.displayName = 'PaginatedDocumentFlyout';

const buildHitFromAlert = (alert: { _id: string; _index: string }): DataTableRecord =>
  buildDataTableRecord({
    _id: alert._id,
    _index: alert._index,
    _source: alert as Record<string, unknown>,
  } as EsHitRecord);
