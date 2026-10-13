/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EBT_CLICK_ACTIONS } from '@kbn/ebt-click';

export const NIGHTSHIFT_EBT_ACTIONS = {
  CANCEL_DETECTION_ENGINE_CHANGE: 'cancelDetectionEngineChange',
  CANCEL_SLACK_CONNECTION: 'cancelSlackConnection',
  CLEAR_IMPACTED_SERVICES_FILTER: 'clearImpactedServicesFilter',
  CLOSE_FLYOUT: 'closeFlyout',
  CLOSE_SIGNIFICANT_EVENT: 'closeSignificantEvent',
  COLLAPSE_IMPACTED_SERVICES: 'collapseImpactedServices',
  COLLAPSE_DETECTIONS: 'collapseDetections',
  CONNECT_SLACK: 'connectSlack',
  DISCONNECT_SLACK: 'disconnectSlack',
  EDIT_TUNING_DOCUMENT: 'editTuningDocument',
  EXPAND_IMPACTED_SERVICES: 'expandImpactedServices',
  EXPAND_DETECTIONS: 'expandDetections',
  FILTER_BY_IMPACTED_SERVICES: 'filterByImpactedServices',
  OPEN_CUSTOM_CONTEXT: 'openCustomContext',
  OPEN_DETECTION_ENGINE_CONFIRMATION: 'openDetectionEngineConfirmation',
  OPEN_IN_CHAT: 'openInChat',
  OPEN_START_INVESTIGATION: 'openStartInvestigation',
  PAUSE_DETECTION_ENGINE: 'pauseDetectionEngine',
  RESET_TUNING_DOCUMENT: 'resetTuningDocument',
  RESUME_DETECTION_ENGINE: 'resumeDetectionEngine',
  RETRY_INVESTIGATIONS: 'retryInvestigations',
  SAVE_TUNING_DOCUMENT: 'saveTuningDocument',
  SHOW_MORE_INVESTIGATIONS: 'showMoreInvestigations',
  START_INVESTIGATION: EBT_CLICK_ACTIONS.START_INVESTIGATION,
  TOGGLE_SLACK_CHANNELS: 'toggleSlackChannels',
  VIEW_ALL_SIGNIFICANT_EVENTS: 'viewAllSignificantEvents',
  VIEW_DETECTION: 'viewDetection',
  VIEW_ENTITY: 'viewEntity',
  VIEW_INVESTIGATION: EBT_CLICK_ACTIONS.VIEW_INVESTIGATION,
  VIEW_MANAGEMENT: 'viewManagement',
  VIEW_SETTINGS: 'viewSettings',
  VIEW_SIGNIFICANT_EVENT: 'viewSignificantEvent',
  VIEW_SIGNIFICANT_EVENTS: 'viewSignificantEvents',
} as const;

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
  SETTINGS: 'nightshiftSettings',
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
