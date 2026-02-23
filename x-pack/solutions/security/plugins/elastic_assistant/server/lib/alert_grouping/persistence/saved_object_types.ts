/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import {
  ALERT_GROUPING_WORKFLOW_SO_TYPE,
  ALERT_GROUPING_EXECUTION_SO_TYPE,
  CASE_TRIGGER_SO_TYPE,
  BATCH_SIZE_CACHE_SO_TYPE,
} from './constants';

/**
 * Saved object type for alert grouping workflows
 */
export const alertGroupingWorkflowType: SavedObjectsType = {
  name: ALERT_GROUPING_WORKFLOW_SO_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'text' },
      description: { type: 'text' },
      enabled: { type: 'boolean' },
      schedule: { type: 'text' },
      alertFilter: { type: 'text' },
      groupingConfig: { type: 'text' },
      attackDiscoveryConfig: { type: 'text' },
      apiConfig: { type: 'text' },
      caseTemplate: { type: 'text' },
      tags: { type: 'keyword' },
      spaceId: { type: 'keyword' },
      createdAt: { type: 'date' },
      createdBy: { type: 'keyword' },
      updatedAt: { type: 'date' },
      updatedBy: { type: 'keyword' },
    },
  },
};

/**
 * Saved object type for workflow execution history
 */
export const alertGroupingExecutionType: SavedObjectsType = {
  name: ALERT_GROUPING_EXECUTION_SO_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      workflowId: { type: 'keyword' },
      status: { type: 'keyword' },
      startedAt: { type: 'date' },
      completedAt: { type: 'date' },
      triggeredBy: { type: 'keyword' },
      error: { type: 'text' },
      metrics: { type: 'text' },
      isDryRun: { type: 'boolean' },
      spaceId: { type: 'keyword' },
    },
  },
};

/**
 * Saved object type for case triggers
 */
export const caseTriggerType: SavedObjectsType = {
  name: CASE_TRIGGER_SO_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'text' },
      description: { type: 'text' },
      enabled: { type: 'boolean' },
      eventType: { type: 'keyword' },
      conditions: { type: 'text' },
      action: { type: 'text' },
      spaceId: { type: 'keyword' },
      createdAt: { type: 'date' },
      createdBy: { type: 'keyword' },
      lastTriggered: { type: 'date' },
      triggerCount: { type: 'integer' },
    },
  },
};

/**
 * Saved object type for batch size cache
 */
export const batchSizeCacheType: SavedObjectsType = {
  name: BATCH_SIZE_CACHE_SO_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      connectorId: { type: 'keyword' },
      batchSize: { type: 'integer' },
      updatedAt: { type: 'date' },
    },
  },
};

/**
 * All alert grouping saved object types
 */
export const alertGroupingSavedObjectTypes: SavedObjectsType[] = [
  alertGroupingWorkflowType,
  alertGroupingExecutionType,
  caseTriggerType,
  batchSizeCacheType,
];
