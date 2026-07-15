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
import type { PrevalenceDetailsProps } from './tools/prevalence';
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
import { FlyoutSessionContextProvider, useFlyoutSessionContext } from '../session_context'; // Tools are lazy-loaded so consumers of this hook don't statically pull the whole document-flyout

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
const AnalyzerGraph = lazy(() =>
  import('./tools/analyzer').then((m) => ({ default: m.AnalyzerGraph }))
);
const SessionView = lazy(() =>
  import('./tools/session_view').then((m) => ({ default: m.SessionView }))
);
const EntityDetails = lazy(() =>
  import('./tools/entities').then((m) => ({ default: m.EntityDetails }))
);
const CorrelationsDetails = lazy(() =>
  import('./tools/correlations').then((m) => ({ default: m.CorrelationsDetails }))
);
const ResponseDetails = lazy(() =>
  import('./tools/response').then((m) => ({ default: m.ResponseDetails }))
);
const PrevalenceDetails = lazy(() =>
  import('./tools/prevalence').then((m) => ({ default: m.PrevalenceDetails }))
);
const ThreatIntelligenceDetails = lazy(() =>
  import('./tools/threat_intelligence').then((m) => ({ default: m.ThreatIntelligenceDetails }))
);
const InvestigationGuide = lazy(() =>
  import('./tools/investigation_guide').then((m) => ({ default: m.InvestigationGuide }))
);
const GraphDetails = lazy(() => import('./tools/graph').then((m) => ({ default: m.GraphDetails })));

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

export interface OpenDocumentEntitiesParams {
  /** The document record whose related entities should be shown. */
  hit: DataTableRecord;
  /** Scope id for the entity links opened from the tool. */
  scopeId?: string;
}

export interface OpenDocumentCorrelationsParams {
  /** The document record whose correlations should be shown. */
  hit: DataTableRecord;
  /** Scope id for the document. */
  scopeId: string;
  /** Whether the document is being displayed in a rule preview. */
  isRulePreview: boolean;
  /** Callback to open one of the correlated alerts. */
  onShowAlert: (id: string, indexName: string) => void;
  /** Optional callback to open a correlated attack; when omitted the attack column is hidden. */
  onShowAttack?: (id: string, indexName: string) => void;
}

export interface OpenDocumentResponseParams {
  /** The alert document whose response actions should be shown. */
  hit: DataTableRecord;
}

export interface OpenDocumentThreatIntelligenceParams {
  /** The document whose threat intelligence matches should be shown. */
  hit: DataTableRecord;
}

export interface OpenDocumentInvestigationGuideParams {
  /** The alert document whose investigation guide should be shown. */
  hit: DataTableRecord;
}

/** Parameters for the prevalence tool. Mirrors the tool's own props (the caller builds `columns`). */
export type OpenDocumentPrevalenceParams = PrevalenceDetailsProps;

export interface OpenDocumentGraphParams {
  /** The document to render the graph for. */
  hit: DataTableRecord;
  renderCellActions?: CellActionRenderer;
  onAlertUpdated?: () => void;
}

export interface DocumentFlyoutApi {
  /**
   * Opens the document details flyout (resolving the document from its concrete `_index`) as a new,
   * top-level flyout (starting a fresh session). Use this from outside any flyout — e.g. a table row.
   */
  openDocumentFlyoutFromIndex: (params: OpenDocumentFlyoutParams) => void;
  /**
   * Opens the document details flyout (resolving from its concrete `_index`) as a child of the
   * currently open flyout (nested in its history stack, so the back button returns to it). Use this
   * from within an already-open flyout — e.g. a node click in the graph tool.
   */
  openDocumentFlyoutFromIndexAsChild: (params: OpenDocumentFlyoutParams) => void;
  /**
   * Opens the document details flyout, resolving the document from its id across an index pattern
   * (for callers that don't know the concrete `_index`, e.g. notes).
   */
  openDocumentFlyoutFromPattern: (params: OpenDocumentFlyoutParams) => void;
  /** Opens the analyzer tools flyout for a document. */
  openAnalyzer: (params: OpenAnalyzerParams) => void;
  /** Opens the session view tools flyout for a document. */
  openSessionView: (params: OpenSessionViewParams) => void;
  /** Opens the document's Entities tool flyout (hosts/users involved in the document). */
  openDocumentEntities: (params: OpenDocumentEntitiesParams) => void;
  /** Opens the document's Correlations tool flyout (related alerts/events/attacks). */
  openDocumentCorrelations: (params: OpenDocumentCorrelationsParams) => void;
  /** Opens the document's Response actions tool flyout. */
  openDocumentResponse: (params: OpenDocumentResponseParams) => void;
  /** Opens the document's Threat Intelligence tool flyout. */
  openDocumentThreatIntelligence: (params: OpenDocumentThreatIntelligenceParams) => void;
  /** Opens the document's Prevalence tool flyout. */
  openDocumentPrevalence: (params: OpenDocumentPrevalenceParams) => void;
  /** Opens the document's Investigation Guide tool flyout. */
  openDocumentInvestigationGuide: (params: OpenDocumentInvestigationGuideParams) => void;
  /** Opens the document's Graph tool flyout. */
  openDocumentGraph: (params: OpenDocumentGraphParams) => void;
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
  const mainFlyoutSessionMode = useFlyoutSessionContext();

