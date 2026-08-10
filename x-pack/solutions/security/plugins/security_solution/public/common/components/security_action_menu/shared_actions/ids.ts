/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable IDs for actions reused by more than one Security Solution menu.
 * Consumers opt into these IDs and continue to own their local presets and groups.
 */
export const SHARED_ACTION_IDS = {
  addToCase: 'addToCase',
  addToExistingCase: 'addToExistingCase',
  addToNewCase: 'addToNewCase',
  markAsOpen: 'markAsOpen',
  markAsAcknowledged: 'markAsAcknowledged',
  markAsClosed: 'markAsClosed',
  applyAlertTags: 'applyAlertTags',
  assignAlert: 'assignAlert',
  unassignAlert: 'unassignAlert',
  addEndpointException: 'addEndpointException',
  addRuleException: 'addRuleException',
  addEndpointEventFilter: 'addEndpointEventFilter',
  runWorkflow: 'runWorkflow',
  runOsquery: 'runOsquery',
  investigateInTimeline: 'investigateInTimeline',
  explore: 'explore',
  openAiAssistant: 'openAiAssistant',
  addToDataset: 'addToDataset',
} as const;
