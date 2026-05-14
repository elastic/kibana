/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { castArray } from 'lodash';
import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import { fetchEvents } from './fetch_events_graph';
import { fetchEntities, fetchEntityRelationships } from './fetch_entity_relationships_graph';
import { fetchEntityEnrichment, type EntityEnrichmentFields } from './fetch_entity_enrichment';
import type {
  EsQuery,
  EntityId,
  OriginEventId,
  EventEdge,
  RelationshipEdge,
  EntityRecord,
} from './types';

export interface FetchGraphParams {
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string | number;
  end: string | number;
  originEventIds: OriginEventId[];
  showUnknownTarget: boolean;
  indexPatterns: string[];
  spaceId: string;
  esQuery?: EsQuery;
  entityIds?: EntityId[];
  pinnedIds?: string[];
}

export interface FetchGraphResult {
  events: EventEdge[];
  relationships: RelationshipEdge[];
  entities: EntityRecord[];
}

const emptyEventsResult: EsqlToRecords<EventEdge> = { columns: [], records: [] };
const emptyRelationshipsResult: EsqlToRecords<RelationshipEdge> = { columns: [], records: [] };
const emptyEntitiesResult: EsqlToRecords<EntityRecord> = { columns: [], records: [] };

/**
 * Rebuilds doc data JSON strings with enrichment data from the entity store.
 * Replaces availableInEntityStore=false with true and populates entity metadata fields.
 */
const rebuildDocData = (
  docDataItems: (string | null)[] | string | undefined,
  enrichmentMap: Map<string, EntityEnrichmentFields>
): string[] => {
  const items = castArray(docDataItems ?? []).filter((d): d is string => d != null);
  return items.map((item) => {
    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(item);
    } catch {
      return item;
    }
    const entityId = doc.id as string;
    if (!entityId) return item;
    const enrichment = enrichmentMap.get(entityId);
    if (!enrichment) return item;

    const entity = (doc.entity as Record<string, unknown>) ?? {};
    doc.entity = {
      ...entity,
      availableInEntityStore: true,
      ...(enrichment.name != null ? { name: enrichment.name } : {}),
      ...(enrichment.type != null ? { type: enrichment.type } : {}),
      ...(enrichment.subType != null ? { sub_type: enrichment.subType } : {}),
      ...(enrichment.engineType != null ? { engine_type: enrichment.engineType } : {}),
      ...(enrichment.hostIps && enrichment.hostIps.length > 0
        ? { host: { ip: enrichment.hostIps } }
        : {}),
    };
    return JSON.stringify(doc);
  });
};

interface EventGroup {
  action: string;
  actorType: string | null;
  actorSubType: string | null;
  targetType: string | null;
  targetSubType: string | null;
  isOrigin: boolean;
  isOriginAlert: boolean;
  pinned: string | null | undefined;
  badge: number;
  uniqueEventsCount: number;
  uniqueAlertsCount: number;
  isAlert: boolean;
  docs: string[];
  sourceIps: string[];
  sourceCountryCodes: string[];
  actorEntityIds: string[];
  actorsDocData: string[];
  targetEntityIds: string[];
  targetsDocData: string[];
  labelNodeId: string;
}

/**
 * Re-groups entity-ID-level ESQL rows by (action, actorType, actorSubType, targetType,
 * targetSubType, isOrigin, isOriginAlert, pinned), applying entity store enrichment.
 * This restores the type/subtype-based grouping that was previously done in ESQL via LOOKUP JOIN.
 */
