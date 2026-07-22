/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode, encode } from '@kbn/rison';
import { timelineFlyoutHistoryKey } from '../constants/flyout_history';

/**
 * URL parameter that carries the currently-open flyout chain for the page (non-Timeline) context.
 * The value is a rison-encoded ordered array of up to 2 {@link FlyoutDescriptor} entries.
 *
 * Separate from the legacy `flyout` param (expandable-flyout) and the pre-existing
 * `attackFlyoutV2` param (auto-open on the Attacks page). Do NOT unify with those.
 */
export const FLYOUT_V2_URL_PARAM = 'flyoutV2' as const;

/**
 * URL parameter for the Timeline flyout context (second instantiation of the sync layer).
 * Same shape as {@link FLYOUT_V2_URL_PARAM}; keyed separately so page and Timeline restore
 * independently.
 */
export const FLYOUT_V2_TIMELINE_URL_PARAM = 'flyoutV2Timeline' as const;

/**
 * Maps a runtime `historyKey` (from `useFlyoutSessionContext`) to the appropriate URL param key.
 * Timeline-context flyouts write to `flyoutV2Timeline`; all others write to `flyoutV2`.
 */
export const urlParamKeyForHistoryKey = (
  historyKey: symbol
): typeof FLYOUT_V2_URL_PARAM | typeof FLYOUT_V2_TIMELINE_URL_PARAM =>
  historyKey === timelineFlyoutHistoryKey ? FLYOUT_V2_TIMELINE_URL_PARAM : FLYOUT_V2_URL_PARAM;

// ---------------------------------------------------------------------------
// Kind constants
// ---------------------------------------------------------------------------

export const FLYOUT_DESCRIPTOR_KIND = {
  // Document main flyouts
  document: 'document',
  documentFromPattern: 'documentFromPattern',
  // Document tools
  analyzer: 'analyzer',
  sessionView: 'sessionView',
  documentEntities: 'documentEntities',
  documentCorrelations: 'documentCorrelations',
  documentPrevalence: 'documentPrevalence',
  documentResponse: 'documentResponse',
  documentThreatIntelligence: 'documentThreatIntelligence',
  documentInvestigationGuide: 'documentInvestigationGuide',
  documentGraph: 'documentGraph',
  notes: 'notes',
  // Attack main flyout + tools
  attack: 'attack',
  attackCorrelations: 'attackCorrelations',
  attackEntities: 'attackEntities',
  // Entity main flyouts
  host: 'host',
  user: 'user',
  service: 'service',
  genericEntity: 'genericEntity',
  // Entity tools
  entityRiskInputs: 'entityRiskInputs',
  entityAnomalyInsights: 'entityAnomalyInsights',
  entityAlertsInsights: 'entityAlertsInsights',
  entityMisconfigurationInsights: 'entityMisconfigurationInsights',
  entityVulnerabilityInsights: 'entityVulnerabilityInsights',
  entityGraphView: 'entityGraphView',
  entityResolution: 'entityResolution',
  entityEntraInsights: 'entityEntraInsights',
  entityOktaInsights: 'entityOktaInsights',
  // NOTE: 'entityFieldsTable' is intentionally omitted — its `document: Record<string, unknown>`
  // prop is a full flattened entity document that is not cheaply URL-serializable. Restorers
  // for this kind would open the parent entity main flyout instead.
  // Network / Rule / IOC / CSP
  network: 'network',
  rule: 'rule',
  ioc: 'ioc',
  cspMisconfiguration: 'cspMisconfiguration',
  cspVulnerability: 'cspVulnerability',
} as const;

export type FlyoutDescriptorKind =
  (typeof FLYOUT_DESCRIPTOR_KIND)[keyof typeof FLYOUT_DESCRIPTOR_KIND];

// ---------------------------------------------------------------------------
// Per-kind descriptor params
// ---------------------------------------------------------------------------

// --- Document ---

export interface DocumentDescriptor {
  kind: 'document';
  documentId: string;
  indexName: string;
}

export interface DocumentFromPatternDescriptor {
  kind: 'documentFromPattern';
  documentId: string;
  /** Index pattern (possibly comma-separated or wildcard) that resolves the document. */
  indexName: string;
}

// --- Document tools ---
// All document tools identify the source document by {documentId, indexName} extracted
// from hit.raw._id / hit.raw._index at capture time.

