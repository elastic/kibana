/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `event.action` discriminator that identifies AI-summary docs in the shared
 * metadata datastream. Reused by the write route, the read query, and the doc type
 * so the literal is defined once.
 */
export const AI_SUMMARY_EVENT_ACTION = 'ai_summary_generated' as const;

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
 * AI-summary-specific fields are scoped under the `Ai_summary.*` prefix, following
 * the `Maintainer.*` convention used by relationship metadata docs in the same stream.
 * The prefix is capitalized so it can never collide with a future ECS field (ECS
 * field names are always lowercase). This also prevents naming conflicts as the
 * stream gains new doc types over time.
 *
 * Written via `EntityMetadataClient.bulkAppendMetadata` using `asInternalUser` —
 * no per-user index write privilege is required. `Ai_summary.generated_by` records
 * the authenticated user who triggered generation and is set server-side.
 */
export interface AiSummaryMetadataDoc {
  '@timestamp': string;
  'event.kind': 'event';
  'event.action': typeof AI_SUMMARY_EVENT_ACTION;
  'event.ingested'?: string;
  'entity.id': string;
  'entity.type': string;
  'Ai_summary.generated_by': string;
  'Ai_summary.author_profile_uid'?: string;
  'Ai_summary.generated_at': number;
  'Ai_summary.highlights': AiSummaryHighlightItem[];
  'Ai_summary.recommended_actions'?: string[] | null;
  'Ai_summary.anomaly_job_ids'?: string[];
  'Ai_summary.variant_id'?: string;
  'Ai_summary.staleness': AiSummaryMetadataStaleness;
}
