/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { noop } from 'lodash/fp';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { cellActionRenderer } from '../shared/components/cell_actions';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';

// Tools are lazy-loaded so consumers of this hook don't statically pull the whole document-flyout
// tool graph into their bundle; the chunk only loads when a flyout is actually opened.
const DocumentFlyoutWrapper = lazy(() =>
  import('./main/document_flyout_wrapper').then((m) => ({ default: m.DocumentFlyoutWrapper }))
);
const DocumentFlyoutWrapperFromPattern = lazy(() =>
  import('./main/document_flyout_wrapper_from_pattern').then((m) => ({
    default: m.DocumentFlyoutWrapperFromPattern,
  }))
);
const NotesDetails = lazy(() =>
  import('../shared/tools/notes').then((m) => ({ default: m.NotesDetails }))
);
const AnalyzerGraph = lazy(() =>
  import('./tools/analyzer').then((m) => ({ default: m.AnalyzerGraph }))
);
const SessionView = lazy(() =>
  import('./tools/session_view').then((m) => ({ default: m.SessionView }))
);

export interface OpenDocumentFlyoutParams {
  /** Elasticsearch `_id` of the document to open. */
  documentId: string;
  /**
   * For `openDocumentFlyoutFromIndex`, the concrete `_index` of the document.
   * For `openDocumentFlyoutFromPattern`, a (possibly comma-separated / wildcard) index pattern.
   */
  indexName: string | undefined;
  /** Renderer for cell actions in the flyout. Defaults to the standard `cellActionRenderer`. */
  renderCellActions?: CellActionRenderer;
  /** Invoked after an alert is mutated inside the flyout, to let the caller refresh. Defaults to a no-op. */
  onAlertUpdated?: () => void;
}

export interface OpenNotesParams {
  /** The document record whose notes should be shown. */
  hit: DataTableRecord;
}

export interface OpenAnalyzerParams {
  /** The document record to analyze. */
  hit: DataTableRecord;
  renderCellActions?: CellActionRenderer;
  onAlertUpdated?: () => void;
}

export interface OpenSessionViewParams {
  /** The document record to open the session view for. */
  hit: DataTableRecord;
  jumpToCursor?: string;
  jumpToEntityId?: string;
  renderCellActions?: CellActionRenderer;
  onAlertUpdated?: () => void;
}

export interface DocumentFlyoutApi {
  /** Opens the document details flyout, resolving the document from its concrete `_index`. */
  openDocumentFlyoutFromIndex: (params: OpenDocumentFlyoutParams) => void;
  /**
   * Opens the document details flyout, resolving the document from its id across an index pattern
   * (for callers that don't know the concrete `_index`, e.g. notes).
   */
  openDocumentFlyoutFromPattern: (params: OpenDocumentFlyoutParams) => void;
  /** Opens the notes tools flyout for a document. */
  openNotes: (params: OpenNotesParams) => void;
  /** Opens the analyzer tools flyout for a document. */
  openAnalyzer: (params: OpenAnalyzerParams) => void;
  /** Opens the session view tools flyout for a document. */
  openSessionView: (params: OpenSessionViewParams) => void;
}

/**
 * Developer-facing API to open the new (EUI-based) document flyout and its tool flyouts, in the
 * same mindset as `useExpandableFlyoutApi`. It encapsulates the provider wiring
 * (`flyoutProviders` + `overlays.openSystemFlyout`) and the per-tool flyout properties so call
 * sites don't have to repeat them.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useDocumentFlyoutApi = (): DocumentFlyoutApi => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const open = useCallback(
    (children: ReactNode, properties: OverlaySystemFlyoutOpenOptions) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>,
        }),
        properties
      );
    },
    [overlays, services, store, history]
  );

  const openDocumentFlyoutFromIndex = useCallback(
    ({
      documentId,
      indexName,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
    }: OpenDocumentFlyoutParams) => {
      open(
        <DocumentFlyoutWrapper
          documentId={documentId}
          indexName={indexName}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: 'start' }
      );
    },
    [open, defaultDocumentFlyoutProperties, historyKey]
  );

  const openDocumentFlyoutFromPattern = useCallback(
    ({
      documentId,
      indexName,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
    }: OpenDocumentFlyoutParams) => {
      open(
        <DocumentFlyoutWrapperFromPattern
          documentId={documentId}
          indexName={indexName}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: 'start' }
      );
    },
    [open, defaultDocumentFlyoutProperties, historyKey]
  );

  const openNotes = useCallback(
    ({ hit }: OpenNotesParams) => {
      open(<NotesDetails hit={hit} />, { ...defaultToolsFlyoutProperties, historyKey });
    },
    [open, historyKey]
  );

  const openAnalyzer = useCallback(
    ({
      hit,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
    }: OpenAnalyzerParams) => {
      open(
        <AnalyzerGraph
          hit={hit}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />,
        { ...defaultToolsFlyoutProperties, historyKey, session: 'start' }
      );
    },
    [open, historyKey]
  );

  const openSessionView = useCallback(
    ({
      hit,
      jumpToCursor,
      jumpToEntityId,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
    }: OpenSessionViewParams) => {
      open(
        <SessionView
          hit={hit}
          jumpToCursor={jumpToCursor}
          jumpToEntityId={jumpToEntityId}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />,
        { ...defaultToolsFlyoutProperties, historyKey, session: 'start' }
      );
    },
    [open, historyKey]
  );

  return useMemo(
    () => ({
      openDocumentFlyoutFromIndex,
      openDocumentFlyoutFromPattern,
      openNotes,
      openAnalyzer,
      openSessionView,
    }),
    [
      openDocumentFlyoutFromIndex,
      openDocumentFlyoutFromPattern,
      openNotes,
      openAnalyzer,
      openSessionView,
    ]
  );
};
