/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared domain capability modules for the threat-intelligence plugin.
 *
 * Per the Agent Builder architecture guidance, business logic lives here
 * (not in tools). Internal HTTP routes (`server/routes/`) are the canonical
 * execution surface and call into these services. The Agent Builder tool
 * wrappers (`server/agent_builder/tools/`) survive only as thin portability
 * wrappers for 3rd party agents (Claude / Cursor) and they delegate to the
 * exact same services.
 */

export { searchReports } from './search_reports';
export type { SearchReportsParams, SearchReportsResult } from './search_reports';

export { ingestReport } from './ingest_report';
export type { IngestReportParams, IngestReportResult } from './ingest_report';

export { huntBehavior, huntBehaviorLlmExtractionSchema } from './hunt_behavior';
export type {
  HuntBehaviorParams,
  HuntBehaviorResult,
  HuntBehaviorStatus,
  HuntBehaviorAttachmentHint,
  ValidatedBehavior,
} from './hunt_behavior';

export { huntForThreat } from './hunt_for_threat';
export type {
  HuntForThreatParams,
  HuntForThreatResult,
  HuntForThreatStatus,
  HuntForThreatHit,
  HuntIoc,
  AffectedAsset,
} from './hunt_for_threat';

export { coverageGap } from './coverage_gap';
export type { CoverageGapParams, CoverageGapResult, CoverageGapTechniqueRow } from './coverage_gap';

export {
  generalizeFromTelemetry,
  generalizeFromTelemetryLlmExtractionSchema,
} from './generalize_from_telemetry';
export type {
  GeneralizeFromTelemetryParams,
  GeneralizeFromTelemetryResult,
  GeneralizeFromTelemetryStatus,
  GeneralizeFromTelemetryAlertSample,
  GeneralizeFromTelemetryAttachmentHint,
  GeneralizeValidatedBehavior,
} from './generalize_from_telemetry';

export {
  persistSubscription,
  listSubscriptions,
  deleteSubscription,
  resolveSubscriptionParams,
} from './manage_subscriptions';
export type {
  PersistSubscriptionInput,
  PersistSubscriptionResult,
  ListSubscriptionsResult,
  DeleteSubscriptionResult,
  ResolveSubscriptionInput,
  ResolveSubscriptionOutcome,
  ResolvedSubscription,
  SubscriptionDelivery,
} from './manage_subscriptions';

export { extractIocs } from './extract_iocs';
export type { ExtractIocsParams, ExtractIocsResult, ExtractedIoc } from './extract_iocs';

export { analyseEnvironment } from './analyse_environment';
export type { AnalyseEnvironmentParams, AnalyseEnvironmentResult } from './analyse_environment';
