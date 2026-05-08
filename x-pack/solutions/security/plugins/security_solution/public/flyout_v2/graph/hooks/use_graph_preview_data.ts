/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import {
  type EuidSourceFields,
  getGraphActorEuidSourceFields,
  getGraphTargetEuidSourceFields,
} from '@kbn/cloud-security-posture-common';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { getField, getFieldArray } from '../../../flyout/document_details/shared/utils';
import { useShouldShowGraph } from '../../../flyout/shared/hooks/use_should_show_graph';
import { EventKind } from '../../document/constants/event_kinds';

export interface UseGraphPreviewDataResult {
  /**
   * The timestamp of the event
   */
  timestamp: string | null;

  /**
   * Array of event IDs associated with the alert
   */
  eventIds: string[];

  /**
   * Array of actor entity source field values associated with the alert
   */
  actorIds: string[];

  /**
   * Array of target entity source field values associated with the alert
   */
  targetIds: string[];

  /**
   * Action associated with the event
   */
  action?: string[];

  /**
   * Boolean indicating if graph visualization is fully available
   * (data + license + entity store running)
   */
  shouldShowGraph: boolean;

  /**
   * Boolean indicating if the event has all required data fields for graph visualization
   */
  hasGraphData: boolean;

  /**
   * Boolean indicating if the event is an alert
   */
  isAlert: boolean;
}

const EMPTY_EUID_SOURCE_FIELDS: EuidSourceFields = {
  user: [],
  host: [],
  service: [],
  generic: [],
  all: [],
};

/**
 * Hit-based equivalent of the legacy `useGraphPreview` that derives all graph parameters
 * from a `DataTableRecord` instead of `useDocumentDetailsContext`. Used by the Flyout v2
 * Graph tools flyout and the v2 Graph preview.
 */
export const useGraphPreviewData = (hit: DataTableRecord): UseGraphPreviewDataResult => {
  const euidApi = useEntityStoreEuidApi();
  const euid = euidApi?.euid;

  const actorSourceFields = useMemo(
    () => (euid ? getGraphActorEuidSourceFields(euid) : EMPTY_EUID_SOURCE_FIELDS),
    [euid]
  );
  const targetSourceFields = useMemo(
    () => (euid ? getGraphTargetEuidSourceFields(euid) : EMPTY_EUID_SOURCE_FIELDS),
    [euid]
  );

  const timestamp = getField(getFieldValue(hit, '@timestamp'));

  const originalEventId = getFieldValue(hit, 'kibana.alert.original_event.id');
  const eventId = getFieldValue(hit, 'event.id');
  const eventIds = originalEventId ? getFieldArray(originalEventId) : getFieldArray(eventId);

  const actorIds = useMemo(() => {
    const ids: string[] = [];
    [
      ...actorSourceFields.user,
      ...actorSourceFields.host,
      ...actorSourceFields.service,
      ...actorSourceFields.generic,
    ].forEach((field) => {
      ids.push(...getFieldArray(getFieldValue(hit, field)));
    });
    return ids;
  }, [hit, actorSourceFields]);

  const targetIds = useMemo(() => {
    const ids: string[] = [];
    [
      ...targetSourceFields.user,
      ...targetSourceFields.host,
      ...targetSourceFields.service,
      ...targetSourceFields.generic,
    ].forEach((field) => {
      ids.push(...getFieldArray(getFieldValue(hit, field)));
    });
    return ids;
  }, [hit, targetSourceFields]);

  const actionField = getFieldValue(hit, 'event.action');
  const action: string[] | undefined =
    actionField != null ? (getFieldArray(actionField) as string[]) : undefined;

  const hasGraphData =
    Boolean(timestamp) &&
    Boolean(action?.length) &&
    eventIds.length > 0 &&
    actorIds.length > 0 &&
    targetIds.length > 0;

  const shouldShowGraph = useShouldShowGraph() && hasGraphData;

  const isAlert = (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal;

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
