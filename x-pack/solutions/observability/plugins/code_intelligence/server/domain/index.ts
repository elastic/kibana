/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { deduplicateEvidence } from './deduplicate_evidence';
export {
  generateLogTemplates,
  type TemplateGenerationContext,
} from './logging/generate_log_templates';
export { generateOtelTemplates } from './otel/generate_otel_templates';
export { deduplicateTemplates, type GeneratedTemplate } from './templates/deduplicate_templates';
export {
  normalizeTemplateQuery,
  semanticDigest,
  sha256Digest,
  templateIdentity,
  type TemplateIdentityInput,
} from './templates/template_identity';
export { discoverLoggingCandidates } from './logging/discover_logging_candidates';
export type {
  LoggingCandidate,
  LoggingDiscoveryDiagnostic,
  LoggingDiscoveryResult,
} from './logging/discover_logging_candidates';
export {
  extractLogSignatures,
  staticPrefixOf,
  staticSegmentsOf,
} from './logging/extract_log_signatures';
export type {
  ClassifiedLogMessage,
  LoggingSignatureInput,
  LogSignature,
} from './logging/extract_log_signatures';
export { loggingIdiomPatterns } from './logging/idiom_patterns';
export { detectOtelInstrumentation } from './otel/detect_otel_instrumentation';
export type {
  OtelInstrumentationDetection,
  OtelInstrumentationDetectionResult,
  OtelInstrumentationDiagnostic,
  OtelSignalCounts,
} from './otel/detect_otel_instrumentation';
export { discoverOtelSignals } from './otel/discover_otel_signals';
export type { OtelDiscoveryDiagnostic, OtelDiscoveryResult } from './otel/discover_otel_signals';
export { extractOtelSignalsFromWindows, type OtelSourceWindow } from './otel/extract_otel_signals';
export {
  otelInstrumentationPatterns,
  type OtelInstrumentationKind,
} from './otel/instrumentation_patterns';
export { isProductionOtelPath } from './otel/path_policy';
export { isNonEmittingLoggingLine } from './logging/non_emitting_line_policy';
export { isExcludedLoggingPath } from './logging/path_policy';
export {
  catalogDocumentRt,
  catalogWriteFailureRt,
  catalogWriteRequestRt,
  catalogWriteResultRt,
  sourceHashRt,
  type CatalogDocument,
  type CatalogWriteFailure,
  type CatalogWriteRequest,
  type CatalogWriteResult,
} from './models/catalog_document_codec';
export { candidateIdFor, candidateIdRt, type CandidateId } from './models/candidate_id_codec';
export {
  partitionClassificationResults,
  type ClassificationPartition,
} from './models/classification_completeness';
export {
  MAX_CLASSIFICATION_CANDIDATES,
  MAX_CLASSIFICATION_EVIDENCE,
  MAX_CLASSIFICATION_EXCERPT_BYTES,
  MAX_WORKFLOW_PATH_LENGTH,
  MAX_WORKFLOW_REQUEST_BYTES,
  logLevelRt,
  loggingClassificationCandidateRt,
  loggingClassificationRequestRt,
  loggingClassificationRt,
  otelClassificationCandidateRt,
  otelClassificationRequestRt,
  otelClassificationRt,
  otelSignalMetadataRt,
  severityScoreRt,
  type LoggingClassification,
  type LoggingClassificationCandidate,
  type LoggingClassificationRequest,
  type OtelClassification,
  type OtelClassificationCandidate,
  type OtelClassificationRequest,
  type OtelSignalMetadata,
} from './models/classification_codec';
export {
  otelMetricKindRt,
  otelSignalKindRt,
  otelSignalRt,
  otelValueHintRt,
  type OtelMetricKind,
  type OtelSignal,
  type OtelSignalKind,
  type OtelValueHint,
} from './models/otel_signal_codec';
export {
  operationErrorRt,
  type OperationError,
  type OperationResult,
  type PageResult,
} from './models/operation_result';
export {
  esqlFieldName,
  esqlStringLiteral,
  queryTemplateRt,
  queryValidationResultRt,
  signalTypeRt,
  type QueryTemplate,
  type QueryValidationResult,
  type SignalType,
} from './models/query_codec';
export {
  commitShaRt,
  repositoryRevisionRequestRt,
  resolvedRepositoryRt,
  type RepositoryRevisionRequest,
  type ResolvedRepository,
} from './models/repository_codec';
export {
  grepMatchRt,
  grepRequestRt,
  MAX_SOURCE_WINDOW_LINES,
  sourcePageRequestRt,
  sourcePathRt,
  sourceWindowRequestRt,
  sourceWindowRt,
} from './models/source_codec';
export {
  type CatalogPruneRequest,
  type CatalogPruneResult,
  type CatalogWriter,
} from './ports/catalog_writer';
export { type QueryValidator } from './ports/query_validator';
export { type RepositoryResolver } from './ports/repository_resolver';
export {
  type GrepMatch,
  type GrepRequest,
  type SourcePageRequest,
  type SourcePath,
  type SourceReader,
  type SourceWindow,
  type SourceWindowRequest,
} from './ports/source_reader';
export {
  type ClassificationWorkflowClient,
  type WorkflowDefinition,
  type WorkflowInstallation,
  type WorkflowInstallationFailure,
  type WorkflowInstaller,
} from './ports/workflows';
export {
  boundedExcerptRt,
  nonEmptyStringRt,
  positiveIntegerRt,
  repositoryRelativePathRt,
  sourceLocationRt,
  type SourceLocation,
} from './source_location_codec';