export interface AnalyzerDescriptor {
  kind: 'analyzer';
  documentId: string;
  indexName: string;
}

export interface SessionViewDescriptor {
  kind: 'sessionView';
  documentId: string;
  indexName: string;
  jumpToCursor?: string;
  jumpToEntityId?: string;
}

export interface DocumentEntitiesDescriptor {
  kind: 'documentEntities';
  documentId: string;
  indexName: string;
  scopeId?: string;
}

export interface DocumentCorrelationsDescriptor {
  kind: 'documentCorrelations';
  documentId: string;
  indexName: string;
  scopeId: string;
  isRulePreview: boolean;
}

export interface DocumentPrevalenceDescriptor {
  kind: 'documentPrevalence';
  documentId: string;
  indexName: string;
  scopeId: string;
  investigationFields: string[];
}

export interface DocumentResponseDescriptor {
  kind: 'documentResponse';
  documentId: string;
  indexName: string;
}

export interface DocumentThreatIntelligenceDescriptor {
  kind: 'documentThreatIntelligence';
  documentId: string;
  indexName: string;
}

export interface DocumentInvestigationGuideDescriptor {
  kind: 'documentInvestigationGuide';
  documentId: string;
  indexName: string;
}

export interface DocumentGraphDescriptor {
  kind: 'documentGraph';
  documentId: string;
  indexName: string;
}

export interface NotesDescriptor {
  kind: 'notes';
  documentId: string;
  indexName: string;
}

// --- Attack ---

export interface AttackDescriptor {
  kind: 'attack';
  attackId: string;
  indexName: string;
}

export interface AttackCorrelationsDescriptor {
  kind: 'attackCorrelations';
  attackId: string;
  indexName: string;
  alertIds: string[];
}

export interface AttackEntitiesDescriptor {
  kind: 'attackEntities';
  attackId: string;
  indexName: string;
  alertIds: string[];
}

// --- Entity main flyouts ---

export interface HostDescriptor {
  kind: 'host';
  hostName: string;
  entityId?: string;
  scopeId?: string;
}

export interface UserDescriptor {
  kind: 'user';
  userName: string;
  entityId?: string;
  scopeId?: string;
}

export interface ServiceDescriptor {
  kind: 'service';
  serviceName: string;
  entityId?: string;
  scopeId?: string;
}

export interface GenericEntityDescriptor {
  kind: 'genericEntity';
  scopeId: string;
  /** Canonical Entity Store v2 id (`entity.id`). Either entityDocId or entityId must be set. */
  entityId?: string;
  /** Raw document `_id` of the asset-inventory record. */
  entityDocId?: string;
}

// --- Entity tools ---
// EntityType enum values are stored as plain strings.
// Restorers must cast back: `entityType as EntityType`.

export interface EntityRiskInputsDescriptor {
  kind: 'entityRiskInputs';
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: string;
  entityName: string;
  entityId?: string;
}

export interface EntityAnomalyInsightsDescriptor {
  kind: 'entityAnomalyInsights';
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: string;
  value: string;
  entityId?: string;
}

export interface EntityAlertsInsightsDescriptor {
  kind: 'entityAlertsInsights';
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: string;
  value: string;
  entityId?: string;
}

export interface EntityMisconfigurationInsightsDescriptor {
  kind: 'entityMisconfigurationInsights';
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: string;
  value: string;
  entityId?: string;
}

export interface EntityVulnerabilityInsightsDescriptor {
  kind: 'entityVulnerabilityInsights';
  value: string;
  entityId?: string;
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType?: string;
}

export interface EntityGraphViewDescriptor {
  kind: 'entityGraphView';
  entityId: string;
  scopeId: string;
  entityName: string;
  /**
   * EntityType of the originating entity, stored as a plain string. Used on restore to rebuild the
   * header's "show entity" action so the entity name/icon reappear after a refresh. Optional for
   * backward compatibility with URLs encoded before this field existed.
   */
  entityType?: string;
}

export interface EntityResolutionDescriptor {
  kind: 'entityResolution';
  entityId: string;
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: string;
  entityName: string;
  scopeId: string;
}

/**
 * Stores the identifying parts of the ManagedUserHit (`_id` / `_index`) for Entra Insights.
 * The restorer rebuilds the ManagedUserHit from these two fields.
 */
