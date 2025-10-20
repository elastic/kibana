/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Main exports
export { agentBuilderExecute } from './agent_builder_execute';

// Type exports
export type {
  AgentBuilderExecuteParams,
  StreamingExecutionParams,
  NonStreamingExecutionParams,
  ToolResultProcessorParams,
  ToolResultsProcessorParams,
  ExtendedKibanaRequest,
} from './types';

// Helper function exports
export {
  generateConversationTitle,
  convertMessagesToConversationRounds,
  isProductDocumentationResult,
  isAlertCountsResult,
  isOpenAndAcknowledgedAlertsResult,
  isKnowledgeBaseRetrievalResult,
  isKnowledgeBaseWriteResult,
  isSecurityLabsKnowledgeResult,
  isIntegrationKnowledgeResult,
  isEntityRiskScoreResult,
} from './helpers';

// Processor exports
export {
  registerCitationsFromToolResult,
  processProductDocumentationResults,
  processAlertResults,
  processKnowledgeBaseRetrievalResults,
  processKnowledgeBaseWriteResults,
  processSecurityLabsKnowledgeResults,
  processIntegrationKnowledgeResults,
  processEntityRiskScoreResults,
  processToolResult,
  processToolResults,
} from './processors';

// Execution exports
export { executeStreaming, executeNonStreaming } from './execution';
