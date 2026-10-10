/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';

/**
 * Single source of truth for the flyout descriptors carried by the `flyoutV2` URL param and by the
 * Discover doc viewer's shareable state. The descriptor types in `flyout_v2_url_param.ts` are
 * inferred from these schemas, so the URL format and the validator cannot drift apart.
 *
 * Descriptors only hold identifying strings (or string arrays), so every string is bounded.
 */

const MAX_STRING_LENGTH = 1024;
const MAX_ARRAY_SIZE = 100;

const str = z.string().max(MAX_STRING_LENGTH);
const strArray = z.array(str).max(MAX_ARRAY_SIZE);

// --- Document ---

export const documentDescriptorSchema = z.object({
  kind: z.literal('document'),
  documentId: str,
  indexName: str,
});

export const documentFromPatternDescriptorSchema = z.object({
  kind: z.literal('documentFromPattern'),
  documentId: str,
  /** Index pattern (possibly comma-separated or wildcard) that resolves the document. */
  indexName: str,
});

// --- Document tools ---
// All document tools identify the source document by {documentId, indexName} extracted
// from hit.raw._id / hit.raw._index at capture time.

export const analyzerDescriptorSchema = z.object({
  kind: z.literal('analyzer'),
  documentId: str,
  indexName: str,
});

export const sessionViewDescriptorSchema = z.object({
  kind: z.literal('sessionView'),
  documentId: str,
  indexName: str,
  jumpToCursor: str.optional(),
  jumpToEntityId: str.optional(),
});

export const documentEntitiesDescriptorSchema = z.object({
  kind: z.literal('documentEntities'),
  documentId: str,
  indexName: str,
  scopeId: str.optional(),
});

export const documentCorrelationsDescriptorSchema = z.object({
  kind: z.literal('documentCorrelations'),
  documentId: str,
  indexName: str,
  scopeId: str,
});

export const documentPrevalenceDescriptorSchema = z.object({
  kind: z.literal('documentPrevalence'),
  documentId: str,
  indexName: str,
  scopeId: str,
  investigationFields: strArray,
});

export const documentResponseDescriptorSchema = z.object({
  kind: z.literal('documentResponse'),
  documentId: str,
  indexName: str,
});

export const documentThreatIntelligenceDescriptorSchema = z.object({
  kind: z.literal('documentThreatIntelligence'),
  documentId: str,
  indexName: str,
});

export const documentInvestigationGuideDescriptorSchema = z.object({
  kind: z.literal('documentInvestigationGuide'),
  documentId: str,
  indexName: str,
});

export const documentGraphDescriptorSchema = z.object({
  kind: z.literal('documentGraph'),
  documentId: str,
  indexName: str,
});

export const notesDescriptorSchema = z.object({
  kind: z.literal('notes'),
  documentId: str,
  indexName: str,
});

// --- Attack ---

export const attackDescriptorSchema = z.object({
  kind: z.literal('attack'),
  attackId: str,
  indexName: str,
});

export const attackCorrelationsDescriptorSchema = z.object({
  kind: z.literal('attackCorrelations'),
  attackId: str,
  indexName: str,
  alertIds: strArray,
});

export const attackEntitiesDescriptorSchema = z.object({
  kind: z.literal('attackEntities'),
  attackId: str,
  indexName: str,
  alertIds: strArray,
});

// --- Entity main flyouts ---

export const hostDescriptorSchema = z.object({
  kind: z.literal('host'),
  hostName: str,
  entityId: str.optional(),
  scopeId: str.optional(),
});

export const userDescriptorSchema = z.object({
  kind: z.literal('user'),
  userName: str,
  entityId: str.optional(),
  scopeId: str.optional(),
});

export const serviceDescriptorSchema = z.object({
  kind: z.literal('service'),
  serviceName: str,
  entityId: str.optional(),
  scopeId: str.optional(),
});

export const genericEntityDescriptorSchema = z.object({
  kind: z.literal('genericEntity'),
  scopeId: str,
  /** Canonical Entity Store v2 id (`entity.id`). Either entityDocId or entityId must be set. */
  entityId: str.optional(),
  /** Raw document `_id` of the asset-inventory record. */
  entityDocId: str.optional(),
});

// --- Entity tools ---
// EntityType enum values are stored as plain strings.
// Restorers must cast back: `entityType as EntityType`.

export const entityRiskInputsDescriptorSchema = z.object({
  kind: z.literal('entityRiskInputs'),
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: str,
  entityName: str,
  entityId: str.optional(),
  subTab: str.optional(),
});

export const entityAnomalyInsightsDescriptorSchema = z.object({
  kind: z.literal('entityAnomalyInsights'),
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: str,
  value: str,
  entityId: str.optional(),
});

export const entityAlertsInsightsDescriptorSchema = z.object({
  kind: z.literal('entityAlertsInsights'),
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: str,
  value: str,
  entityId: str.optional(),
});

export const entityMisconfigurationInsightsDescriptorSchema = z.object({
  kind: z.literal('entityMisconfigurationInsights'),
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: str,
  value: str,
  entityId: str.optional(),
});

