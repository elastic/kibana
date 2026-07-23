/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { noop } from 'lodash/fp';
import { EventKind } from '../../document/main/constants/event_kinds';
import {
  getDocumentHistoryTitle,
  getDocumentTitle,
} from '../../document/main/utils/get_header_title';
import type { CellActionRenderer } from '../components/cell_actions';
import { noopCellActionRenderer } from '../components/cell_actions';
import { getAttackTitleValue } from '../../attack/utils/get_attack_title';
import { isAttackDocument } from '../../attack/utils/is_attack_document';
import { ATTACK_TITLE, formatFlyoutTitle } from '../constants/flyout_titles';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import { DocumentSeverity } from '../../document/main/components/severity';
import { Timestamp } from '../components/timestamp';
import { useFlyoutApi } from '../../use_flyout_api';

export interface UseDocumentFlyoutTitleOptions {
  /** The source document to derive display values from. */
  hit: DataTableRecord;
  /** Cell action renderer forwarded to the child document flyout. */
  renderCellActions?: CellActionRenderer;
  /** Callback invoked after alert mutations in the child document flyout. */
  onAlertUpdated?: () => void;
}

export interface DocumentFlyoutTitleResult {
  /** Document title derived from the hit (the attack name for attack documents). */
  label: string;
  /**
   * Icon type: `'bolt'` for attack documents, `'warning'` for alerts, `'analyzeEvent'` for other
   * documents.
   */
  iconType: string;
  /** Opens the source document as a child flyout (the attack flyout for attack documents). */
  onTitleClick: () => void;
  /** Severity badge for the document. */
  badge: React.ReactNode;
  /** Formatted timestamp for the document. */
  timestamp: React.ReactNode;
}

/**
 * Derives all `ToolsFlyoutHeader` display values from a source document hit.
 */
export const useDocumentFlyoutTitle = ({
  hit,
  renderCellActions = noopCellActionRenderer,
  onAlertUpdated = noop,
}: UseDocumentFlyoutTitleOptions): DocumentFlyoutTitleResult => {
  const { openDocumentFlyoutFromIndexAsChild, openAttackFlyoutAsChild } = useFlyoutApi();

  // Attack discovery documents are persisted as alerts (event.kind: signal), so detect them by
  // rule type id first — they'd otherwise match the generic alert branch below.
  const isAttack = useMemo(() => isAttackDocument(hit), [hit]);
  const attackTitle = useMemo(() => getAttackTitleValue(hit), [hit]);

  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );

  const label = useMemo(
    () => (isAttack ? attackTitle ?? ATTACK_TITLE : getDocumentTitle(hit)),
    [attackTitle, hit, isAttack]
  );
  const sessionTitle = useMemo(
    () => (isAttack ? formatFlyoutTitle(ATTACK_TITLE, attackTitle) : getDocumentHistoryTitle(hit)),
    [attackTitle, hit, isAttack]
  );
  const iconType = isAttack ? 'bolt' : isAlert ? 'warning' : 'analyzeEvent';

  // Open the source document as a child flyout. Route through the flyout API rather than calling
  // `overlays.openSystemFlyout` directly so the child descriptor is written to the flyoutV2 URL
  // param (via the API's internal writeOnOpen('inherit')) and restored on refresh.
  // Attack documents live in alert-specific indices not covered by the default data view, so they
  // must be opened with openAttackFlyoutAsChild (which fetches via useTimelineEventsDetails against
  // the specific index). openDocumentFlyoutFromIndexAsChild uses useEsDocSearch against the default
  // data view and returns NotFound for attack documents.
  const onTitleClick = useCallback(() => {
    if (isAttack) {
      openAttackFlyoutAsChild({
        attackId: hit.raw._id ?? '',
        indexName: (hit.raw._index as string) ?? '',
        attackTitle: attackTitle ?? undefined,
        origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE,
      });
    } else {
      openDocumentFlyoutFromIndexAsChild({
        documentId: hit.raw._id ?? '',
        indexName: (hit.raw._index as string) ?? '',
        renderCellActions,
        onAlertUpdated,
        title: sessionTitle,
        origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE,
      });
    }
  }, [
    isAttack,
    openAttackFlyoutAsChild,
    openDocumentFlyoutFromIndexAsChild,
    hit,
    attackTitle,
    renderCellActions,
    onAlertUpdated,
    sessionTitle,
  ]);

  const badge = <DocumentSeverity hit={hit} />;
  const timestamp = <Timestamp hit={hit} size="xs" />;

  return { label, iconType, onTitleClick, badge, timestamp };
};
