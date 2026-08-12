/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  type EuidSourceFields,
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
  getGraphActorEuidSourceFields,
  getGraphTargetEuidSourceFields,
} from '@kbn/cloud-security-posture-common';
import { ALL_ENTITY_TYPES, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { getField, getFieldArray } from '../../../../flyout/document_details/shared/utils';
import { useHasGraphVisualizationLicense } from '../../../../common/hooks/use_has_graph_visualization_license';

export interface UseGraphPreviewParams {
  /**
   * DataTableRecord of the document
   */
  hit: DataTableRecord;
}

/**
 * Interface for the result of the useGraphPreview hook
 */
export interface UseGraphPreviewResult {
  /**
   * The timestamp of the event
   */
  timestamp: string | null;

  /**
   * Array of event IDs associated with the alert
   */
  eventIds: string[];

  /**
   * Action associated with the event
   */
  action?: string[];

  /**
   * Boolean indicating if graph visualization is fully available
   * Combines: data availability + valid license.
   * Entity store is preferred for production enrichment, but is not required to
   * show the flyout preview (mock/dev graphs can render without it).
   */
  shouldShowGraph: boolean;

  /**
   * Boolean indicating if the event has all required data fields for graph visualization
   */
  hasGraphData: boolean;
}

const hasEuidIdentity = (
  fieldsByType: EuidSourceFields,
  flattened: DataTableRecord['flattened']
): boolean =>
  ALL_ENTITY_TYPES.some((type) =>
    fieldsByType[type].some((field) => getFieldArray(flattened[field]).length > 0)
  );

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

  // Actor and target detection covers both entity-store v1 (`*.entity.id` and `*.target.entity.id`,
  // still emitted in v2 backfill) and v2 raw identity fields (`host.id`, `host.name`, …) — the same
  // idiom used in `highlighted_fields.tsx` / `prevalence_details_view.tsx`. For targets, identity
  // fields are checked in their `.target.` namespace (e.g. `user.id` → `user.target.id`).
  const hasV1Actor = GRAPH_ACTOR_ENTITY_FIELDS.some(
    (field) => getFieldArray(hit.flattened[field]).length > 0
  );
  const hasV2Actor = useMemo(
    () => euid != null && hasEuidIdentity(getGraphActorEuidSourceFields(euid), hit.flattened),
    [euid, hit.flattened]
  );
  const hasActor = hasV1Actor || hasV2Actor;

  const hasV1Target = GRAPH_TARGET_ENTITY_FIELDS.some(
    (field) => getFieldArray(hit.flattened[field]).length > 0
  );
  const hasV2Target = useMemo(
    () => euid != null && hasEuidIdentity(getGraphTargetEuidSourceFields(euid), hit.flattened),
    [euid, hit.flattened]
  );
  const hasTarget = hasV1Target || hasV2Target;

  const actionField = getFieldsData('event.action');
  const action: string[] | undefined =
    actionField != null ? (getFieldArray(actionField) as string[]) : undefined;

  // Prefer actor/target entity fields when present; for local demos / mock graph data,
  // timestamp + event ids are enough to show the Visualizations graph preview.
  const hasGraphData =
    Boolean(timestamp) &&
    eventIds.length > 0 &&
    (Boolean(action?.length) || hasActor || hasTarget);

  const hasRequiredLicense = useHasGraphVisualizationLicense();

  // Show the preview whenever the document has graph fields + license.
  // Entity store remains preferred for full enrichment, but blocking the preview on it
  // hides the Visualizations entry point during local design/demo setups.
  const shouldShowGraph = hasGraphData && hasRequiredLicense;

  return {
    timestamp,
    eventIds,
    action,
    shouldShowGraph,
    hasGraphData,
  };
};
