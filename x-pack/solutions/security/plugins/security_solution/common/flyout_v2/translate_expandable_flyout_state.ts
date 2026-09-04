/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode } from '@kbn/rison';

/**
 * Pure legacy expandable-flyout → flyout-v2 descriptor translation.
 * Shared by the browser URL interop hook and server-side Agent Builder redirect URLs.
 */

/** Structural flyout-v2 descriptor (kind + kind-specific fields). */
type TranslatedFlyoutDescriptor = { kind: string } & Record<string, unknown>;

/** Ordered array of up to 2 descriptors for the flyoutV2 URL param. */
type TranslatedFlyoutV2State = TranslatedFlyoutDescriptor[];

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
// Legacy rison shape
// ---------------------------------------------------------------------------

export interface LegacyFlyoutPanel {
  id: string;
  params?: Record<string, unknown>;
  path?: { tab?: string; subTab?: string };
}

export interface LegacyFlyoutState {
  right?: LegacyFlyoutPanel;
  left?: LegacyFlyoutPanel;
  preview?: LegacyFlyoutPanel[];
}

// ---------------------------------------------------------------------------
// Decode legacy rison param
// ---------------------------------------------------------------------------

export const decodeLegacyFlyoutParam = (
  raw: string | null | undefined
): LegacyFlyoutState | null => {
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
const rightPanelToMainDescriptor = (
  panel: LegacyFlyoutPanel
): TranslatedFlyoutDescriptor | null => {
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
  left: LegacyFlyoutPanel,
  rightParams: Record<string, unknown>
): TranslatedFlyoutDescriptor | null => {
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
  left: LegacyFlyoutPanel,
  rightParams: Record<string, unknown>
): TranslatedFlyoutDescriptor | null => {
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
  left: LegacyFlyoutPanel,
  entityType: string,
  entityName: string,
  entityId: string | undefined,
  scopeId: string | undefined
): TranslatedFlyoutDescriptor | null => {
  // Entity panels serialize tab state in params.path; document/attack use panel-root path.
  const pathFromParams = left.params?.path as { tab?: string; subTab?: string } | undefined;
  const tab = left.path?.tab ?? pathFromParams?.tab;
  const subTab = left.path?.subTab ?? pathFromParams?.subTab;

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
  left: LegacyFlyoutPanel,
  right: LegacyFlyoutPanel
): TranslatedFlyoutDescriptor | null => {
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
): TranslatedFlyoutV2State | null => {
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
  const childDescriptor: TranslatedFlyoutDescriptor = lastPreview
    ? rightPanelToMainDescriptor(lastPreview) ?? mainDescriptor
    : mainDescriptor;

  return [toolDescriptor, childDescriptor];
};
