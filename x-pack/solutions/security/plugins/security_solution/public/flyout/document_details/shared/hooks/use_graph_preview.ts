/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { get } from 'lodash/fp';
import type { GetFieldsData } from './use_get_fields_data';
import { getField, getFieldArray } from '../utils';
import { useBasicDataFromDetailsData } from './use_basic_data_from_details_data';

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
   * The document timestamp (@timestamp field).
   * - For alerts: This is the alert creation/detection time
   * - For events: This is the event occurrence time
   */
  timestamp: string | null;

  /**
   * The original event time (kibana.alert.original_time field).
   * - For alerts: This is the timestamp of the underlying event that triggered the alert
   * - For events: This will be null/undefined as events don't have this field
   * Use this for accurate time-based filtering when querying logs related to alerts.
   */
  originalEventTime?: string | null;

  /**
   * Array of event IDs associated with the document
   */
  eventIds: string[];

  /**
   * Array of actor entity IDs associated with the document
   */
  actorIds: string[];

  /**
   * Array of target entity IDs associated with the document
   */
  targetIds: string[];

  /**
   * Action associated with the document
   */
  action?: string[];

  /**
   * Boolean indicating if the document has a graph representation (contains event ids, actor ids and action)
   */
  hasGraphRepresentation: boolean;

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
  // Get the document's @timestamp
  // For alerts: this is when the alert was created/detected
  // For events: this is when the event occurred
  const timestamp = getField(getFieldsData('@timestamp'));

  // Get the original event time (only present for alerts)
  // This represents when the underlying event actually occurred, before it triggered the alert
  const originalEventTime = getField(getFieldsData('kibana.alert.original_time'));

  // Get event IDs - use alert's original event ID if present, otherwise use event.id
  const originalEventId = getFieldsData('kibana.alert.original_event.id');
  const eventId = getFieldsData('event.id');
  const eventIds = originalEventId ? getFieldArray(originalEventId) : getFieldArray(eventId);

  const actorIds = getFieldArray(getFieldsData('actor.entity.id'));
  const targetIds = getFieldArray(getFieldsData('target.entity.id'));
  const action: string[] | undefined = get(['event', 'action'], ecsData);

  const hasGraphRepresentation =
    Boolean(timestamp) &&
    Boolean(action?.length) &&
    actorIds.length > 0 &&
    eventIds.length > 0 &&
    targetIds.length > 0;

  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  return {
    timestamp,
    originalEventTime,
    eventIds,
    actorIds,
    action,
    targetIds,
    hasGraphRepresentation,
    isAlert,
  };
};