const applyEnrichmentAndRegroupEvents = (
  records: EventEdge[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): EventEdge[] => {
  const groups = new Map<string, EventGroup>();

  for (const record of records) {
    const actorId = record.actorEntityId ?? null;
    const targetId = record.targetEntityId ?? null;
    if (!actorId) continue; // actorEntityId is required

    const actorEnrichment = actorId ? enrichmentMap.get(actorId) : undefined;
    const targetEnrichment = targetId ? enrichmentMap.get(targetId) : undefined;

    const actorType = actorEnrichment?.type ?? null;
    const actorSubType = actorEnrichment?.subType ?? null;
    const targetType = targetEnrichment?.type ?? null;
    const targetSubType = targetEnrichment?.subType ?? null;

    const groupKey = JSON.stringify([
      record.action,
      actorType,
      actorSubType,
      targetType,
      targetSubType,
      record.isOrigin,
      record.isOriginAlert,
      record.pinned ?? null,
    ]);

    const existing = groups.get(groupKey);
    const docs = castArray(record.docs ?? []).filter((d): d is string => d != null);
    const sourceIps = castArray(record.sourceIps ?? []).filter((d): d is string => d != null);
    const sourceCountryCodes = castArray(record.sourceCountryCodes ?? []).filter(
      (d): d is string => d != null
    );
    const actorsDocData = castArray(record.actorsDocData ?? []).filter(
      (d): d is string => d != null
    );
    const targetsDocData = castArray(record.targetsDocData ?? []).filter(
      (d): d is string => d != null
    );

    if (!existing) {
      groups.set(groupKey, {
        action: record.action,
        actorType,
        actorSubType,
        targetType,
        targetSubType,
        isOrigin: record.isOrigin,
        isOriginAlert: record.isOriginAlert,
        pinned: record.pinned,
        badge: record.badge,
        uniqueEventsCount: record.uniqueEventsCount,
        uniqueAlertsCount: record.uniqueAlertsCount,
        isAlert: Boolean(record.isAlert),
        docs,
        sourceIps,
        sourceCountryCodes,
        actorEntityIds: [actorId],
        actorsDocData,
        targetEntityIds: targetId ? [targetId] : [],
        targetsDocData,
        labelNodeId: record.labelNodeId,
      });
    } else {
      existing.badge += record.badge;
      existing.uniqueEventsCount += record.uniqueEventsCount;
      existing.uniqueAlertsCount += record.uniqueAlertsCount;
      existing.isAlert = existing.isAlert || Boolean(record.isAlert);
      existing.docs.push(...docs);
      existing.sourceIps.push(...sourceIps);
      existing.sourceCountryCodes.push(...sourceCountryCodes);
      if (!existing.actorEntityIds.includes(actorId)) {
        existing.actorEntityIds.push(actorId);
      }
      existing.actorsDocData.push(...actorsDocData);
      if (targetId && !existing.targetEntityIds.includes(targetId)) {
        existing.targetEntityIds.push(targetId);
      }
      existing.targetsDocData.push(...targetsDocData);
    }
  }

  return Array.from(groups.values()).map((group): EventEdge => {
    const actorEntityIds = [...new Set(group.actorEntityIds)];
    const targetEntityIds = [...new Set(group.targetEntityIds)];

    const actorNodeId =
      actorEntityIds.length === 1
        ? actorEntityIds[0]
        : createHash('sha256').update(actorEntityIds.sort().join(',')).digest('hex');

    const targetNodeId =
      targetEntityIds.length === 0
        ? null
        : targetEntityIds.length === 1
        ? targetEntityIds[0]
        : createHash('sha256').update(targetEntityIds.sort().join(',')).digest('hex');

    // Recompute labelNodeId from all document _ids embedded in docs JSON
    const allDocIds = [
      ...new Set(
        group.docs
          .map((docStr) => {
            try {
              return (JSON.parse(docStr) as { id?: string }).id ?? null;
            } catch {
              return null;
            }
          })
          .filter((id): id is string => id != null)
      ),
    ].sort();
    const labelNodeId =
      allDocIds.length === 0
        ? group.labelNodeId
        : allDocIds.length === 1
        ? allDocIds[0]
        : createHash('sha256').update(allDocIds.join(',')).digest('hex');

    const actorNames = actorEntityIds
      .map((id) => enrichmentMap.get(id)?.name)
      .filter((n): n is string => n != null);
    const actorHostIps = [
      ...new Set(actorEntityIds.flatMap((id) => enrichmentMap.get(id)?.hostIps ?? [])),
    ];

    const targetNames = targetEntityIds
      .map((id) => enrichmentMap.get(id)?.name)
      .filter((n): n is string => n != null);
    const targetHostIps = [
      ...new Set(targetEntityIds.flatMap((id) => enrichmentMap.get(id)?.hostIps ?? [])),
    ];

    const enrichedActorsDocData = rebuildDocData(group.actorsDocData, enrichmentMap);
    const enrichedTargetsDocData = rebuildDocData(group.targetsDocData, enrichmentMap);

    const uniqueSourceIps = [...new Set(group.sourceIps)];
    const uniqueSourceCountryCodes = [...new Set(group.sourceCountryCodes)];

    return {
      action: group.action,
      badge: group.badge,
      uniqueEventsCount: group.uniqueEventsCount,
      uniqueAlertsCount: group.uniqueAlertsCount,
      isAlert: group.isAlert,
      isOrigin: group.isOrigin,
      isOriginAlert: group.isOriginAlert,
      pinned: group.pinned,
      labelNodeId,
      docs: group.docs,
      sourceIps: uniqueSourceIps.length > 0 ? uniqueSourceIps : undefined,
      sourceCountryCodes:
        uniqueSourceCountryCodes.length > 0 ? uniqueSourceCountryCodes : undefined,
      actorNodeId,
      actorIdsCount: actorEntityIds.length,
      actorEntityType: group.actorType,
      actorEntitySubType: group.actorSubType,
      actorEntityName:
        actorNames.length === 0 ? null : actorNames.length === 1 ? actorNames[0] : actorNames,
      actorHostIps: actorHostIps.length > 0 ? actorHostIps : undefined,
      actorsDocData: enrichedActorsDocData,
      targetNodeId,
      targetIdsCount: targetEntityIds.length,
      targetEntityType: group.targetType,
      targetEntitySubType: group.targetSubType,
      targetEntityName:
        targetNames.length === 0 ? null : targetNames.length === 1 ? targetNames[0] : targetNames,
      targetHostIps: targetHostIps.length > 0 ? targetHostIps : undefined,
      targetsDocData: enrichedTargetsDocData,
    };
  });
};

interface RelationshipGroup {
  actorNodeId: string;
  actorIds: string[];
  actorIdsCount: number;
  actorEntityType: string | null | undefined;
  actorEntitySubType: string | null | undefined;
  actorEntityName: string | string[] | null | undefined;
  actorHostIps: string[] | undefined;
  actorsDocData: string[];
  relationship: string;
  relationshipNodeId: string;
  targetType: string | null;
  targetSubType: string | null;
  badge: number;
  targetIds: string[];
  targetsDocData: string[];
}

/**
 * Re-groups entity-ID-level relationship rows by (actorNodeId, relationship, targetType,
 * targetSubType), applying entity store enrichment to target entities.
 * Source/actor entities already have full enrichment from the entity store query.
 */
const applyEnrichmentAndRegroupRelationships = (
  records: RelationshipEdge[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): RelationshipEdge[] => {
  const groups = new Map<string, RelationshipGroup>();

  for (const record of records) {
    const targetId = record.targetId ?? null;
    const targetEnrichment = targetId ? enrichmentMap.get(targetId) : undefined;
    const targetType = targetEnrichment?.type ?? null;
    const targetSubType = targetEnrichment?.subType ?? null;

    const groupKey = JSON.stringify([
      record.actorNodeId,
      record.relationship,
      targetType,
      targetSubType,
    ]);

    const targetsDocData = castArray(record.targetsDocData ?? []).filter(
      (d): d is string => d != null
    );

    const existing = groups.get(groupKey);
    if (!existing) {
      groups.set(groupKey, {
        actorNodeId: record.actorNodeId,
        actorIds: castArray(record.actorIds ?? []).filter(Boolean) as string[],
        actorIdsCount: record.actorIdsCount,
        actorEntityType: record.actorEntityType,
        actorEntitySubType: record.actorEntitySubType,
        actorEntityName: record.actorEntityName,
        actorHostIps: record.actorHostIps
          ? (castArray(record.actorHostIps).filter(Boolean) as string[])
          : undefined,
        actorsDocData: castArray(record.actorsDocData ?? []).filter((d): d is string => d != null),
        relationship: record.relationship,
        relationshipNodeId: record.relationshipNodeId,
        targetType,
        targetSubType,
        badge: record.badge,
        targetIds: targetId ? [targetId] : [],
        targetsDocData,
      });
    } else {
      existing.badge += record.badge;
      if (targetId && !existing.targetIds.includes(targetId)) {
        existing.targetIds.push(targetId);
      }
      existing.targetsDocData.push(...targetsDocData);
    }
  }

  return Array.from(groups.values()).map((group): RelationshipEdge => {
    const targetIds = [...new Set(group.targetIds)];
    const targetNodeId =
      targetIds.length === 0
        ? ''
        : targetIds.length === 1
        ? targetIds[0]
        : createHash('sha256').update(targetIds.sort().join(',')).digest('hex');

    const targetNames = targetIds
      .map((id) => enrichmentMap.get(id)?.name)
      .filter((n): n is string => n != null);
    const targetHostIps = [
      ...new Set(targetIds.flatMap((id) => enrichmentMap.get(id)?.hostIps ?? [])),
    ];

    const enrichedTargetsDocData = rebuildDocData(group.targetsDocData, enrichmentMap);

    return {
      badge: group.badge,
      actorNodeId: group.actorNodeId,
      actorIdsCount: group.actorIdsCount,
      actorEntityType: group.actorEntityType,
      actorEntitySubType: group.actorEntitySubType,
      actorEntityName: group.actorEntityName,
      actorHostIps: group.actorHostIps,
      actorsDocData: group.actorsDocData,
      targetNodeId,
      targetIdsCount: targetIds.length,
      targetEntityType: group.targetType,
      targetEntitySubType: group.targetSubType,
      targetEntityName:
        targetNames.length === 0 ? null : targetNames.length === 1 ? targetNames[0] : targetNames,
      targetHostIps: targetHostIps.length > 0 ? targetHostIps : undefined,
      targetsDocData: enrichedTargetsDocData,
      relationship: group.relationship,
      relationshipNodeId: group.relationshipNodeId,
      actorIds: group.actorIds,
      targetIds,
    };
  });
};

/**
 * Applies enrichment to entity records from the entity store.
 */
const applyEnrichmentToEntityRecords = (
  records: EntityRecord[],
  enrichmentMap: Map<string, EntityEnrichmentFields>
): EntityRecord[] => {
  return records.map((record) => {
    const enrichment = enrichmentMap.get(record.id);
    if (!enrichment) return record;
    return {
      ...record,
      name: enrichment.name ?? record.name,
      type: enrichment.type ?? record.type,
      sub_type: enrichment.subType ?? record.sub_type,
    };
  });
};

/**
 * Fetches graph data including both events and entity relationships.
 * Orchestrates parallel fetching of events from logs/alerts and relationships from entity store.
 * After fetching, performs a single consolidated enrichment query and re-groups results
 * by type/subtype, restoring the previous LOOKUP JOIN behavior in a CPS-safe way.
 */
export const fetchGraph = async ({
  esClient,
  logger,
  start,
  end,
  originEventIds,
  showUnknownTarget,
  indexPatterns,
  spaceId,
  esQuery,
  entityIds,
  pinnedIds,
}: FetchGraphParams): Promise<FetchGraphResult> => {
  // Only fetch events when originEventIds or esQuery are provided
  const hasOriginEventIds = originEventIds.length > 0;
  const hasEsQuery =
    !!esQuery?.bool.filter?.length ||
    !!esQuery?.bool.must?.length ||
    !!esQuery?.bool.should?.length ||
    !!esQuery?.bool.must_not?.length;

  const eventsPromise =
    hasOriginEventIds || hasEsQuery
      ? fetchEvents({
          esClient,
          logger,
          start,
          end,
          originEventIds,
          showUnknownTarget,
          indexPatterns,
          spaceId,
          esQuery,
          pinnedIds,
        }).catch((error) => {
          logger.error(`Failed to fetch events: ${error.message}`);
          throw error;
        })
      : Promise.resolve(emptyEventsResult);

  // Optionally fetch relationships in parallel when entityIds are provided
  const hasEntityIds = entityIds && entityIds.length > 0;

  const relationshipsPromise = hasEntityIds
    ? fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId,
      }).catch((error) => {
        logger.error(`Failed to fetch entity relationships: ${error.message}`);
        throw error;
      })
    : Promise.resolve(emptyRelationshipsResult);

  // We fetch the entities just in case they don't have any relationships. We would still like to see them in the graph.
  // These entities suppose to be pinned anyway. So there's no worry that they might be part of a group.
  const entitiesPromise = hasEntityIds
    ? fetchEntities({
        esClient,
        logger,
        entityIds,
        spaceId,
      }).catch((error) => {
        logger.error(`Failed to fetch entities: ${error.message}`);
        throw error;
      })
    : Promise.resolve(emptyEntitiesResult);

  // Wait for all in parallel
  const [eventsResult, relationshipsResult, entitiesResult] = await Promise.all([
    eventsPromise,
    relationshipsPromise,
    entitiesPromise,
  ]);

  logger.trace(
    `Fetched [events: ${eventsResult.records.length}] [relationships: ${relationshipsResult.records.length}]`
  );

  // Collect all entity IDs for a single consolidated enrichment query
  const allEntityIds = new Set<string>();
  for (const r of eventsResult.records) {
    if (r.actorEntityId) allEntityIds.add(r.actorEntityId);
    if (r.targetEntityId) allEntityIds.add(r.targetEntityId);
  }
  for (const r of relationshipsResult.records) {
    for (const id of castArray(r.actorIds ?? [])) {
      if (id) allEntityIds.add(id as string);
    }
    if (r.targetId) allEntityIds.add(r.targetId);
  }
  for (const r of entitiesResult.records) {
    if (r.id) allEntityIds.add(r.id);
  }

  const enrichmentMap =
    allEntityIds.size > 0
      ? await fetchEntityEnrichment(esClient, logger, [...allEntityIds], spaceId)
      : new Map<string, EntityEnrichmentFields>();

  return {
    events: applyEnrichmentAndRegroupEvents(eventsResult.records, enrichmentMap),
    relationships: applyEnrichmentAndRegroupRelationships(
      relationshipsResult.records,
      enrichmentMap
    ),
    entities: applyEnrichmentToEntityRecords(entitiesResult.records, enrichmentMap),
  };
};