export const entityVulnerabilityInsightsDescriptorSchema = z.object({
  kind: z.literal('entityVulnerabilityInsights'),
  value: str,
  entityId: str.optional(),
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: str.optional(),
});

export const entityGraphViewDescriptorSchema = z.object({
  kind: z.literal('entityGraphView'),
  entityId: str,
  scopeId: str,
  entityName: str,
  /**
   * EntityType of the originating entity, stored as a plain string. Used on restore to rebuild the
   * header's "show entity" action so the entity name/icon reappear after a refresh. Optional for
   * backward compatibility with URLs encoded before this field existed.
   */
  entityType: str.optional(),
});

export const entityResolutionDescriptorSchema = z.object({
  kind: z.literal('entityResolution'),
  entityId: str,
  /** EntityType stored as plain string. Cast back to EntityType on restore. */
  entityType: str,
  entityName: str,
  scopeId: str,
});

/**
 * Stores the identifying parts of the ManagedUserHit (`_id` / `_index`) for Entra Insights.
 * The restorer rebuilds the ManagedUserHit from these two fields.
 */
export const entityEntraInsightsDescriptorSchema = z.object({
  kind: z.literal('entityEntraInsights'),
  managedUserId: str,
  managedUserIndex: str,
  value: str,
});

/**
 * Stores the identifying parts of the ManagedUserHit (`_id` / `_index`) for Okta Insights.
 * The restorer rebuilds the ManagedUserHit from these two fields.
 */
export const entityOktaInsightsDescriptorSchema = z.object({
  kind: z.literal('entityOktaInsights'),
  managedUserId: str,
  managedUserIndex: str,
  value: str,
});

// --- Network / Rule / IOC / CSP ---

/**
 * FlowTargetSourceDest enum values are stored as plain strings.
 * Restorers must cast back: `flowTarget as FlowTargetSourceDest`.
 */
export const networkDescriptorSchema = z.object({
  kind: z.literal('network'),
  ip: str,
  flowTarget: str,
});

export const ruleDescriptorSchema = z.object({
  kind: z.literal('rule'),
  ruleId: str,
});

/** IOC descriptor stores the indicator's `_id` and `_index` so the restorer can re-fetch it. */
export const iocDescriptorSchema = z.object({
  kind: z.literal('ioc'),
  indicatorId: str,
  indicatorIndex: str,
});

export const cspMisconfigurationDescriptorSchema = z.object({
  kind: z.literal('cspMisconfiguration'),
  resourceId: str,
  ruleId: str,
});

export const cspVulnerabilityDescriptorSchema = z.object({
  kind: z.literal('cspVulnerability'),
  vulnerabilityId: z.union([str, strArray]).optional(),
  resourceId: str.optional(),
  packageName: z.union([str, strArray]).optional(),
  packageVersion: z.union([str, strArray]).optional(),
  eventId: str.optional(),
});

/** UI trigger to attribute when a descriptor is restored from URL state. */
const originShape = { origin: z.enum(FLYOUT_ORIGIN).optional() };

export const flyoutDescriptorSchema = z.discriminatedUnion('kind', [
  documentDescriptorSchema.extend(originShape),
  documentFromPatternDescriptorSchema.extend(originShape),
  analyzerDescriptorSchema.extend(originShape),
  sessionViewDescriptorSchema.extend(originShape),
  documentEntitiesDescriptorSchema.extend(originShape),
  documentCorrelationsDescriptorSchema.extend(originShape),
  documentPrevalenceDescriptorSchema.extend(originShape),
  documentResponseDescriptorSchema.extend(originShape),
  documentThreatIntelligenceDescriptorSchema.extend(originShape),
  documentInvestigationGuideDescriptorSchema.extend(originShape),
  documentGraphDescriptorSchema.extend(originShape),
  notesDescriptorSchema.extend(originShape),
  attackDescriptorSchema.extend(originShape),
  attackCorrelationsDescriptorSchema.extend(originShape),
  attackEntitiesDescriptorSchema.extend(originShape),
  hostDescriptorSchema.extend(originShape),
  userDescriptorSchema.extend(originShape),
  serviceDescriptorSchema.extend(originShape),
  genericEntityDescriptorSchema.extend(originShape),
  entityRiskInputsDescriptorSchema.extend(originShape),
  entityAnomalyInsightsDescriptorSchema.extend(originShape),
  entityAlertsInsightsDescriptorSchema.extend(originShape),
  entityMisconfigurationInsightsDescriptorSchema.extend(originShape),
  entityVulnerabilityInsightsDescriptorSchema.extend(originShape),
  entityGraphViewDescriptorSchema.extend(originShape),
  entityResolutionDescriptorSchema.extend(originShape),
  entityEntraInsightsDescriptorSchema.extend(originShape),
  entityOktaInsightsDescriptorSchema.extend(originShape),
  networkDescriptorSchema.extend(originShape),
  ruleDescriptorSchema.extend(originShape),
  iocDescriptorSchema.extend(originShape),
  cspMisconfigurationDescriptorSchema.extend(originShape),
  cspVulnerabilityDescriptorSchema.extend(originShape),
]);

/** The open flyout chain: a root descriptor and an optional child. */
export const flyoutChainSchema = z.array(flyoutDescriptorSchema).min(1).max(2);
