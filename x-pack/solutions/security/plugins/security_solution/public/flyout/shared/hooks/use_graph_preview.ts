/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { get } from 'lodash/fp';
import {
  type EuidSourceFields,
  getGraphActorEuidSourceFields,
  getGraphTargetEuidSourceFields,
} from '@kbn/cloud-security-posture-common';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type { GetFieldsData } from '../../document_details/shared/hooks/use_get_fields_data';
import { getField, getFieldArray } from '../../document_details/shared/utils';
import { useBasicDataFromDetailsData } from '../../document_details/shared/hooks/use_basic_data_from_details_data';
import { useShouldShowGraph } from './use_should_show_graph';

export interface UseGraphPreviewParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;

  /**
   * An object with top level fields from the ECS object
   */
  ecsData: Ecs;

  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
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
   * Boolean indicating if the event has all required data fields for graph visualization
   */
  hasGraphData: boolean;

  /**
   * Boolean indicating if graph visualization is fully available
   * Combines: valid license + feature enabled in settings
   */
  shouldShowGraph: boolean;

  /**
   * Boolean indicating if the event is an alert or not
   */
  isAlert: boolean;
}

/**
 * Hook that returns the graph view configuration if the graph view is available for the alert
 */
export const useGraphPreview = ({
  getFieldsData,
  ecsData,
  dataFormattedForFieldBrowser,
}: UseGraphPreviewParams): UseGraphPreviewResult => {
  const euidApi = useEntityStoreEuidApi();
  const euid = euidApi?.euid;
  const EMPTY_EUID_SOURCE_FIELDS: EuidSourceFields = useMemo(
    () => ({
      user: [],
      host: [],
      service: [],
      generic: [],
      all: [],
    }),
    []
  );
  const GRAPH_ACTOR_EUID_SOURCE_FIELDS = useMemo(
    () => (euid ? getGraphActorEuidSourceFields(euid) : EMPTY_EUID_SOURCE_FIELDS),
    [euid, EMPTY_EUID_SOURCE_FIELDS]
  );
  const GRAPH_TARGET_EUID_SOURCE_FIELDS = useMemo(
    () => (euid ? getGraphTargetEuidSourceFields(euid) : EMPTY_EUID_SOURCE_FIELDS),
    [euid, EMPTY_EUID_SOURCE_FIELDS]
  );
  const timestamp = getField(getFieldsData('@timestamp'));
  const originalEventId = getFieldsData('kibana.alert.original_event.id');
  const eventId = getFieldsData('event.id');
  const eventIds = originalEventId ? getFieldArray(originalEventId) : getFieldArray(eventId);

  // Get actor IDs from EUID source fields (raw ECS fields used to compute actor EUIDs)
  const actorIds: string[] = [];
  [
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.user,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.host,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.service,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.generic,
  ].forEach((field) => {
    const fieldValues = getFieldArray(getFieldsData(field));
    actorIds.push(...fieldValues);
  });

  // Get target IDs from EUID source fields (raw ECS fields used to compute target EUIDs)
  const targetIds: string[] = [];
  [
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.user,
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.host,
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.service,
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.generic,
  ].forEach((field) => {
    const fieldValues = getFieldArray(getFieldsData(field));
    targetIds.push(...fieldValues);
  });

  const action: string[] | undefined = get(['event', 'action'], ecsData);

  // Check if graph has all required data fields for graph visualization
  const hasGraphRepresentation =
    Boolean(timestamp) &&
    Boolean(action?.length) &&
    eventIds.length > 0 &&
    actorIds.length > 0 &&
    targetIds.length > 0;

  // Combine all conditions: data availability + license
  const shouldShowGraph = useShouldShowGraph() && hasGraphRepresentation;

  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  return {
    timestamp,
    eventIds,
    actorIds,
    action,
    targetIds,
    hasGraphData: hasGraphRepresentation,
    shouldShowGraph,
    isAlert,
  };
};
