/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import {
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common';
import { getField, getFieldArray } from '../../../flyout/document_details/shared/utils';
import { useHasGraphVisualizationLicense } from '../../../common/hooks/use_has_graph_visualization_license';
import { useEntityStoreStatus } from '../../../entity_analytics/components/entity_store/hooks/use_entity_store';

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
   * Array of actor entity IDs associated with the alert
   */
  actorIds: string[];

  /**
   * Array of target entity IDs associated with the alert
   */
  targetIds: string[];

  /**
   * Action associated with the event
   */
  action?: string[];

  /**
   * Boolean indicating if graph visualization is fully available
   * Combines: data availability (event ids, actor ids and action) + valid license + entity store running
   */
  shouldShowGraph: boolean;

  /**
   * Boolean indicating if the event has all required data fields for graph visualization
   */
  hasGraphData: boolean;

  /**
   * Boolean indicating if the event is an alert or not
   */
  isAlert: boolean;
}

/**
 * Hook that returns the graph view configuration if the graph view is available for the alert
 */
export const useGraphPreview = ({ hit }: UseGraphPreviewParams): UseGraphPreviewResult => {
  const getFieldsData = (field: string) => hit.flattened[field];

  const timestamp = getField(getFieldsData('@timestamp'));
  const originalEventId = getFieldsData('kibana.alert.original_event.id');
  const eventId = getFieldsData('event.id');
  const eventIds = originalEventId ? getFieldArray(originalEventId) : getFieldArray(eventId);

  // Get actor IDs from new ECS schema fields only
  const actorIds: string[] = [];
  GRAPH_ACTOR_ENTITY_FIELDS.forEach((field) => {
    const fieldValues = getFieldArray(getFieldsData(field));
    actorIds.push(...fieldValues);
  });

  // Get target IDs from new ECS schema fields only
  const targetIds: string[] = [];
  GRAPH_TARGET_ENTITY_FIELDS.forEach((field) => {
    const fieldValues = getFieldArray(getFieldsData(field));
    targetIds.push(...fieldValues);
  });

  const actionValue = getFieldsData('event.action');
  const action: string[] | undefined = actionValue
    ? (getFieldArray(actionValue) as string[])
    : undefined;

  // Check if user license is high enough to access graph visualization
  const hasRequiredLicense = useHasGraphVisualizationLicense();

  // Check if entity store is running
  const { data: entityStoreStatus } = useEntityStoreStatus();
  const isEntityStoreRunning = entityStoreStatus?.status === 'running';

  // Check if graph has all required data fields for graph visualization
  const hasGraphData =
    Boolean(timestamp) &&
    Boolean(action?.length) &&
    eventIds.length > 0 &&
    actorIds.length > 0 &&
    targetIds.length > 0;

  // Combine all conditions: data availability + license + entity store running
  const shouldShowGraph = hasGraphData && hasRequiredLicense && isEntityStoreRunning;

  const isAlert = Boolean(hit.flattened['kibana.alert.rule.uuid']);

  return {
    timestamp,
    eventIds,
    actorIds,
    action,
    targetIds,
    shouldShowGraph,
    hasGraphData,
    isAlert,
  };
};
