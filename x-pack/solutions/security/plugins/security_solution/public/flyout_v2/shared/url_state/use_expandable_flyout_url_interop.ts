/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { decode } from '@kbn/rison';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import { useFlyoutApi } from '../../use_flyout_api';
import { openDescriptorAsStart, openDescriptorAsChild } from './use_flyout_v2_restore';
import type { FlyoutDescriptor, FlyoutV2UrlParamValue } from './flyout_v2_url_param';

// ---------------------------------------------------------------------------
// Legacy panel ID constants (copied verbatim from the legacy flyout registry)
// ---------------------------------------------------------------------------

const DOCUMENT_DETAILS_RIGHT = 'document-details-right';
const DOCUMENT_DETAILS_LEFT = 'document-details-left';
const ATTACK_DETAILS_RIGHT = 'attack-details-right';
const ATTACK_DETAILS_LEFT = 'attack-details-left';
const HOST_PANEL = 'host-panel';
const HOST_DETAILS = 'host_details';
const USER_PANEL = 'user-panel';
const USER_DETAILS = 'user_details';
const SERVICE_PANEL = 'service-panel';
const SERVICE_DETAILS = 'service_details';
const GENERIC_ENTITY_PANEL = 'generic-entity-panel';
const GENERIC_ENTITY_DETAILS = 'generic_entity_details';
const NETWORK_PANEL = 'network-details';
const RULE_PANEL = 'rule-panel';
const IOC_RIGHT_PANEL = 'ioc-details-right';
const MISCONFIGURATION_FINDINGS_PANEL = 'findings-misconfiguration-panel';
const VULNERABILITY_FINDINGS_PANEL = 'findings-vulnerability-panel';

/** Panel IDs whose right+left pair collapses to a single v2 main flyout (no tools). */
const NO_TOOLS_PANEL_IDS = new Set([
  NETWORK_PANEL,
  RULE_PANEL,
  IOC_RIGHT_PANEL,
  MISCONFIGURATION_FINDINGS_PANEL,
  VULNERABILITY_FINDINGS_PANEL,
]);

// ---------------------------------------------------------------------------
// Legacy tab / subTab ID constants
// ---------------------------------------------------------------------------

// Document left tabs
const DOC_TAB_VISUALIZE = 'visualize';
const DOC_TAB_INSIGHTS = 'insights';
const DOC_TAB_INVESTIGATION = 'investigation';
const DOC_TAB_RESPONSE = 'response';
const DOC_TAB_NOTES = 'notes';

// Visualize subTabs
const VIZ_SUBTAB_SESSION_VIEW = 'session-view';
const VIZ_SUBTAB_GRAPH = 'graph-visualization';
// 'analyze_graph' → analyzer (default fallback)

// Insights subTabs
const INSIGHTS_SUBTAB_THREAT_INTEL = 'threatIntelligence';
const INSIGHTS_SUBTAB_PREVALENCE = 'prevalence';
const INSIGHTS_SUBTAB_CORRELATIONS = 'correlations';

// Attack left tabs
const ATTACK_TAB_INSIGHTS = 'insights';
const ATTACK_TAB_NOTES = 'notes';

// Attack insights subTabs
const ATTACK_SUBTAB_CORRELATION = 'correlation';

// Entity left panel tabs (EntityDetailsLeftPanelTab enum values)
const ENTITY_TAB_RISK_INPUTS = 'risk_inputs';
const ENTITY_TAB_ANOMALIES = 'anomalies';
const ENTITY_TAB_OKTA = 'okta_document';
const ENTITY_TAB_ENTRA = 'entra_document';
const ENTITY_TAB_CSP_INSIGHTS = 'csp_insights';
const ENTITY_TAB_FIELDS_TABLE = 'fields_table';
const ENTITY_TAB_GRAPH_VIEW = 'graph_view';
const ENTITY_TAB_RESOLUTION_GROUP = 'resolution_group';

// CSP insights subTabs (CspInsightLeftPanelSubTab enum values)
const CSP_SUBTAB_VULNERABILITIES = 'vulnerabilitiesTabId';
const CSP_SUBTAB_ALERTS = 'alertsTabId';

// ---------------------------------------------------------------------------
// Descriptor kinds that need async data fetching
// ---------------------------------------------------------------------------

