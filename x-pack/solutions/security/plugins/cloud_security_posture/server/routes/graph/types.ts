/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/v1';

export type EsQuery = GraphRequest['query']['esQuery'];

export interface OriginEventId {
  id: string;
  isAlert: boolean;
}

// Constants for non-enriched entity types
export const NON_ENRICHED_ENTITY_TYPE_PLURAL = 'Entities';
export const NON_ENRICHED_ENTITY_TYPE_SINGULAR = 'Entity';

export type LabelNodeId = string;

export interface GraphEdge {
  // event/alert attributes
  action: string;
  docs: string[] | string;
  isAlert: boolean;
  isOrigin: boolean;
  isOriginAlert: boolean;
  badge: number;
  uniqueEventsCount: number;
  uniqueAlertsCount: number;
  sourceIps?: string[] | string;
  sourceCountryCodes?: string[] | string;
  /**
   * Unique identifier for the label node based on document IDs.
   * This ensures that label nodes are deduplicated by documents, not by actor-target pairs.
   * When a single document expands via MV_EXPAND into multiple rows with different entity types,
   * they should share the same label node because they originate from the same document(s).
   */
  labelNodeId: LabelNodeId;
  // actor attributes
  actorNodeId: string;
  actorIdsCount: number;
  actorsDocData?: Array<string | null> | string;
  actorEntityType?: string | null;
  actorEntitySubType?: string | null;
  actorEntityName?: string | string[] | null;
  actorHostIps?: string[] | string;
  // target attributes
  targetNodeId: string | null;
  targetIdsCount: number;
  targetsDocData?: Array<string | null> | string;
  targetEntityType?: string | null;
  targetEntitySubType?: string | null;
  targetEntityName?: string | string[] | null;
  targetHostIps?: string[] | string;
}

/**
 * Represents a relationship edge from the entity store.
 * Used for static/configuration-based relationships between entities.
 * Source and target entities are grouped by type/subtype similar to event actors/targets.
 */
export interface RelationshipEdge {
  relationship: string; // "Owns", "Supervised_by", "Depends_on", etc.
  count: number; // Count of relationships
  // Source entity grouping (like actors in events)
  sourceNodeId: string; // Grouped source node ID (single ID or MD5 hash)
  sourceIds: string[]; // All source entity IDs in this group
  sourceIdsCount: number; // Count of unique source entities
  sourceEntityType?: string; // Source entity type
  sourceEntitySubType?: string; // Source entity sub_type
  sourceDocData?: string[]; // Source entities metadata as JSON strings
  // Target entity grouping (like targets in events)
  targetNodeId: string; // Grouped target node ID (single ID or MD5 hash)
  targetIds: string[]; // All target entity IDs in this group
  targetIdsCount: number; // Count of unique target entities
  targetEntityType?: string; // Target entity type
  targetEntitySubType?: string; // Target entity sub_type
  targetDocData?: string[]; // Target entities metadata as JSON strings
}

/**
 * Entity ID with type for relationship queries.
 */
export type EntityId = NonNullable<GraphRequest['query']['entityIds']>[number];
