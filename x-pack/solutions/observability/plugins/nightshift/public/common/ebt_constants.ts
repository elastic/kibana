/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { NIGHTSHIFT_EBT_ACTIONS } from '@kbn/nightshift-shared';

export const NIGHTSHIFT_EBT_ELEMENTS = {
  IMPACTED_SERVICES: 'nightshiftImpactedServices',
  INVESTIGATIONS_LIST: 'nightshiftInvestigationsList',
  INVESTIGATION_DETAIL_FLYOUT: 'nightshiftInvestigationDetailFlyout',
  DETECTION_FLYOUT: 'nightshiftDetectionFlyout',
  DETECTION_FLYOUT_ENTITIES: 'nightshiftDetectionFlyoutEntities',
  ENTITY_FLYOUT: 'nightshiftEntityFlyout',
  EVENT_FLYOUT: 'nightshiftEventFlyout',
  EVENT_FLYOUT_DETECTIONS: 'nightshiftEventFlyoutDetections',
  EVENT_FLYOUT_INVESTIGATION: 'nightshiftEventFlyoutInvestigation',
  INVESTIGATION_FLYOUT: 'nightshiftInvestigationFlyout',
  INVESTIGATION_SUMMARY: 'nightshiftInvestigationSummary',
  PAGE_HEADER: 'nightshiftPageHeader',
  SIGNIFICANT_EVENTS_LIST: 'nightshiftSignificantEventsList',
  START_INVESTIGATION_PANEL: 'nightshiftStartInvestigationPanel',
  STATUS_SUMMARY: 'nightshiftStatusSummary',
} as const;

export const NIGHTSHIFT_EBT_DETAILS = {
  EXISTING_CONVERSATION: 'existingConversation',
  IMPACTED_SERVICE_TYPE: 'entity',
  NEW_CONVERSATION: 'newConversation',
  NEEDS_ACTION: 'needsAction',
  RESOLVED: 'resolved',
} as const;
