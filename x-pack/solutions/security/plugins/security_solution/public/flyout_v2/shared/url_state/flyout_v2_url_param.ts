/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode, encode } from '@kbn/rison';
import type { z } from '@kbn/zod/v4';
import { flyoutChainSchema } from './flyout_descriptor_schema';
import { timelineFlyoutHistoryKey } from '../constants/flyout_history';
import type {
  flyoutDescriptorSchema,
  documentDescriptorSchema,
  documentFromPatternDescriptorSchema,
  analyzerDescriptorSchema,
  sessionViewDescriptorSchema,
  documentEntitiesDescriptorSchema,
  documentCorrelationsDescriptorSchema,
  documentPrevalenceDescriptorSchema,
  documentResponseDescriptorSchema,
  documentThreatIntelligenceDescriptorSchema,
  documentInvestigationGuideDescriptorSchema,
  documentGraphDescriptorSchema,
  notesDescriptorSchema,
  attackDescriptorSchema,
  attackCorrelationsDescriptorSchema,
  attackEntitiesDescriptorSchema,
  hostDescriptorSchema,
  userDescriptorSchema,
  serviceDescriptorSchema,
  genericEntityDescriptorSchema,
  entityRiskInputsDescriptorSchema,
  entityAnomalyInsightsDescriptorSchema,
  entityAlertsInsightsDescriptorSchema,
  entityMisconfigurationInsightsDescriptorSchema,
  entityVulnerabilityInsightsDescriptorSchema,
  entityGraphViewDescriptorSchema,
  entityResolutionDescriptorSchema,
  entityEntraInsightsDescriptorSchema,
  entityOktaInsightsDescriptorSchema,
  networkDescriptorSchema,
  ruleDescriptorSchema,
  iocDescriptorSchema,
  cspMisconfigurationDescriptorSchema,
  cspVulnerabilityDescriptorSchema,
} from './flyout_descriptor_schema';

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
} as const satisfies Record<FlyoutDescriptor['kind'], FlyoutDescriptor['kind']>;

export type FlyoutDescriptorKind =
  (typeof FLYOUT_DESCRIPTOR_KIND)[keyof typeof FLYOUT_DESCRIPTOR_KIND];

// ---------------------------------------------------------------------------
// Per-kind descriptor params
// ---------------------------------------------------------------------------
// Inferred from the zod schemas in `flyout_descriptor_schema.ts`, the single source of truth.

export type DocumentDescriptor = z.infer<typeof documentDescriptorSchema>;
export type DocumentFromPatternDescriptor = z.infer<typeof documentFromPatternDescriptorSchema>;
export type AnalyzerDescriptor = z.infer<typeof analyzerDescriptorSchema>;
export type SessionViewDescriptor = z.infer<typeof sessionViewDescriptorSchema>;
export type DocumentEntitiesDescriptor = z.infer<typeof documentEntitiesDescriptorSchema>;
export type DocumentCorrelationsDescriptor = z.infer<typeof documentCorrelationsDescriptorSchema>;
export type DocumentPrevalenceDescriptor = z.infer<typeof documentPrevalenceDescriptorSchema>;
export type DocumentResponseDescriptor = z.infer<typeof documentResponseDescriptorSchema>;
export type DocumentThreatIntelligenceDescriptor = z.infer<
  typeof documentThreatIntelligenceDescriptorSchema
>;
export type DocumentInvestigationGuideDescriptor = z.infer<
  typeof documentInvestigationGuideDescriptorSchema
