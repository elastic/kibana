/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertGroupingWorkflowConfig,
  ExtractedEntity,
  WorkflowExecutionMetrics,
  DryRunResult,
} from '../../../types';
import type { CaseData } from '../../../services';

/**
 * Alert document from Elasticsearch
 */
export interface AlertDocument {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

/**
 * Matched observable details for debugging
 */
export interface MatchedObservableDetail {
  /** Observable type (e.g., 'ipv4', 'hostname') */
  type: string;
  /** Observable value */
  value: string;
  /** Entity value from alert that matched */
  matchedEntityValue: string;
  /** Observable ID from case (if available) */
  observableId?: string;
}

/**
 * Grouping decision for an alert
 */
export interface GroupingDecision {
  alertId: string;
  alertIndex: string;
  /** Case ID to attach to (undefined if creating new case) */
  caseId?: string;
  /** Whether this alert triggers a new case creation */
  createNewCase: boolean;
  /** Match score if matched to existing case */
  matchScore?: number;
  /** Entities extracted from this alert */
  entities: ExtractedEntity[];
  /** Human-readable explanation of why this decision was made */
  explanation: string;
  /** Details of matched observables (for debugging) */
  matchedObservables?: MatchedObservableDetail[];
}

/**
 * State for the alert grouping workflow
 */
export interface AlertGroupingWorkflowState {
  /** Workflow configuration */
  config: AlertGroupingWorkflowConfig;

  /** Whether this is a dry run */
  isDryRun: boolean;

  /** Current step in the workflow */
  currentStep:
    | 'fetch_alerts'
    | 'extract_entities'
    | 'clustering_pipeline'
    | 'llm_classification'
    | 'match_cases'
    | 'create_cases'
    | 'attach_alerts'
    | 'generate_attack_discovery'
    | 'validate_alert_relevance'
    | 'merge_related_cases'
    | 'tag_alerts'
    | 'complete';

  /** Alerts fetched from Elasticsearch */
  alerts: AlertDocument[];

  /** Entities extracted from alerts, keyed by alert ID */
  alertEntities: Map<string, ExtractedEntity[]>;

  /** All unique entities across all alerts */
  allEntities: ExtractedEntity[];

  /** Existing cases that might match */
  existingCases: CaseData[];

  /** Grouping decisions for each alert */
  groupingDecisions: GroupingDecision[];

  /** Cases created during this execution */
  createdCases: Map<string, { id: string; title: string }>;

  /** Attack discoveries generated */
  attackDiscoveries: Map<string, string>; // caseId -> attackDiscoveryId

  /** Alerts removed from cases after validation (not part of attack) */
  removedAlerts: Array<{
    alertId: string;
    alertIndex: string;
    caseId: string;
    reason: string;
  }>;

  /** Cases that were merged */
  mergedCases: Array<{
    sourceCaseId: string;
    sourceCaseTitle: string;
    targetCaseId: string;
    targetCaseTitle: string;
    reason: string;
  }>;

  /** Alerts that were tagged */
  taggedAlertIds: string[];

  /** Execution metrics */
  metrics: WorkflowExecutionMetrics;

  /** Errors encountered */
  errors: string[];

  /** Dry run result (only populated if isDryRun is true) */
  dryRunResult?: DryRunResult;
}

/**
 * Create initial workflow state
 */
export function createInitialState(
  config: AlertGroupingWorkflowConfig,
  isDryRun: boolean
): AlertGroupingWorkflowState {
  return {
    config,
    isDryRun,
    currentStep: 'fetch_alerts',
    alerts: [],
    alertEntities: new Map(),
    allEntities: [],
    existingCases: [],
    groupingDecisions: [],
    createdCases: new Map(),
    attackDiscoveries: new Map(),
    removedAlerts: [],
    mergedCases: [],
    taggedAlertIds: [],
    metrics: {
      alertsScanned: 0,
      alertsProcessed: 0,
      alertsGrouped: 0,
      entitiesExtracted: 0,
      casesMatched: 0,
      casesCreated: 0,
      casesUpdated: 0,
      attackDiscoveriesGenerated: 0,
      attackDiscoveriesMerged: 0,
      alertsRemovedFromCases: 0,
      casesMerged: 0,
      durationMs: 0,
    },
    errors: [],
  };
}
