/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { get } from 'lodash/fp';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import {
  GRAPH_ACTOR_ENTITY_FIELDS,
  GRAPH_TARGET_ENTITY_FIELDS,
} from '@kbn/cloud-security-posture-common';
import type { GetFieldsData } from './use_get_fields_data';
import { getField, getFieldArray } from '../utils';
import { useBasicDataFromDetailsData } from './use_basic_data_from_details_data';
import { useHasGraphVisualizationLicense } from '../../../../common/hooks/use_has_graph_visualization_license';
import { ENABLE_GRAPH_VISUALIZATION_SETTING } from '../../../../../common/constants';

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
   * Boolean indicating if graph visualization is fully available
   * Combines: data availability (event ids, actor ids and action) + valid license + feature enabled in settings
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

  const action: string[] | undefined = get(['event', 'action'], ecsData);

  // Check if user license is high enough to access graph visualization
  const hasRequiredLicense = useHasGraphVisualizationLicense();

  // Check if graph visualization feature is enabled in UI settings
  const [isGraphFeatureEnabled] = useUiSetting$<boolean>(ENABLE_GRAPH_VISUALIZATION_SETTING);

  // Check if graph has all required data fields for graph visualization
  const hasGraphRepresentation =
    Boolean(timestamp) &&
    Boolean(action?.length) &&
    eventIds.length > 0 &&
    actorIds.length > 0 &&
    targetIds.length > 0;

  // Combine all conditions: data availability + license + feature flag
  const shouldShowGraph = hasGraphRepresentation && hasRequiredLicense && isGraphFeatureEnabled;

  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  return {
    timestamp,
    eventIds,
    actorIds,
    action,
    targetIds,
    shouldShowGraph,
    isAlert,
  };
};
