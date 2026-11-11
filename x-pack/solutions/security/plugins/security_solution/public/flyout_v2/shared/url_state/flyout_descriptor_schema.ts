/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
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

const str = lazySchema(() => z.string().max(MAX_STRING_LENGTH));
const strArray = lazySchema(() => z.array(str).max(MAX_ARRAY_SIZE));

/**
 * Entity-store lookup mode persisted for host/user/service flyouts. Only `resolved` is ever written;
 * the default `single` is omitted so existing URLs stay unchanged.
 */
export const entityDescriptorModeSchema = lazySchema(() => z.literal('resolved'));

// --- Document ---

export const documentDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('document'),
    documentId: str,
    indexName: str,
  })
);

export const documentFromPatternDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('documentFromPattern'),
    documentId: str,
    /** Index pattern (possibly comma-separated or wildcard) that resolves the document. */
    indexName: str,
  })
);

// --- Document tools ---
// All document tools identify the source document by {documentId, indexName} extracted
// from hit.raw._id / hit.raw._index at capture time.

export const analyzerDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('analyzer'),
    documentId: str,
    indexName: str,
  })
);

export const sessionViewDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('sessionView'),
    documentId: str,
    indexName: str,
    jumpToCursor: str.optional(),
    jumpToEntityId: str.optional(),
  })
);

export const documentEntitiesDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('documentEntities'),
    documentId: str,
    indexName: str,
    scopeId: str.optional(),
  })
);

export const documentCorrelationsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('documentCorrelations'),
    documentId: str,
    indexName: str,
    scopeId: str,
  })
);

export const documentPrevalenceDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('documentPrevalence'),
    documentId: str,
    indexName: str,
    scopeId: str,
    investigationFields: strArray,
  })
);

export const documentResponseDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('documentResponse'),
    documentId: str,
    indexName: str,
  })
);

export const documentThreatIntelligenceDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('documentThreatIntelligence'),
    documentId: str,
    indexName: str,
  })
);

export const documentInvestigationGuideDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('documentInvestigationGuide'),
    documentId: str,
    indexName: str,
  })
);

export const documentGraphDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('documentGraph'),
    documentId: str,
    indexName: str,
  })
);

export const notesDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('notes'),
    documentId: str,
    indexName: str,
  })
);

// --- Attack ---

export const attackDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('attack'),
    attackId: str,
    indexName: str,
  })
);

// Attack tools derive their related alert ids from the restored attack record rather than carrying
// them: the list is unbounded and would overflow the doc viewer's shareable-state size budget.

export const attackCorrelationsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('attackCorrelations'),
    attackId: str,
    indexName: str,
  })
);

export const attackEntitiesDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('attackEntities'),
    attackId: str,
    indexName: str,
  })
);

// --- Entity main flyouts ---

export const hostDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('host'),
    hostName: str,
    entityId: str.optional(),
    scopeId: str.optional(),
    mode: entityDescriptorModeSchema.optional(),
  })
);

export const userDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('user'),
    userName: str,
    entityId: str.optional(),
    scopeId: str.optional(),
    mode: entityDescriptorModeSchema.optional(),
  })
);

export const serviceDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('service'),
    serviceName: str,
    entityId: str.optional(),
    scopeId: str.optional(),
    mode: entityDescriptorModeSchema.optional(),
  })
);

export const genericEntityDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('genericEntity'),
    scopeId: str,
    /** Canonical Entity Store v2 id (`entity.id`). Either entityDocId or entityId must be set. */
    entityId: str.optional(),
    /** Raw document `_id` of the asset-inventory record. */
    entityDocId: str.optional(),
  })
);

// --- Entity tools ---
// EntityType enum values are stored as plain strings.
// Restorers must cast back: `entityType as EntityType`.

export const entityRiskInputsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('entityRiskInputs'),
    /** EntityType stored as plain string. Cast back to EntityType on restore. */
    entityType: str,
    entityName: str,
    entityId: str.optional(),
    subTab: str.optional(),
    scopeId: str.optional(),
  })
);

export const entityAnomalyInsightsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('entityAnomalyInsights'),
    /** EntityType stored as plain string. Cast back to EntityType on restore. */
    entityType: str,
    value: str,
    entityId: str.optional(),
    mode: entityDescriptorModeSchema.optional(),
    scopeId: str.optional(),
  })
);

export const entityAlertsInsightsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('entityAlertsInsights'),
    /** EntityType stored as plain string. Cast back to EntityType on restore. */
    entityType: str,
    value: str,
    entityId: str.optional(),
    scopeId: str.optional(),
    /** Entity-store lookup mode of the originating entity flyout; `resolved` queries the whole resolution group. */
    mode: entityDescriptorModeSchema.optional(),
  })
);

export const entityMisconfigurationInsightsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('entityMisconfigurationInsights'),
    /** EntityType stored as plain string. Cast back to EntityType on restore. */
    entityType: str,
    value: str,
    entityId: str.optional(),
    /** Entity-store lookup mode of the originating entity flyout; `resolved` queries the whole resolution group. */
    mode: entityDescriptorModeSchema.optional(),
  })
);

export const entityVulnerabilityInsightsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('entityVulnerabilityInsights'),
    value: str,
    entityId: str.optional(),
    /** EntityType stored as plain string. Cast back to EntityType on restore. */
    entityType: str.optional(),
    /** Entity-store lookup mode of the originating entity flyout; `resolved` queries the whole resolution group. */
    mode: entityDescriptorModeSchema.optional(),
  })
);

export const entityGraphViewDescriptorSchema = lazySchema(() =>
  z.object({
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
  })
);

export const entityResolutionDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('entityResolution'),
    entityId: str,
    /** EntityType stored as plain string. Cast back to EntityType on restore. */
    entityType: str,
    entityName: str,
    scopeId: str,
    mode: entityDescriptorModeSchema.optional(),
  })
);

/**
 * Stores the identifying parts of the ManagedUserHit (`_id` / `_index`) for Entra Insights.
 * The restorer rebuilds the ManagedUserHit from these two fields.
 */
export const entityEntraInsightsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('entityEntraInsights'),
    managedUserId: str,
    managedUserIndex: str,
    value: str,
  })
);

/**
 * Stores the identifying parts of the ManagedUserHit (`_id` / `_index`) for Okta Insights.
 * The restorer rebuilds the ManagedUserHit from these two fields.
 */
export const entityOktaInsightsDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('entityOktaInsights'),
    managedUserId: str,
    managedUserIndex: str,
    value: str,
  })
);

// --- Network / Rule / IOC / CSP ---

/**
 * FlowTargetSourceDest enum values are stored as plain strings.
 * Restorers must cast back: `flowTarget as FlowTargetSourceDest`.
 */
export const networkDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('network'),
    ip: str,
    flowTarget: str,
  })
);

export const ruleDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('rule'),
    ruleId: str,
  })
);

/** IOC descriptor stores the indicator's `_id` and `_index` so the restorer can re-fetch it. */
export const iocDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('ioc'),
    indicatorId: str,
    indicatorIndex: str,
  })
);

export const cspMisconfigurationDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('cspMisconfiguration'),
    resourceId: str,
    ruleId: str,
  })
);

export const cspVulnerabilityDescriptorSchema = lazySchema(() =>
  z.object({
    kind: z.literal('cspVulnerability'),
    vulnerabilityId: z.union([str, strArray]).optional(),
    resourceId: str.optional(),
    packageName: z.union([str, strArray]).optional(),
    packageVersion: z.union([str, strArray]).optional(),
    eventId: str.optional(),
  })
);

/** Fields every descriptor may carry, whatever its kind. */
const commonShape = {
  /** UI trigger to attribute when a descriptor is restored from URL state. */
  origin: lazySchema(() => z.enum(FLYOUT_ORIGIN).optional()),
  /**
   * Set on a chain root that was opened as the child of a flyout the chain does not store (e.g.
   * Discover's doc viewer), so a restore can reopen it as that flyout's child.
   */
  asChild: lazySchema(() => z.literal(true).optional()),
};

export const flyoutDescriptorSchema = lazySchema(() =>
  z.discriminatedUnion('kind', [
    documentDescriptorSchema.extend(commonShape),
    documentFromPatternDescriptorSchema.extend(commonShape),
    analyzerDescriptorSchema.extend(commonShape),
    sessionViewDescriptorSchema.extend(commonShape),
    documentEntitiesDescriptorSchema.extend(commonShape),
    documentCorrelationsDescriptorSchema.extend(commonShape),
    documentPrevalenceDescriptorSchema.extend(commonShape),
    documentResponseDescriptorSchema.extend(commonShape),
    documentThreatIntelligenceDescriptorSchema.extend(commonShape),
    documentInvestigationGuideDescriptorSchema.extend(commonShape),
    documentGraphDescriptorSchema.extend(commonShape),
    notesDescriptorSchema.extend(commonShape),
    attackDescriptorSchema.extend(commonShape),
    attackCorrelationsDescriptorSchema.extend(commonShape),
    attackEntitiesDescriptorSchema.extend(commonShape),
    hostDescriptorSchema.extend(commonShape),
    userDescriptorSchema.extend(commonShape),
    serviceDescriptorSchema.extend(commonShape),
    genericEntityDescriptorSchema.extend(commonShape),
    entityRiskInputsDescriptorSchema.extend(commonShape),
    entityAnomalyInsightsDescriptorSchema.extend(commonShape),
    entityAlertsInsightsDescriptorSchema.extend(commonShape),
    entityMisconfigurationInsightsDescriptorSchema.extend(commonShape),
    entityVulnerabilityInsightsDescriptorSchema.extend(commonShape),
    entityGraphViewDescriptorSchema.extend(commonShape),
    entityResolutionDescriptorSchema.extend(commonShape),
    entityEntraInsightsDescriptorSchema.extend(commonShape),
    entityOktaInsightsDescriptorSchema.extend(commonShape),
    networkDescriptorSchema.extend(commonShape),
    ruleDescriptorSchema.extend(commonShape),
    iocDescriptorSchema.extend(commonShape),
    cspMisconfigurationDescriptorSchema.extend(commonShape),
    cspVulnerabilityDescriptorSchema.extend(commonShape),
  ])
);

/** The open flyout chain: a root descriptor and an optional child. */
export const flyoutChainSchema = lazySchema(() => z.array(flyoutDescriptorSchema).min(1).max(2));
