/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Types
export * from './types';

// Services
export {
  EntityExtractionService,
  CaseMatchingService,
  type CaseData,
  type CaseObservable,
} from './services';

// Persistence
export { WorkflowDataClient } from './persistence';
export * from './persistence/constants';

// Workflows
export {
  AlertGroupingWorkflowExecutor,
  type WorkflowExecutorDependencies,
  type AlertGroupingWorkflowState,
  type AlertDocument,
  type GroupingDecision,
  createInitialState,
} from './workflows/default_alert_grouping_workflow';

// Cases integration
export {
  ObservableAutoExtractor,
  CaseEventTriggerService,
  CaseEventType,
  TriggerAction,
  DEFAULT_OBSERVABLE_AUTO_EXTRACTION_CONFIG,
  type CaseObservable as AutoExtractedObservable,
  type ObservableAutoExtractionConfig,
  type ObservableExtractionResult,
  type CaseEvent,
  type TriggerActionRequest,
} from './cases';

// Task Manager integration
export {
  AlertGroupingTask,
  getAlertGroupingTask,
  type AlertGroupingTaskSetupParams,
  type AlertGroupingTaskStartParams,
  type AlertGroupingTaskState,
} from './tasks';