const NEEDS_DOC_HIT = new Set([
  'analyzer',
  'sessionView',
  'documentEntities',
  'documentCorrelations',
  'documentPrevalence',
  'documentResponse',
  'documentThreatIntelligence',
  'documentInvestigationGuide',
  'documentGraph',
  'notes',
]);

const NEEDS_ATTACK_HIT = new Set(['attackCorrelations', 'attackEntities']);

// ---------------------------------------------------------------------------
// Legacy rison shape
// ---------------------------------------------------------------------------

interface LegacyPanel {
  id: string;
  params?: Record<string, unknown>;
  path?: { tab?: string; subTab?: string };
}

interface LegacyFlyoutState {
  right?: LegacyPanel;
  left?: LegacyPanel;
  preview?: LegacyPanel[];
}

// ---------------------------------------------------------------------------
// Decode legacy rison param
// ---------------------------------------------------------------------------

const decodeLegacyFlyoutParam = (raw: string | null | undefined): LegacyFlyoutState | null => {
  if (!raw) return null;
  try {
    const decoded = decode(raw);
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return null;
    return decoded as LegacyFlyoutState;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Translation helpers
// ---------------------------------------------------------------------------

/** Translate a legacy right/preview panel to the matching v2 main flyout descriptor. */
const rightPanelToMainDescriptor = (panel: LegacyPanel): FlyoutDescriptor | null => {
  const { id, params = {} } = panel;

  switch (id) {
    case DOCUMENT_DETAILS_RIGHT:
    case 'document-details-preview': {
      const documentId = params.id as string | undefined;
      const indexName = params.indexName as string | undefined;
      if (!documentId || !indexName) return null;
      return { kind: 'document', documentId, indexName };
    }

    case ATTACK_DETAILS_RIGHT:
    case 'attack-details-preview': {
      const attackId = params.attackId as string | undefined;
      const indexName = params.indexName as string | undefined;
      if (!attackId || !indexName) return null;
      return { kind: 'attack', attackId, indexName };
    }

    case HOST_PANEL: {
      const hostName = params.hostName as string | undefined;
      if (!hostName) return null;
      return {
        kind: 'host',
        hostName,
        entityId: params.entityId as string | undefined,
        scopeId: params.scopeId as string | undefined,
      };
    }

    case USER_PANEL: {
      const userName = params.userName as string | undefined;
      if (!userName) return null;
      return {
        kind: 'user',
        userName,
        entityId: params.entityId as string | undefined,
        scopeId: params.scopeId as string | undefined,
      };
    }

    case SERVICE_PANEL: {
      const serviceName = params.serviceName as string | undefined;
      if (!serviceName) return null;
      return {
        kind: 'service',
        serviceName,
        entityId: params.entityId as string | undefined,
        scopeId: params.scopeId as string | undefined,
      };
    }

    case GENERIC_ENTITY_PANEL: {
      const scopeId = params.scopeId as string | undefined;
      if (!scopeId) return null;
      return {
        kind: 'genericEntity',
        scopeId,
        entityId: params.entityId as string | undefined,
        entityDocId: params.entityDocId as string | undefined,
      };
    }

    case NETWORK_PANEL: {
      const ip = params.ip as string | undefined;
      const flowTarget = params.flowTarget as string | undefined;
      if (!ip || !flowTarget) return null;
      return { kind: 'network', ip, flowTarget };
    }

    case RULE_PANEL: {
      const ruleId = params.ruleId as string | undefined;
      if (!ruleId) return null;
      return { kind: 'rule', ruleId };
    }

    case IOC_RIGHT_PANEL: {
      // Legacy IOC params only stored { id } without the index — cannot interop.
      // eslint-disable-next-line no-console
      console.warn(
        '[flyout-v2-interop] IOC legacy URL: indicatorIndex not stored in legacy params, cannot translate.'
      );
      return null;
    }

    case MISCONFIGURATION_FINDINGS_PANEL: {
      const resourceId = params.resourceId as string | undefined;
      const ruleId = params.ruleId as string | undefined;
      if (!resourceId || !ruleId) return null;
      return { kind: 'cspMisconfiguration', resourceId, ruleId };
    }

    case VULNERABILITY_FINDINGS_PANEL: {
      return {
        kind: 'cspVulnerability',
        vulnerabilityId: params.vulnerabilityId as string | string[] | undefined,
        resourceId: params.resourceId as string | undefined,
        packageName: params.packageName as string | string[] | undefined,
        packageVersion: params.packageVersion as string | string[] | undefined,
        eventId: params.eventId as string | undefined,
      };
    }

    default:
      // eslint-disable-next-line no-console
      console.warn(`[flyout-v2-interop] Unknown right panel id "${id}", skipping.`);
      return null;
  }
};

/** Translate a legacy document-details-left panel to the matching v2 tool descriptor. */
const docLeftToToolDescriptor = (
  left: LegacyPanel,
  rightParams: Record<string, unknown>
): FlyoutDescriptor | null => {
  const tab = left.path?.tab;
  const subTab = left.path?.subTab;
  const documentId = rightParams.id as string | undefined;
  const indexName = rightParams.indexName as string | undefined;
  const scopeId = rightParams.scopeId as string | undefined;

  if (!documentId || !indexName) return null;

  switch (tab) {
    case DOC_TAB_VISUALIZE:
      if (subTab === VIZ_SUBTAB_SESSION_VIEW) return { kind: 'sessionView', documentId, indexName };
      if (subTab === VIZ_SUBTAB_GRAPH) return { kind: 'documentGraph', documentId, indexName };
      // 'analyze_graph' or no subTab → analyzer
      return { kind: 'analyzer', documentId, indexName };

    case DOC_TAB_INSIGHTS:
      if (subTab === INSIGHTS_SUBTAB_THREAT_INTEL)
        return { kind: 'documentThreatIntelligence', documentId, indexName };
      if (subTab === INSIGHTS_SUBTAB_PREVALENCE)
        return {
          kind: 'documentPrevalence',
          documentId,
          indexName,
          scopeId: scopeId ?? '',
          investigationFields: [],
        };
      if (subTab === INSIGHTS_SUBTAB_CORRELATIONS)
        return {
          kind: 'documentCorrelations',
          documentId,
          indexName,
          scopeId: scopeId ?? '',
          isRulePreview: false,
        };
      // 'entity' or no subTab → entities
      return { kind: 'documentEntities', documentId, indexName, scopeId };

    case DOC_TAB_INVESTIGATION:
      return { kind: 'documentInvestigationGuide', documentId, indexName };

    case DOC_TAB_RESPONSE:
      return { kind: 'documentResponse', documentId, indexName };

    case DOC_TAB_NOTES:
      return { kind: 'notes', documentId, indexName };

    default:
      // eslint-disable-next-line no-console
      console.warn(`[flyout-v2-interop] Unknown document left tab "${tab}", skipping tool.`);
      return null;
  }
};

/** Translate a legacy attack-details-left panel to the matching v2 tool descriptor. */
const attackLeftToToolDescriptor = (
  left: LegacyPanel,
  rightParams: Record<string, unknown>
): FlyoutDescriptor | null => {
  const tab = left.path?.tab;
  const subTab = left.path?.subTab;
  const attackId = rightParams.attackId as string | undefined;
  const indexName = rightParams.indexName as string | undefined;

  if (!attackId || !indexName) return null;

  switch (tab) {
    case ATTACK_TAB_INSIGHTS:
      if (subTab === ATTACK_SUBTAB_CORRELATION)
        return { kind: 'attackCorrelations', attackId, indexName, alertIds: [] };
      // 'entity' or no subTab → entities
      return { kind: 'attackEntities', attackId, indexName, alertIds: [] };

    case ATTACK_TAB_NOTES:
      // Notes for attack: best-effort — use documentId=attackId
      return { kind: 'notes', documentId: attackId, indexName };

    default:
      // eslint-disable-next-line no-console
      console.warn(`[flyout-v2-interop] Unknown attack left tab "${tab}", skipping tool.`);
      return null;
  }
};

/** Translate a legacy entity-details-left panel to the matching v2 entity tool descriptor. */
const entityLeftToToolDescriptor = (
  left: LegacyPanel,
  entityType: string,
  entityName: string,
  entityId: string | undefined,
  scopeId: string | undefined
): FlyoutDescriptor | null => {
  const tab = left.path?.tab;
  const subTab = left.path?.subTab;

  switch (tab) {
    case ENTITY_TAB_RISK_INPUTS:
      return { kind: 'entityRiskInputs', entityType, entityName, entityId };

    case ENTITY_TAB_ANOMALIES:
      return { kind: 'entityAnomalyInsights', entityType, value: entityName, entityId };

    case ENTITY_TAB_CSP_INSIGHTS:
      if (subTab === CSP_SUBTAB_VULNERABILITIES)
        return { kind: 'entityVulnerabilityInsights', value: entityName, entityId, entityType };
      if (subTab === CSP_SUBTAB_ALERTS)
        return { kind: 'entityAlertsInsights', entityType, value: entityName, entityId };
      // 'misconfigurationTabId' or no subTab
      return { kind: 'entityMisconfigurationInsights', entityType, value: entityName, entityId };

    case ENTITY_TAB_GRAPH_VIEW:
      if (!entityId || !scopeId) {
        // eslint-disable-next-line no-console
        console.warn('[flyout-v2-interop] entityGraphView needs entityId + scopeId, falling back.');
        return null;
      }
      return { kind: 'entityGraphView', entityId, scopeId, entityName };

    case ENTITY_TAB_RESOLUTION_GROUP:
      if (!entityId || !scopeId) {
        // eslint-disable-next-line no-console
        console.warn(
          '[flyout-v2-interop] entityResolution needs entityId + scopeId, falling back.'
        );
        return null;
      }
      return { kind: 'entityResolution', entityId, entityType, entityName, scopeId };

    case ENTITY_TAB_OKTA:
    case ENTITY_TAB_ENTRA:
      // managedUserId/managedUserIndex not stored in legacy params — cannot reconstruct.
      // eslint-disable-next-line no-console
      console.warn(
        `[flyout-v2-interop] Entity tab "${tab}" requires managed user data not in legacy URL, falling back.`
      );
      return null;

    case ENTITY_TAB_FIELDS_TABLE:
      // Not restorable (document source is not URL-serializable).
      return null;

    default:
      // eslint-disable-next-line no-console
      console.warn(`[flyout-v2-interop] Unknown entity left tab "${tab}", falling back.`);
      return null;
  }
};

/** Dispatch to the appropriate left-panel translator based on the left panel id. */
const leftPanelToToolDescriptor = (
  left: LegacyPanel,
  right: LegacyPanel
): FlyoutDescriptor | null => {
  const rightParams = right.params ?? {};

  switch (left.id) {
    case DOCUMENT_DETAILS_LEFT:
      return docLeftToToolDescriptor(left, rightParams);

    case ATTACK_DETAILS_LEFT:
      return attackLeftToToolDescriptor(left, rightParams);

    case HOST_DETAILS:
      return entityLeftToToolDescriptor(
        left,
        'host',
        (rightParams.hostName as string) ?? '',
        rightParams.entityId as string | undefined,
        rightParams.scopeId as string | undefined
      );

    case USER_DETAILS:
      return entityLeftToToolDescriptor(
        left,
        'user',
        (rightParams.userName as string) ?? '',
        rightParams.entityId as string | undefined,
        rightParams.scopeId as string | undefined
      );

    case SERVICE_DETAILS:
      return entityLeftToToolDescriptor(
        left,
        'service',
        (rightParams.serviceName as string) ?? '',
        rightParams.entityId as string | undefined,
        rightParams.scopeId as string | undefined
      );

    case GENERIC_ENTITY_DETAILS:
      return entityLeftToToolDescriptor(
        left,
        'generic',
        '',
        rightParams.entityId as string | undefined,
        rightParams.scopeId as string | undefined
      );

    default:
      // eslint-disable-next-line no-console
      console.warn(`[flyout-v2-interop] Unknown left panel id "${left.id}", skipping tool.`);
      return null;
  }
};

// ---------------------------------------------------------------------------
// Main translation entry point
// ---------------------------------------------------------------------------

/**
 * Translate a decoded legacy flyout state `{ right, left, preview }` into the equivalent
 * ordered v2 descriptor array (max 2 entries).
 *
 * Returns null when the right panel is unknown or missing required params.
 * Returns a single-entry array when there is no left panel or the flyout type has no tools.
 * Returns a two-entry array [tool, child] when there is a left panel that maps to a tool.
 */
export const translateLegacyStateToDescriptors = (
  state: LegacyFlyoutState
): FlyoutV2UrlParamValue | null => {
  const { right, left, preview } = state;
  if (!right) return null;

  const mainDescriptor = rightPanelToMainDescriptor(right);
  if (!mainDescriptor) return null;

  // No-tools types: collapse right+left to a single main flyout.
  if (NO_TOOLS_PANEL_IDS.has(right.id)) {
    return [mainDescriptor];
  }

  // No left panel: single main flyout.
  if (!left) {
    return [mainDescriptor];
  }

  // Tools types: left → tool descriptor; child = preview (if present) or right.
  const toolDescriptor = leftPanelToToolDescriptor(left, right);

  if (!toolDescriptor) {
    // Unknown / unmappable left panel → open main flyout only.
    return [mainDescriptor];
  }

  // Determine child descriptor.
  // Preview wins over right as the child (it is the deepest thing the user viewed).
  const lastPreview = preview?.at(-1);
  const childDescriptor: FlyoutDescriptor = lastPreview
    ? rightPanelToMainDescriptor(lastPreview) ?? mainDescriptor
    : mainDescriptor;

  return [toolDescriptor, childDescriptor];
};

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * Legacy-URL interop hook. On mount, reads the `flyout` (or `timelineFlyout`) rison URL param;
 * if found while the new flyout is enabled, translates it to the equivalent flyoutV2 open calls,
 * removes the legacy param, and lets the URL writer record the current state as flyoutV2.
 *
 * Only fires when:
 *  - `useIsNewFlyoutEnabled()` is true
 *  - the legacy param is present
 *  - the v2 param is NOT already present (to avoid double-open on already-migrated URLs)
 *
 * Mount this hook in the Security Solution app shell (app/home/index.tsx) BEFORE
 * `useFlyoutV2RestoreFromUrl`, so the legacy param is consumed first.
 *
 * The `eventFlyout` param is intentionally ignored per spec.
 */
export const useLegacyFlyoutUrlInterop = (legacyParamKey: string, v2ParamKey: string): void => {
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const history = useHistory();
  const flyoutApi = useFlyoutApi();
  const hasOpenedRef = useRef(false);

  // Decode the legacy param exactly once (synchronous useState initializer).
  const [legacyState] = useState<LegacyFlyoutState | null>(() => {
    if (!isNewFlyoutEnabled) return null;
    // If v2 param already present, the URL is already migrated — do nothing.
    const searchParams = new URLSearchParams(history.location.search);
    if (searchParams.get(v2ParamKey)) return null;
    const raw = searchParams.get(legacyParamKey);
    return decodeLegacyFlyoutParam(raw);
  });

  // Track whether the raw legacy param was present but malformed.
  const [isMalformedLegacy] = useState<boolean>(() => {
    if (!isNewFlyoutEnabled) return false;
    const searchParams = new URLSearchParams(history.location.search);
    if (searchParams.get(v2ParamKey)) return false;
    const raw = searchParams.get(legacyParamKey);
    return raw != null && decodeLegacyFlyoutParam(raw) === null;
  });

  // Translate legacy state → v2 descriptors (synchronous).
  const descriptors = useMemo(
    () => (legacyState ? translateLegacyStateToDescriptors(legacyState) : null),
    [legacyState]
  );

  // Strip malformed legacy param on mount.
  useEffect(() => {
    if (!isMalformedLegacy) return;
    const params = new URLSearchParams(history.location.search);
    params.delete(legacyParamKey);
    const search = params.toString();
    history.replace({ ...history.location, search: search ? `?${search}` : '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount

  // -----------------------------------------------------------------------
  // Async data fetching (same machinery as useFlyoutV2RestoreFromUrl)
  // -----------------------------------------------------------------------

  const docFetchDescriptor = useMemo(
    () => descriptors?.find((d) => NEEDS_DOC_HIT.has(d.kind)) ?? null,
    [descriptors]
  );

  const attackFetchDescriptor = useMemo(
    () => descriptors?.find((d) => NEEDS_ATTACK_HIT.has(d.kind)) ?? null,
    [descriptors]
  );

  const { dataView, status: dataViewStatus } = useDataView(PageScope.default);
  const dataViewReady = dataViewStatus === 'ready';

  // The attack discovery alerts backing index is not part of the PageScope.default data view's
  // index pattern, so searching for it against that data view (below) finds nothing. The live
  // attack flyout resolves its hit against the dedicated PageScope.attacks data view (see
  // `useAttackDetails`) — use the same one here. See the matching comment in
  // `useFlyoutV2RestoreFromUrl` for the full story.
  const { dataView: attackDataView, status: attackDataViewStatus } = useDataView(PageScope.attacks);
  const attackDataViewReady = attackDataViewStatus === 'ready';

  // Resolve doc/attack hits with the same single-document search the document flyout uses.
  // NOTE: not `useTimelineEventsDetails` — see the comment in `useFlyoutV2RestoreFromUrl`; that
  // search strategy does not resolve a concrete alerts backing index, which broke tool restoration.
  const docEventId = (docFetchDescriptor as { documentId?: string } | null)?.documentId ?? '';
  const docIndexName = (docFetchDescriptor as { indexName?: string } | null)?.indexName ?? '';
  const [docRequestState, docHitRecord] = useEsDocSearch({
    id: docEventId,
    index: docIndexName,
    dataView,
    skip: !docFetchDescriptor || !dataViewReady || !docEventId || !docIndexName,
  });

  const attackEventId = (attackFetchDescriptor as { attackId?: string } | null)?.attackId ?? '';
  const attackIndexName = (attackFetchDescriptor as { indexName?: string } | null)?.indexName ?? '';
  const [attackRequestState, attackHitRecord] = useEsDocSearch({
    id: attackEventId,
    index: attackIndexName,
    dataView: attackDataView,
    skip: !attackFetchDescriptor || !attackDataViewReady || !attackEventId || !attackIndexName,
  });

  // -----------------------------------------------------------------------
  // Open effect
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (hasOpenedRef.current || !descriptors) return;

    if (docFetchDescriptor && !dataViewReady) return;
    if (attackFetchDescriptor && !attackDataViewReady) return;

    // A needed fetch is "settled" once useEsDocSearch resolves: Found WITH a record, or a terminal
    // NotFound/Error state. (Found + null record is the transient pre-fetch state of a skipped search.)
    const isSettled = (
      hasDescriptor: boolean,
      state: ElasticRequestState,
      record: DataTableRecord | null
    ): boolean =>
      !hasDescriptor ||
      (state === ElasticRequestState.Found && !!record) ||
      state === ElasticRequestState.NotFound ||
      state === ElasticRequestState.Error ||
      state === ElasticRequestState.NotFoundDataView;

    if (!isSettled(!!docFetchDescriptor, docRequestState, docHitRecord)) return;
    if (!isSettled(!!attackFetchDescriptor, attackRequestState, attackHitRecord)) return;

    hasOpenedRef.current = true;

    const docHit: DataTableRecord | undefined = docHitRecord ?? undefined;
    const attackHit: DataTableRecord | undefined = attackHitRecord ?? undefined;

    const ctx = { docHit, attackHit };
    const [first, second] = descriptors;

    // Remove the legacy param from the URL before opening (so the URL writer,
    // triggered by writeOnOpen inside open*, reads a clean URL when it appends flyoutV2).
    const searchParams = new URLSearchParams(history.location.search);
    searchParams.delete(legacyParamKey);
    const newSearch = searchParams.toString();
    history.replace({ ...history.location, search: newSearch ? `?${newSearch}` : '' });

    // Open in the next macrotask to avoid z-index ordering races (same guard as restore hook).
    setTimeout(() => {
      openDescriptorAsStart(first, ctx, flyoutApi);
      if (second) {
        openDescriptorAsChild(second, ctx, flyoutApi);
      }
    }, 0);
  }, [
    descriptors,
    docFetchDescriptor,
    attackFetchDescriptor,
    dataViewReady,
    attackDataViewReady,
    docRequestState,
    docHitRecord,
    attackRequestState,
    attackHitRecord,
    flyoutApi,
    history,
    legacyParamKey,
  ]);
};
