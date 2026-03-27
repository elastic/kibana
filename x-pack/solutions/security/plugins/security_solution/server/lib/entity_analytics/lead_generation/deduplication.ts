/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { Lead } from '../../../../common/entity_analytics/lead_generation/types';

// ---------------------------------------------------------------------------
// Minimal structural type that both the server-side engine Lead and the
// common API Lead satisfy. This avoids coupling the hash functions to a
// single nominal Lead definition.
// ---------------------------------------------------------------------------

interface HashableLeadInput {
  readonly entities: ReadonlyArray<{ readonly type: string; readonly name: string }>;
  readonly observations: ReadonlyArray<{
    readonly moduleId: string;
    readonly type: string;
    readonly severity: string;
  }>;
}

// ---------------------------------------------------------------------------
// Hash generation
// ---------------------------------------------------------------------------

/**
 * Deterministic SHA-256 over the content-defining fields of a lead.
 * Two leads with the same content hash are considered identical.
 *
 * Inputs: sorted entity identifiers, sorted observation fingerprints
 * (moduleId:type:severity), and spaceId for namespace isolation.
 *
 * Intentionally excludes LLM-generated text (title, description, byline),
 * continuous score values, and timestamps — those may fluctuate between
 * runs without changing the semantic identity of the lead.
 */
export const generateLeadContentHash = (lead: HashableLeadInput, spaceId: string): string => {
  const entityKey = lead.entities
    .map((e) => `${e.type}:${e.name}`)
    .sort()
    .join('|');

  const observationKey = lead.observations
    .map((o) => `${o.moduleId}:${o.type}:${o.severity}`)
    .sort()
    .join('|');

  return createHash('sha256')
    .update(entityKey)
    .update(observationKey)
    .update(spaceId)
    .digest('hex');
};

/**
 * Deterministic SHA-256 over entity identifiers only.
 * Two leads with the same entity hash target the same entity (or entity set)
 * but may carry different observation data — used for versioning.
 */
export const generateLeadEntityHash = (lead: HashableLeadInput, spaceId: string): string => {
  const entityKey = lead.entities
    .map((e) => `${e.type}:${e.name}`)
    .sort()
    .join('|');

  return createHash('sha256').update(entityKey).update(spaceId).digest('hex');
};

// ---------------------------------------------------------------------------
// Deduplication result
// ---------------------------------------------------------------------------

export interface DeduplicationResult {
  /** Leads that have no match in the index — index as new. */
  readonly newLeads: readonly Lead[];
  /** Content hashes of leads that are exact duplicates of existing docs. */
  readonly exactDuplicateHashes: readonly string[];
  /** Leads whose entity matches an existing doc but content has changed. */
  readonly versionCandidates: readonly Lead[];
}

// ---------------------------------------------------------------------------
// Deduplication logic
// ---------------------------------------------------------------------------

interface DeduplicateLeadsParams {
  readonly candidates: readonly Lead[];
  readonly esClient: ElasticsearchClient;
  readonly indexPattern: string;
  readonly logger: Logger;
  readonly spaceId: string;
}

/**
 * Splits candidate leads into three buckets:
 *
 * 1. **exactDuplicates** — content_hash already exists in the index → skip.
 * 2. **versionCandidates** — entity_hash matches but content_hash differs → version.
 * 3. **newLeads** — no match at all → create fresh.
 *
 * Pattern follows Attack Discovery's `deduplicateAttackDiscoveries`.
 */
export const deduplicateLeads = async ({
  candidates,
  esClient,
  indexPattern,
  logger,
  spaceId,
}: DeduplicateLeadsParams): Promise<DeduplicationResult> => {
  if (candidates.length === 0) {
    return { newLeads: [], exactDuplicateHashes: [], versionCandidates: [] };
  }

  const contentHashes = candidates.map((lead) => generateLeadContentHash(lead, spaceId));

  // Step 1: search for existing content_hash values (exact dedup)
  let existingContentHashes: Set<string>;
  try {
    const contentResp = await esClient.search<{ content_hash: string }>({
      index: indexPattern,
      size: contentHashes.length,
      query: { bool: { must: [{ terms: { content_hash: contentHashes } }] } },
      _source: ['content_hash'],
      ignore_unavailable: true,
    });

    existingContentHashes = new Set(
      contentResp.hits.hits
        .map((hit) => hit._source?.content_hash)
        .filter((h): h is string => h != null)
    );
  } catch (e) {
    logger.debug(`[LeadGeneration] Dedup content-hash lookup failed, treating all as new: ${e}`);
    existingContentHashes = new Set();
  }

  const exactDuplicateHashes: string[] = [];
  const nonDuplicates: Lead[] = [];

  candidates.forEach((lead, idx) => {
    if (existingContentHashes.has(contentHashes[idx])) {
      exactDuplicateHashes.push(contentHashes[idx]);
    } else {
      nonDuplicates.push(lead);
    }
  });

  if (exactDuplicateHashes.length > 0) {
    logger.info(
      `[LeadGeneration] Dedup: ${exactDuplicateHashes.length} exact duplicate(s) found, skipping.`
    );
  }

  if (nonDuplicates.length === 0) {
    return { newLeads: [], exactDuplicateHashes, versionCandidates: [] };
  }

  // Step 2: search for existing entity_hash values (version candidates)
  const entityHashes = nonDuplicates.map((lead) => generateLeadEntityHash(lead, spaceId));

  let existingEntityHashes: Set<string>;
  try {
    const entityResp = await esClient.search<{ entity_hash: string }>({
      index: indexPattern,
      size: entityHashes.length,
      query: { bool: { must: [{ terms: { entity_hash: entityHashes } }] } },
      _source: ['entity_hash'],
      ignore_unavailable: true,
    });

    existingEntityHashes = new Set(
      entityResp.hits.hits
        .map((hit) => hit._source?.entity_hash)
        .filter((h): h is string => h != null)
    );
  } catch (e) {
    logger.debug(`[LeadGeneration] Dedup entity-hash lookup failed, treating all as new: ${e}`);
    existingEntityHashes = new Set();
  }

  const versionCandidates: Lead[] = [];
  const newLeads: Lead[] = [];

  nonDuplicates.forEach((lead, idx) => {
    if (existingEntityHashes.has(entityHashes[idx])) {
      versionCandidates.push(lead);
    } else {
      newLeads.push(lead);
    }
  });

  if (versionCandidates.length > 0) {
    logger.info(
      `[LeadGeneration] Dedup: ${versionCandidates.length} version candidate(s) found (entity match, content changed).`
    );
  }

  return { newLeads, exactDuplicateHashes, versionCandidates };
};
