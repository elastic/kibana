/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NIGHTSHIFT_EBT_ACTIONS = {
  CLEAR_BLAST_RADIUS_FILTER: 'clearBlastRadiusFilter',
  CLOSE_FLYOUT: 'closeFlyout',
  COLLAPSE_BLAST_RADIUS: 'collapseBlastRadius',
  EXPAND_BLAST_RADIUS: 'expandBlastRadius',
  FILTER_BY_BLAST_RADIUS: 'filterByBlastRadius',
  OPEN_IN_CHAT: 'openInChat',
  VIEW_ALL_SIGNIFICANT_EVENTS: 'viewAllSignificantEvents',
  VIEW_DETECTION: 'viewDetection',
  VIEW_ENTITY: 'viewEntity',
  VIEW_INVESTIGATION: 'viewInvestigation',
  VIEW_SIGNIFICANT_EVENT: 'viewSignificantEvent',
  VIEW_SIGNIFICANT_EVENTS: 'viewSignificantEvents',
} as const;

export const NIGHTSHIFT_EBT_ELEMENTS = {
  BLAST_RADIUS: 'nightshiftBlastRadius',
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
  NEW_CONVERSATION: 'newConversation',
  NEEDS_ACTION: 'needsAction',
  RESOLVED: 'resolved',
} as const;

const BLAST_RADIUS_ENTRY_TYPES = ['dependency', 'entity', 'infrastructure'] as const;

/**
 * Returns a fixed, privacy-safe category instead of the chip key, which can
 * contain customer-provided entity and stream names.
 */
export const getBlastRadiusEbtDetail = (chipKey: string): string =>
  BLAST_RADIUS_ENTRY_TYPES.find((type) => chipKey.startsWith(`${type}:`)) ?? 'stream';
