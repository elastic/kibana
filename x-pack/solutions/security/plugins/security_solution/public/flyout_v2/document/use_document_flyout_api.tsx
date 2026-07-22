/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { noop } from 'lodash/fp';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { FlyoutOrigin } from '../../common/lib/telemetry';
import {
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TOOL,
  FLYOUT_TYPE,
} from '../../common/lib/telemetry';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { cellActionRenderer } from '../shared/components/cell_actions';
import type { OpenFlyoutLinkProps } from '../shared/components/open_flyout_link';
import { OpenFlyoutLink } from '../shared/components/open_flyout_link';
import { getColumns } from './tools/prevalence/utils/get_columns';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import {
  ANALYZER_TITLE,
  CORRELATIONS_TITLE,
  ENTITIES_TITLE,
  formatFlyoutTitle,
  GRAPH_TITLE,
  INVESTIGATION_GUIDE_TITLE,
  PREVALENCE_TITLE,
  RESPONSE_TITLE,
  SESSION_VIEW_TITLE,
  THREAT_INTELLIGENCE_TITLE,
} from '../shared/constants/flyout_titles';
import { getAlertHistoryTitle, getDocumentTitle } from './main/utils/get_header_title';
import { useFlyoutSessionContext } from '../session_context';
import { useFlyoutV2UrlWriter } from '../shared/url_state/flyout_v2_url_writer';
import type { FlyoutDescriptor } from '../shared/url_state/flyout_v2_url_param';
import {
  decodeFlyoutV2UrlParam,
  FLYOUT_DESCRIPTOR_KIND,
  urlParamKeyForHistoryKey,
} from '../shared/url_state/flyout_v2_url_param';

/**
 * Extracts the minimal identifying fields from a DataTableRecord for use in URL descriptors.
 * Both `_id` and `_index` are always present on Elasticsearch hits.
 */
const documentIdsFromHit = (hit: DataTableRecord): { documentId: string; indexName: string } => ({
  documentId: (hit.raw._id as string) ?? '',
  indexName: (hit.raw._index as string) ?? '',
});

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
  /** Which UI trigger opened this flyout, when known. */
  origin?: FlyoutOrigin;
  /**
   * Flyout-history title to use for this open, when already known synchronously by the caller
   * (e.g. `getDocumentHistoryTitle(hit)`). For `openDocumentFlyoutFromIndex`, omitted means no
   * title. For `openDocumentFlyoutFromIndexAsChild`, omitted falls back to the bare "Alert" title,
   * since the full document isn't loaded yet at open time.
   */
  title?: string;
}

export interface OpenAnalyzerParams {
  /** The document record to analyze. */
  hit: DataTableRecord;
  renderCellActions?: CellActionRenderer;
  onAlertUpdated?: () => void;
  /** Which UI trigger opened the analyzer tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenSessionViewParams {
  /** The document record to open the session view for. */
  hit: DataTableRecord;
  jumpToCursor?: string;
  jumpToEntityId?: string;
  renderCellActions?: CellActionRenderer;
  onAlertUpdated?: () => void;
  /** Which UI trigger opened the session view tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenDocumentEntitiesParams {
  /** The document record whose related entities should be shown. */
  hit: DataTableRecord;
  /** Scope id for the entity links opened from the tool. */
  scopeId?: string;
  /** Which UI trigger opened the entities tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenDocumentCorrelationsParams {
  /** The document record whose correlations should be shown. */
  hit: DataTableRecord;
  /** Scope id for the document. */
  scopeId: string;
  /** Whether the document is being displayed in a rule preview. */
  isRulePreview: boolean;
  /** Callback to open one of the correlated alerts. */
  onShowAlert: (id: string, indexName: string, title?: string) => void;
  /** Optional callback to open a correlated attack; when omitted the attack column is hidden. */
  onShowAttack?: (id: string, indexName: string, title?: string) => void;
  /** Which UI trigger opened the correlations tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenDocumentResponseParams {
  /** The alert document whose response actions should be shown. */
  hit: DataTableRecord;
  /** Which UI trigger opened the response tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenDocumentThreatIntelligenceParams {
  /** The document whose threat intelligence matches should be shown. */
  hit: DataTableRecord;
  /** Which UI trigger opened the threat intelligence tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenDocumentInvestigationGuideParams {
  /** The alert document whose investigation guide should be shown. */
  hit: DataTableRecord;
  /** Which UI trigger opened the investigation guide tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenDocumentPrevalenceParams {
  /** Alert/event document to show prevalence for. */
  hit: DataTableRecord;
  /** List of investigation fields retrieved from the rule. */
  investigationFields: string[];
  /** Scope id, used for cell actions. */
  scopeId: string;
  /**
   * Optional cell-action renderer override; defaults to the standard Security cell actions.
   * The table `columns` themselves are built internally (not by the caller) so that this open
   * method — and therefore the restore-from-URL path, which has no table-rendering context of
   * its own — can be called with only serializable data.
   */
  renderCellActions?: CellActionRenderer;
  /** Which UI trigger opened the prevalence tool, when known. */
  origin?: FlyoutOrigin;
}