  const open = useCallback(
    (
      children: ReactNode,
      properties: OverlaySystemFlyoutOpenOptions,
      propagatedMainFlyoutSessionMode = mainFlyoutSessionMode
    ) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <FlyoutSessionContextProvider value={propagatedMainFlyoutSessionMode}>
              <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>
            </FlyoutSessionContextProvider>
          ),
        }),
        properties
      );
    },
    [overlays, services, store, history, mainFlyoutSessionMode]
  );

  // Builds the document flyout content (resolved from a concrete `_index`), shared by both the main
  // and child open methods. Only the `session` differs between them, so it is kept private here and
  // callers pick `openDocumentFlyoutFromIndex` (main) or `openDocumentFlyoutFromIndexAsChild` (child).
  const buildFromIndexContent = useCallback(
    ({
      documentId,
      indexName,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
    }: OpenDocumentFlyoutParams): ReactNode => (
      <DocumentFlyoutWrapper
        documentId={documentId}
        indexName={indexName}
        renderCellActions={renderCellActions}
        onAlertUpdated={onAlertUpdated}
      />
    ),
    []
  );

  const openDocumentFlyoutFromIndex = useCallback(
    (params: OpenDocumentFlyoutParams) => {
      open(buildFromIndexContent(params), {
        ...defaultDocumentFlyoutProperties,
        historyKey,
        session: mainFlyoutSessionMode,
      });
    },
    [
      open,
      buildFromIndexContent,
      defaultDocumentFlyoutProperties,
      historyKey,
      mainFlyoutSessionMode,
    ]
  );

  const openDocumentFlyoutFromIndexAsChild = useCallback(
    (params: OpenDocumentFlyoutParams) => {
      open(
        buildFromIndexContent(params),
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: 'inherit',
        },
        'inherit'
      );
    },
    [open, buildFromIndexContent, defaultDocumentFlyoutProperties, historyKey]
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
        { ...defaultDocumentFlyoutProperties, historyKey, session: mainFlyoutSessionMode }
      );
    },
    [open, defaultDocumentFlyoutProperties, historyKey, mainFlyoutSessionMode]
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

  const openDocumentEntities = useCallback(
    ({ hit, scopeId }: OpenDocumentEntitiesParams) => {
      open(
        <EntityDetails hit={hit} scopeId={scopeId} />,
        { ...defaultToolsFlyoutProperties, historyKey, session: 'start' },
        'inherit'
      );
    },
    [open, historyKey]
  );

  const openDocumentCorrelations = useCallback(
    ({
      hit,
      scopeId,
      isRulePreview,
      onShowAlert,
      onShowAttack,
    }: OpenDocumentCorrelationsParams) => {
      open(
        <CorrelationsDetails
          hit={hit}
          scopeId={scopeId}
          isRulePreview={isRulePreview}
          onShowAlert={onShowAlert}
          onShowAttack={onShowAttack}
        />,
        { ...defaultToolsFlyoutProperties, historyKey, session: 'start' },
        'inherit'
      );
    },
    [open, historyKey]
  );

  const openDocumentResponse = useCallback(
    ({ hit }: OpenDocumentResponseParams) => {
      open(<ResponseDetails hit={hit} />, {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      });
    },
    [open, historyKey]
  );

  const openDocumentThreatIntelligence = useCallback(
    ({ hit }: OpenDocumentThreatIntelligenceParams) => {
      open(<ThreatIntelligenceDetails hit={hit} />, {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      });
    },
    [open, historyKey]
  );

  const openDocumentPrevalence = useCallback(
    ({ hit, investigationFields, scopeId, columns }: OpenDocumentPrevalenceParams) => {
      open(
        <PrevalenceDetails
          hit={hit}
          investigationFields={investigationFields}
          scopeId={scopeId}
          columns={columns}
        />,
        { ...defaultToolsFlyoutProperties, historyKey, session: 'start' },
        'inherit'
      );
    },
    [open, historyKey]
  );

  const openDocumentInvestigationGuide = useCallback(
    ({ hit }: OpenDocumentInvestigationGuideParams) => {
      open(<InvestigationGuide hit={hit} />, {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      });
    },
    [open, historyKey]
  );

  const openDocumentGraph = useCallback(
    ({
      hit,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
    }: OpenDocumentGraphParams) => {
      open(
        <GraphDetails
          hit={hit}
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
      openDocumentFlyoutFromIndexAsChild,
      openDocumentFlyoutFromPattern,
      openAnalyzer,
      openSessionView,
      openDocumentEntities,
      openDocumentCorrelations,
      openDocumentResponse,
      openDocumentThreatIntelligence,
      openDocumentPrevalence,
      openDocumentInvestigationGuide,
      openDocumentGraph,
    }),
    [
      openDocumentFlyoutFromIndex,
      openDocumentFlyoutFromIndexAsChild,
      openDocumentFlyoutFromPattern,
      openAnalyzer,
      openSessionView,
      openDocumentEntities,
      openDocumentCorrelations,
      openDocumentResponse,
      openDocumentThreatIntelligence,
      openDocumentPrevalence,
      openDocumentInvestigationGuide,
      openDocumentGraph,
    ]
  );
};
