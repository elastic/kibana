/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common';
import { ALL_ENTITY_TYPES, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { getField, getFieldArray } from '../../../flyout/document_details/shared/utils';
import { useHasGraphVisualizationLicense } from '../../../common/hooks/use_has_graph_visualization_license';
import { useEntityStoreStatus } from '../../../entity_analytics/components/entity_store/hooks/use_entity_store';
import { EventKind } from '../constants/event_kinds';

export interface UseGraphPreviewParams {
  /**
   * DataTableRecord of the document
   */
  hit: DataTableRecord;
}

export interface UseGraphPreviewResult {
  timestamp: string | null;
  eventIds: string[];
  action?: string[];
  shouldShowGraph: boolean;
  hasGraphData: boolean;
  isAlert: boolean;
}

/**
 * Derives graph preview parameters from a `DataTableRecord`. Used by the Flyout v2
 * graph preview and by legacy expandable-flyout graph surfaces (which build a `hit`
 * from their document context).
 */
export const useGraphPreview = ({ hit }: UseGraphPreviewParams): UseGraphPreviewResult => {
  const getFieldsData = (field: string) => hit.flattened[field];

  const timestamp = getField(getFieldsData('@timestamp'));

  const originalEventId = getFieldsData('kibana.alert.original_event.id');
  const eventId = getFieldsData('event.id');
  const eventIds = originalEventId ? getFieldArray(originalEventId) : getFieldArray(eventId);

  // `useEntityStoreEuidApi` is async-hydrated (see `entity_store/public/euid_api_context.tsx`);
  // it returns `null` until the lazy chunk loads. The `useMemo` recomputes once `euid` is available.
  const euid = useEntityStoreEuidApi()?.euid;

  // Actor: v1 `*.entity.id` (entity-store v1 backfill, still emitted in v2) OR the v2 idiom
  // used in `highlighted_fields.tsx` / `prevalence_details_view.tsx` (raw identity fields like
  // `host.id` / `host.name`). Target: static v1 list — `*.target.*` is a Security graph
  // convention with no entity-store equivalent.
  const hasV1Actor = GRAPH_ACTOR_ENTITY_FIELDS.some(
    (field) => getFieldArray(hit.flattened[field]).length > 0
  );
  const hasV2Actor = useMemo(
    () =>
      euid != null &&
      ALL_ENTITY_TYPES.some(
        (type) => euid.getEntityIdentifiersFromDocument(type, hit.flattened) != null
      ),
    [euid, hit.flattened]
  );
  const hasActor = hasV1Actor || hasV2Actor;
  const hasTarget = GRAPH_TARGET_ENTITY_FIELDS.some(
    (field) => getFieldArray(hit.flattened[field]).length > 0
  );

  const actionField = getFieldsData('event.action');
  const action: string[] | undefined =
    actionField != null ? (getFieldArray(actionField) as string[]) : undefined;

  const hasRequiredLicense = useHasGraphVisualizationLicense();
  const { data: entityStoreStatus } = useEntityStoreStatus();
  const isEntityStoreRunning = entityStoreStatus?.status === 'running';

  const hasGraphData =
    Boolean(timestamp) && Boolean(action?.length) && eventIds.length > 0 && hasActor && hasTarget;

  const shouldShowGraph = hasGraphData && hasRequiredLicense && isEntityStoreRunning;

  const isAlert = getField(getFieldsData(EVENT_KIND)) === EventKind.signal;

  return {
    timestamp,
    eventIds,
    action,
    shouldShowGraph,
    hasGraphData,
    isAlert,
  };
};
