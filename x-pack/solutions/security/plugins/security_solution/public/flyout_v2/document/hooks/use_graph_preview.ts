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
  actorIds: string[];
  targetIds: string[];
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

  const actorIds: string[] = [];
  GRAPH_ACTOR_ENTITY_FIELDS.forEach((field) => {
    actorIds.push(...getFieldArray(getFieldsData(field)));
  });

  const targetIds: string[] = [];
  GRAPH_TARGET_ENTITY_FIELDS.forEach((field) => {
    targetIds.push(...getFieldArray(getFieldsData(field)));
  });

  const actionField = getFieldsData('event.action');
  const action: string[] | undefined =
    actionField != null ? (getFieldArray(actionField) as string[]) : undefined;

  const hasRequiredLicense = useHasGraphVisualizationLicense();
  const { data: entityStoreStatus } = useEntityStoreStatus();
  const isEntityStoreRunning = entityStoreStatus?.status === 'running';

  const hasGraphData =
    Boolean(timestamp) &&
    Boolean(action?.length) &&
    eventIds.length > 0 &&
    actorIds.length > 0 &&
    targetIds.length > 0;

  const shouldShowGraph = hasGraphData && hasRequiredLicense && isEntityStoreRunning;

  const isAlert = getField(getFieldsData(EVENT_KIND)) === EventKind.signal;

  return {
    timestamp,
    eventIds,
    actorIds,
    targetIds,
    action,
    shouldShowGraph,
    hasGraphData,
    isAlert,
  };
};