export interface OpenDocumentGraphParams {
  /** The document to render the graph for. */
  hit: DataTableRecord;
  renderCellActions?: CellActionRenderer;
  onAlertUpdated?: () => void;
  /** Which UI trigger opened the graph tool, when known. */
  origin?: FlyoutOrigin;
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
 * (`flyoutProviders` + `overlays.openSystemFlyout`, via `useOpenFlyout`) and the per-tool flyout
 * properties so call sites don't have to repeat them. `useOpenFlyout` also reports open/close
 * telemetry for every method below.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useDocumentFlyoutApi = (): DocumentFlyoutApi => {
  const history = useHistory();
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const open = useOpenFlyout();
  const urlParamKey = urlParamKeyForHistoryKey(historyKey);
  const { writeOnOpen, buildOnClose } = useFlyoutV2UrlWriter(urlParamKey, historyKey);
  const isInSecurityApp = useIsInSecurityApp();

  // Stable wrapper so prevalence's `columns` (built internally, see `openDocumentPrevalence`)
  // don't depend on a fresh inline component identity every render.
  const renderFlyoutLink = useCallback(
    (props: OpenFlyoutLinkProps) => <OpenFlyoutLink {...props} />,
    []
  );

  // Reads the first descriptor from the current URL stack without bumping the generation.
  // Used by openDocumentFlyoutFromIndexAsChild to determine the parent descriptor (close fallback)
  // before appending the child descriptor with writeOnOpen('inherit').
  const readFirstDescriptor = useCallback((): FlyoutDescriptor | null => {
    if (!history?.location) return null;
    const raw = new URLSearchParams(history.location.search).get(urlParamKey);
    const stack = decodeFlyoutV2UrlParam(raw);
    return stack?.[0] ?? null;
  }, [history, urlParamKey]);

  // Builds the document flyout content (resolved from a concrete `_index`), shared by both the main
  // and child open methods. Only the `session` differs between them, so it is kept private here and
  // callers pick `openDocumentFlyoutFromIndex` (main) or `openDocumentFlyoutFromIndexAsChild` (child).
  const buildFromIndexContent = useCallback(
    ({
      documentId,
      indexName,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
    }: OpenDocumentFlyoutParams) => (
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
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.document,
        documentId: params.documentId,
        indexName: params.indexName ?? '',
      });
      const onClose = buildOnClose(null);
      open(
        buildFromIndexContent(params),
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: sessionMode,
          title: params.title,
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: sessionMode,
          origin: params.origin,
        }
      );
    },
    [
      open,
      buildFromIndexContent,
      defaultDocumentFlyoutProperties,
      historyKey,
      sessionMode,
      writeOnOpen,
      buildOnClose,
    ]
  );

  const openDocumentFlyoutFromIndexAsChild = useCallback(
    (params: OpenDocumentFlyoutParams) => {
      // Read the parent descriptor from the URL before appending the child so we know what to
      // restore to when the child closes (e.g. the analyzer that opened this document as a child).
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(
        {
          kind: FLYOUT_DESCRIPTOR_KIND.document,
          documentId: params.documentId,
          indexName: params.indexName ?? '',
        },
        'inherit'
      );
      const onClose = buildOnClose(parentDescriptor);
      open(
        buildFromIndexContent(params),
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.INHERIT,
          title: buildFlyoutNavTitle(params.title ?? getAlertHistoryTitle()),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin: params.origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [
      open,
      buildFromIndexContent,
      defaultDocumentFlyoutProperties,
      historyKey,
      readFirstDescriptor,
      writeOnOpen,
      buildOnClose,
    ]
  );

  const openDocumentFlyoutFromPattern = useCallback(
    ({
      documentId,
      indexName,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
      origin,
    }: OpenDocumentFlyoutParams) => {
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.documentFromPattern,
        documentId,
        indexName: indexName ?? '',
      });
      const onClose = buildOnClose(null);
      open(
        <DocumentFlyoutWrapperFromPattern
          documentId={documentId}
          indexName={indexName}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: sessionMode, onClose },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: sessionMode,
          origin,
        }
      );
    },
    [open, defaultDocumentFlyoutProperties, historyKey, sessionMode, writeOnOpen, buildOnClose]
  );

  const openAnalyzer = useCallback(
    ({
      hit,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
      origin,
    }: OpenAnalyzerParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({ kind: FLYOUT_DESCRIPTOR_KIND.analyzer, documentId, indexName });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <AnalyzerGraph
          hit={hit}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(ANALYZER_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.ANALYZER,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
  );

  const openSessionView = useCallback(
    ({
      hit,
      jumpToCursor,
      jumpToEntityId,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
      origin,
    }: OpenSessionViewParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.sessionView,
        documentId,
        indexName,
        jumpToCursor,
        jumpToEntityId,
      });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <SessionView
          hit={hit}
          jumpToCursor={jumpToCursor}
          jumpToEntityId={jumpToEntityId}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(SESSION_VIEW_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.SESSION_VIEW,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
  );

  const openDocumentEntities = useCallback(
    ({ hit, scopeId, origin }: OpenDocumentEntitiesParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.documentEntities,
        documentId,
        indexName,
        scopeId,
      });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <EntityDetails hit={hit} scopeId={scopeId} />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(ENTITIES_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.ENTITIES,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
  );

  const openDocumentCorrelations = useCallback(
    ({
      hit,
      scopeId,
      isRulePreview,
      onShowAlert,
      onShowAttack,
      origin,
    }: OpenDocumentCorrelationsParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.documentCorrelations,
        documentId,
        indexName,
        scopeId,
        isRulePreview,
      });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <CorrelationsDetails
          hit={hit}
          scopeId={scopeId}
          isRulePreview={isRulePreview}
          onShowAlert={onShowAlert}
          onShowAttack={onShowAttack}
        />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(CORRELATIONS_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.CORRELATIONS,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
  );

  const openDocumentResponse = useCallback(
    ({ hit, origin }: OpenDocumentResponseParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({ kind: FLYOUT_DESCRIPTOR_KIND.documentResponse, documentId, indexName });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <ResponseDetails hit={hit} />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(RESPONSE_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.RESPONSE,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
  );

  const openDocumentThreatIntelligence = useCallback(
    ({ hit, origin }: OpenDocumentThreatIntelligenceParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.documentThreatIntelligence,
        documentId,
        indexName,
      });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <ThreatIntelligenceDetails hit={hit} />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(THREAT_INTELLIGENCE_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.THREAT_INTELLIGENCE,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
  );

  const openDocumentPrevalence = useCallback(
    ({
      hit,
      investigationFields,
      scopeId,
      renderCellActions: renderCellActionsOverride = cellActionRenderer,
      origin,
    }: OpenDocumentPrevalenceParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.documentPrevalence,
        documentId,
        indexName,
        scopeId,
        investigationFields,
      });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      // `columns` is built here (rather than accepted from the caller) so this method only needs
      // serializable data — that lets the restore-from-URL path reopen the tool directly instead
      // of falling back to the document main flyout.
      const columns = getColumns(
        renderCellActionsOverride,
        isInSecurityApp,
        scopeId,
        renderFlyoutLink
      );
      open(
        <PrevalenceDetails
          hit={hit}
          investigationFields={investigationFields}
          scopeId={scopeId}
          columns={columns}
        />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(PREVALENCE_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.PREVALENCE,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose, isInSecurityApp, renderFlyoutLink]
  );

  const openDocumentInvestigationGuide = useCallback(
    ({ hit, origin }: OpenDocumentInvestigationGuideParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.documentInvestigationGuide,
        documentId,
        indexName,
      });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <InvestigationGuide hit={hit} />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(INVESTIGATION_GUIDE_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.INVESTIGATION_GUIDE,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
  );

  const openDocumentGraph = useCallback(
    ({
      hit,
      renderCellActions = cellActionRenderer,
      onAlertUpdated = noop,
      origin,
    }: OpenDocumentGraphParams) => {
      const { documentId, indexName } = documentIdsFromHit(hit);
      writeOnOpen({ kind: FLYOUT_DESCRIPTOR_KIND.documentGraph, documentId, indexName });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <GraphDetails
          hit={hit}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(GRAPH_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.GRAPH,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
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
