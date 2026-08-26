/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NIGHTSHIFT_EBT_ACTIONS = {
  CLEAR_IMPACTED_SERVICES_FILTER: 'clearImpactedServicesFilter',
  CLOSE_FLYOUT: 'closeFlyout',
  CLOSE_SIGNIFICANT_EVENT: 'closeSignificantEvent',
  COLLAPSE_IMPACTED_SERVICES: 'collapseImpactedServices',
  COLLAPSE_DETECTIONS: 'collapseDetections',
  EXPAND_IMPACTED_SERVICES: 'expandImpactedServices',
  EXPAND_DETECTIONS: 'expandDetections',
  FILTER_BY_IMPACTED_SERVICES: 'filterByImpactedServices',
  OPEN_IN_CHAT: 'openInChat',
  VIEW_ALL_SIGNIFICANT_EVENTS: 'viewAllSignificantEvents',
  VIEW_DETECTION: 'viewDetection',
  VIEW_ENTITY: 'viewEntity',
  VIEW_INVESTIGATION: 'viewInvestigation',
  VIEW_SETTINGS: 'viewSettings',
  VIEW_SIGNIFICANT_EVENT: 'viewSignificantEvent',
  VIEW_SIGNIFICANT_EVENTS: 'viewSignificantEvents',
} as const;

export const NIGHTSHIFT_EBT_ELEMENTS = {
  IMPACTED_SERVICES: 'nightshiftImpactedServices',
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
  STATUS_SUMMARY: 'nightshiftStatusSummary',
} as const;

export const NIGHTSHIFT_EBT_DETAILS = {
  EXISTING_CONVERSATION: 'existingConversation',
  IMPACTED_SERVICE_TYPE: 'entity',
  NEW_CONVERSATION: 'newConversation',
  NEEDS_ACTION: 'needsAction',
  RESOLVED: 'resolved',
} as const;