export interface EntityEntraInsightsDescriptor {
  kind: 'entityEntraInsights';
  managedUserId: string;
  managedUserIndex: string;
  value: string;
}

/**
 * Stores the identifying parts of the ManagedUserHit (`_id` / `_index`) for Okta Insights.
 * The restorer rebuilds the ManagedUserHit from these two fields.
 */
export interface EntityOktaInsightsDescriptor {
  kind: 'entityOktaInsights';
  managedUserId: string;
  managedUserIndex: string;
  value: string;
}

// --- Network / Rule / IOC / CSP ---

/**
 * FlowTargetSourceDest enum values are stored as plain strings.
 * Restorers must cast back: `flowTarget as FlowTargetSourceDest`.
 */
export interface NetworkDescriptor {
  kind: 'network';
  ip: string;
  flowTarget: string;
}

export interface RuleDescriptor {
  kind: 'rule';
  ruleId: string;
}

/**
 * IOC descriptor stores the indicator's `_id` and `_index` so the restorer can re-fetch it.
 */
export interface IocDescriptor {
  kind: 'ioc';
  indicatorId: string;
  indicatorIndex: string;
}

export interface CspMisconfigurationDescriptor {
  kind: 'cspMisconfiguration';
  resourceId: string;
  ruleId: string;
}

export interface CspVulnerabilityDescriptor {
  kind: 'cspVulnerability';
  vulnerabilityId?: string | string[];
  resourceId?: string;
  packageName?: string | string[];
  packageVersion?: string | string[];
  eventId?: string;
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type FlyoutDescriptor =
  | DocumentDescriptor
  | DocumentFromPatternDescriptor
  | AnalyzerDescriptor
  | SessionViewDescriptor
  | DocumentEntitiesDescriptor
  | DocumentCorrelationsDescriptor
  | DocumentPrevalenceDescriptor
  | DocumentResponseDescriptor
  | DocumentThreatIntelligenceDescriptor
  | DocumentInvestigationGuideDescriptor
  | DocumentGraphDescriptor
  | NotesDescriptor
  | AttackDescriptor
  | AttackCorrelationsDescriptor
  | AttackEntitiesDescriptor
  | HostDescriptor
  | UserDescriptor
  | ServiceDescriptor
  | GenericEntityDescriptor
  | EntityRiskInputsDescriptor
  | EntityAnomalyInsightsDescriptor
  | EntityAlertsInsightsDescriptor
  | EntityMisconfigurationInsightsDescriptor
  | EntityVulnerabilityInsightsDescriptor
  | EntityGraphViewDescriptor
  | EntityResolutionDescriptor
  | EntityEntraInsightsDescriptor
  | EntityOktaInsightsDescriptor
  | NetworkDescriptor
  | RuleDescriptor
  | IocDescriptor
  | CspMisconfigurationDescriptor
  | CspVulnerabilityDescriptor;

/** Ordered array of up to 2 descriptors representing the current open flyout chain. */
export type FlyoutV2UrlParamValue = FlyoutDescriptor[];

// ---------------------------------------------------------------------------
// Kind guard (validates the `kind` field is one we know)
// ---------------------------------------------------------------------------

const KNOWN_KINDS = new Set<string>(Object.values(FLYOUT_DESCRIPTOR_KIND));

const isKnownKind = (kind: unknown): kind is FlyoutDescriptorKind =>
  typeof kind === 'string' && KNOWN_KINDS.has(kind);

// ---------------------------------------------------------------------------
// Encode / decode
// ---------------------------------------------------------------------------

export const encodeFlyoutV2UrlParam = (value: FlyoutV2UrlParamValue): string => encode(value);

/**
 * Decodes the value of the flyoutV2 URL parameter.
 * Returns null when the value is missing, malformed, not an array, or contains an entry
 * with an unknown `kind`. Never throws.
 *
 * Mirrors the null-on-malformed pattern of `decodeAttackFlyoutV2UrlParam`.
 */
export const decodeFlyoutV2UrlParam = (
  raw: string | null | undefined
): FlyoutV2UrlParamValue | null => {
  if (!raw) return null;

  try {
    const decoded = decode(raw);

    if (!Array.isArray(decoded) || decoded.length === 0) return null;

    for (const entry of decoded) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      if (!isKnownKind((entry as Record<string, unknown>).kind)) return null;
    }

    return decoded as unknown as FlyoutV2UrlParamValue;
  } catch {
    return null;
  }
};
