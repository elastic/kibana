/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EBT_CLICK_ACTIONS } from '@kbn/ebt-click';

export const NIGHTSHIFT_EBT_ACTIONS = {
  CANCEL_AUTOMATION_EDIT: 'cancelAutomationEdit',
  CLEAR_AUTOMATION_FILTERS: 'clearAutomationFilters',
  CLEAR_IMPACTED_SERVICES_FILTER: 'clearImpactedServicesFilter',
  CLOSE_FLYOUT: 'closeFlyout',
  CLOSE_SIGNIFICANT_EVENT: 'closeSignificantEvent',
  COLLAPSE_IMPACTED_SERVICES: 'collapseImpactedServices',
  COLLAPSE_DETECTIONS: 'collapseDetections',
  CLONE_AUTOMATION: 'cloneAutomation',
  CREATE_AUTOMATION: 'createAutomation',
  DELETE_AUTOMATION: 'deleteAutomation',
  EDIT_AUTOMATION: 'editAutomation',
  EXPAND_IMPACTED_SERVICES: 'expandImpactedServices',
  EXPAND_DETECTIONS: 'expandDetections',
  FILTER_BY_IMPACTED_SERVICES: 'filterByImpactedServices',
  OPEN_AUTOMATION: 'openAutomation',
  OPEN_IN_CHAT: 'openInChat',
  OPEN_START_INVESTIGATION: 'openStartInvestigation',
  RETRY_INVESTIGATIONS: 'retryInvestigations',
  SAVE_AND_ENABLE_AUTOMATION: 'saveAndEnableAutomation',
  SAVE_AUTOMATION: 'saveAutomation',
  SHOW_MORE_INVESTIGATIONS: 'showMoreInvestigations',
  TOGGLE_AUTOMATION: 'toggleAutomation',
  START_INVESTIGATION: EBT_CLICK_ACTIONS.START_INVESTIGATION,
  VIEW_ALL_SIGNIFICANT_EVENTS: 'viewAllSignificantEvents',
  VIEW_AUTOMATION_RUNS: 'viewAutomationRuns',
  VIEW_DETECTION: 'viewDetection',
  VIEW_ENTITY: 'viewEntity',
  VIEW_INVESTIGATION: EBT_CLICK_ACTIONS.VIEW_INVESTIGATION,
  VIEW_MANAGEMENT: 'viewManagement',
  VIEW_SETTINGS: 'viewSettings',
  VIEW_SIGNIFICANT_EVENT: 'viewSignificantEvent',
  VIEW_SIGNIFICANT_EVENTS: 'viewSignificantEvents',
} as const;

export const NIGHTSHIFT_EBT_ELEMENTS = {
  AUTOMATIONS_CREATE_FLYOUT: 'automationsCreateFlyout',
  AUTOMATIONS_DETAIL_FLYOUT: 'automationsDetailFlyout',
  AUTOMATIONS_LIST: 'automationsList',
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
