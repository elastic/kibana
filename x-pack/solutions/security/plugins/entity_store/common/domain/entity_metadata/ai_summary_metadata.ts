/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AiSummaryHighlightItem {
  title: string;
  text: string;
}

export interface AiSummaryMetadataStalenessSnapshot {
  risk_score?: number | null;
}

export interface AiSummaryMetadataStaleness {
  enabled_signals: Array<'risk_score'>;
  snapshot: AiSummaryMetadataStalenessSnapshot;
}

/**
 * Document shape written to the entity metadata data stream
 * (`.entities.v2.metadata.security_{namespace}`) when an AI summary is generated.
 *
 * AI-summary-specific fields are scoped under the `ai_summary.*` prefix, following
 * the `Maintainer.*` convention used by relationship metadata docs in the same stream.
 * This prevents naming conflicts as the stream gains new doc types over time.
 *
 * Written via `EntityMetadataClient.bulkAppendMetadata` using `asInternalUser` —
 * no per-user index write privilege is required. `ai_summary.generated_by` records
 * the authenticated user who triggered generation and is set server-side.
 */
export interface AiSummaryMetadataDoc {
  '@timestamp': string;
  'event.kind': 'event';
  'event.action': 'ai_summary_generated';
  'event.ingested'?: string;
  'entity.id': string;
  'entity.type': string;
  'ai_summary.generated_by': string;
  'ai_summary.generated_at': number;
  'ai_summary.highlights': AiSummaryHighlightItem[];
  'ai_summary.recommendedActions'?: string[] | null;
  'ai_summary.anomaly_job_ids'?: string[];
  'ai_summary.variant_id'?: string;
  'ai_summary.staleness': AiSummaryMetadataStaleness;
}