>;
export type DocumentGraphDescriptor = z.infer<typeof documentGraphDescriptorSchema>;
export type NotesDescriptor = z.infer<typeof notesDescriptorSchema>;
export type AttackDescriptor = z.infer<typeof attackDescriptorSchema>;
export type AttackCorrelationsDescriptor = z.infer<typeof attackCorrelationsDescriptorSchema>;
export type AttackEntitiesDescriptor = z.infer<typeof attackEntitiesDescriptorSchema>;
export type HostDescriptor = z.infer<typeof hostDescriptorSchema>;
export type UserDescriptor = z.infer<typeof userDescriptorSchema>;
export type ServiceDescriptor = z.infer<typeof serviceDescriptorSchema>;
export type GenericEntityDescriptor = z.infer<typeof genericEntityDescriptorSchema>;
export type EntityRiskInputsDescriptor = z.infer<typeof entityRiskInputsDescriptorSchema>;
export type EntityAnomalyInsightsDescriptor = z.infer<typeof entityAnomalyInsightsDescriptorSchema>;
export type EntityAlertsInsightsDescriptor = z.infer<typeof entityAlertsInsightsDescriptorSchema>;
export type EntityMisconfigurationInsightsDescriptor = z.infer<
  typeof entityMisconfigurationInsightsDescriptorSchema
>;
export type EntityVulnerabilityInsightsDescriptor = z.infer<
  typeof entityVulnerabilityInsightsDescriptorSchema
>;
export type EntityGraphViewDescriptor = z.infer<typeof entityGraphViewDescriptorSchema>;
export type EntityResolutionDescriptor = z.infer<typeof entityResolutionDescriptorSchema>;
export type EntityEntraInsightsDescriptor = z.infer<typeof entityEntraInsightsDescriptorSchema>;
export type EntityOktaInsightsDescriptor = z.infer<typeof entityOktaInsightsDescriptorSchema>;
export type NetworkDescriptor = z.infer<typeof networkDescriptorSchema>;
export type RuleDescriptor = z.infer<typeof ruleDescriptorSchema>;
export type IocDescriptor = z.infer<typeof iocDescriptorSchema>;
export type CspMisconfigurationDescriptor = z.infer<typeof cspMisconfigurationDescriptorSchema>;
export type CspVulnerabilityDescriptor = z.infer<typeof cspVulnerabilityDescriptorSchema>;

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type FlyoutDescriptor = z.infer<typeof flyoutDescriptorSchema>;

/** Ordered array of up to 2 descriptors representing the current open flyout chain. */
export type FlyoutV2UrlParamValue = FlyoutDescriptor[];

// ---------------------------------------------------------------------------
// Kind guard (validates the `kind` field is one we know)
// ---------------------------------------------------------------------------

const KNOWN_KINDS = new Set<string>(Object.values(FLYOUT_DESCRIPTOR_KIND));

const isKnownKind = (kind: unknown): kind is FlyoutDescriptorKind =>
  typeof kind === 'string' && KNOWN_KINDS.has(kind);

/**
 * Narrows a structural descriptor array to the public {@link FlyoutV2UrlParamValue} union.
 * Returns null when the array is empty/missing or any entry has an unknown `kind`.
 */
export const toFlyoutV2UrlParamValue = (
  value: ReadonlyArray<{ kind: string }> | null | undefined
): FlyoutV2UrlParamValue | null => {
  if (!value?.length) return null;

  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || !isKnownKind(entry.kind)) return null;
  }

  return value as FlyoutV2UrlParamValue;
};

// ---------------------------------------------------------------------------
// Encode / decode
// ---------------------------------------------------------------------------

export const encodeFlyoutV2UrlParam = (value: FlyoutV2UrlParamValue): string => encode(value);

/**
 * Decodes the value of the flyoutV2 URL parameter.
 * Returns null when the value is missing, malformed, or fails {@link flyoutChainSchema} (not an
 * array of 1-2 descriptors, an unknown `kind`, or missing/oversized fields). Never throws.
 *
 * Mirrors the null-on-malformed pattern of `decodeAttackFlyoutV2UrlParam`.
 */
export const decodeFlyoutV2UrlParam = (
  raw: string | null | undefined
): FlyoutV2UrlParamValue | null => {
  if (!raw) return null;

  try {
    const result = flyoutChainSchema.safeParse(decode(raw));

    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
