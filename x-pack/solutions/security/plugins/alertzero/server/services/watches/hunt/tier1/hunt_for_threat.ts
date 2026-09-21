/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  AffectedAsset,
  HuntForThreatHit,
  HuntForThreatParams,
  HuntForThreatResult,
  HuntIoc,
} from './types';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const termClause = (field: string, value: string): Record<string, unknown> => ({
  term: { [field]: value },
});

/**
 * Ported verbatim from mustard's `buildIocShould` (`hunt_for_threat.ts:106-168`):
 * the per-IOC `should` clause across every ECS field the value might
 * reasonably land in, not narrowed by event source since the same IOC type
 * can appear in several ECS slots depending on which integration produced
 * the document.
 */
const buildIocShould = (iocs: HuntIoc[]): Array<Record<string, unknown>> => {
  const clauses: Array<Record<string, unknown>> = [];
  for (const { type, value } of iocs) {
    switch (type) {
      case 'ip':
        clauses.push(
          termClause('source.ip', value),
          termClause('destination.ip', value),
          termClause('host.ip', value),
          termClause('client.ip', value),
          termClause('server.ip', value),
          // ECS related + Kubernetes audit commonly stamp IPs here when
          // `source.ip` is absent (e.g. Technology Watch kubernetes pack).
          termClause('related.ip', value),
          termClause('kubernetes.audit.sourceIPs', value)
        );
        break;
      case 'email':
        clauses.push(
          termClause('user.email', value),
          termClause('user.name', value),
          termClause('user.target.email', value),
          termClause('user.target.name', value),
          termClause('related.user', value)
        );
        break;
      case 'domain':
        clauses.push(
          termClause('dns.question.name', value),
          termClause('destination.domain', value),
          termClause('url.domain', value),
          termClause('source.domain', value)
        );
        break;
      case 'url':
        clauses.push(termClause('url.full', value), termClause('url.original', value));
        break;
      case 'hash': {
        const hashLen = value.length;
        const field =
          hashLen === 32
            ? 'file.hash.md5'
            : hashLen === 40
            ? 'file.hash.sha1'
            : hashLen === 64
            ? 'file.hash.sha256'
            : null;
        if (field) {
          clauses.push(
            termClause(field, value),
            termClause(field.replace('file.', 'process.'), value),
            termClause(field.replace('file.', 'dll.'), value)
          );
        }
        break;
      }
      default:
        break;
    }
  }
  return clauses;
};

/** Ported verbatim from mustard's `buildTechniqueShould` (`hunt_for_threat.ts:171-174`). */
const buildTechniqueShould = (techniques: string[]): Array<Record<string, unknown>> =>
  techniques.length === 0
    ? []
    : [{ terms: { 'kibana.alert.rule.threat.technique.id': techniques } }];

const emptyResult = (
  status: HuntForThreatResult['status'],
  resolvedIocs: HuntIoc[],
  resolvedTechniques: string[],
  timeRange: { from: string; to: string },
  message: string
): HuntForThreatResult => ({
  status,
  hasConfirmedHit: false,
  searchedIocs: resolvedIocs.length,
  searchedTechniques: resolvedTechniques.length,
  resolvedIocs,
  resolvedTechniques,
  timeRange,
  counts: { totalHits: 0, returnedHits: 0, affectedHosts: 0, affectedUsers: 0 },
  hits: [],
  affectedAssets: { hosts: [], users: [] },
  perIndex: [],
  message,
});

interface HuntAggregations {
  per_index?: { buckets: Array<{ key: string; doc_count: number }> };
  affected_hosts?: { buckets: Array<{ key: string; doc_count: number }> };
  affected_users?: { buckets: Array<{ key: string; doc_count: number }> };
}

/**
 * Tier 1 deterministic hunt: search the scope A2 resolved for a report's
 * IOCs and/or ATT&CK technique IDs (lifted from mustard's
 * `hunt_for_threat.ts`, 379 lines, plan.md Phase 3). The one adaptation:
 * the index list comes from `params.scope` (A2) rather than the hardcoded
 * `HUNT_FOR_THREAT_INDEX_PATTERNS` allow-list — everything about the query
 * shape is proven and stays as-is.
 *
 * The hit bar (hunt-watch-implementation.md:42): a hit requires at least
 * one confirmed event match in a *required* pattern inside the window. A
 * match only in an optional pattern (including the alerts pattern), or
 * outside the window, does not set `hasConfirmedHit` — it can still show
 * up in `hits`/`counts`/`perIndex` for context, but the coordinator (F3)
 * and the `evidence[]` writer (F4, now the managed-workflow evidence step,
 * not a service) must only treat `hasConfirmedHit` as evidence.
 */
export const huntForThreat = async (
  esClient: ElasticsearchClient,
  params: HuntForThreatParams
): Promise<HuntForThreatResult> => {
  const { scope, iocs = [], techniques = [], timeRange, size, maxAssets = 50 } = params;

  const from = timeRange?.from ?? scope.window.from;
  const to = timeRange?.to ?? scope.window.to;
  const rowLimit = size ?? scope.rowLimit;

  const iocShould = buildIocShould(iocs);
  const techniqueShould = buildTechniqueShould(techniques);
  const should = [...iocShould, ...techniqueShould];

  if (should.length === 0) {
    return emptyResult(
      'no_searchable_terms',
      iocs,
      techniques,
      { from, to },
      'IOCs and/or ATT&CK technique IDs were passed but none mapped to a known ECS field ' +
        '(e.g. hashes with non-standard lengths, or an unsupported IOC type). Re-run with ' +
        'a normalized set of IOCs/techniques.'
    );
  }

  // `required` and `optional` (which already includes the space-derived
  // alerts pattern, see A2) are searched together with `ignore_unavailable`
  // and `allow_no_indices` (mustard `hunt_for_threat.ts:283-285`): a scope
  // that reached this point already passed A2's blocked/degraded gate, so
  // the search itself never needs to distinguish required from optional —
  // that distinction only matters for the hit bar below.
  const searchIndices = [...scope.required, ...scope.optional];
  // `perIndex` buckets on `_index`, which is a concrete index/data-stream name
  // (e.g. `logs-aws.cloudtrail-default`), never the wildcard pattern it
  // resolved from (e.g. `logs-aws.*`) — so the required check below needs
  // pattern matching, not set membership.
  const requiredPatterns = scope.required.map(
    (pattern) => new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)
  );
  const matchesRequired = (index: string): boolean =>
    requiredPatterns.some((pattern) => pattern.test(index));

  const response = await esClient.search({
    index: searchIndices,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: rowLimit,
    track_total_hits: true,
    sort: [{ '@timestamp': { order: 'desc' } }],
    _source: [
      '@timestamp',
      'event.dataset',
      'event.module',
      'host.name',
      'host.os.family',
      'user.name',
      'source.ip',
      'destination.ip',
      'url.full',
      'kibana.alert.rule.name',
      'kibana.alert.rule.threat.technique',
    ],
    query: {
      bool: {
        filter: [{ range: { '@timestamp': { gte: from, lte: to } } }],
        should,
        minimum_should_match: 1,
      },
    },
    aggs: {
      per_index: {
        terms: { field: '_index', size: searchIndices.length * 4 },
      },
      affected_hosts: {
        terms: { field: 'host.name', size: maxAssets },
      },
      affected_users: {
        terms: { field: 'user.name', size: maxAssets },
      },
    },
  });

  const aggs = response.aggregations as HuntAggregations | undefined;

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;
  const hits = (response.hits.hits ?? []).map(
    (hit): HuntForThreatHit => ({
      index: hit._index,
      id: hit._id ?? '',
      score: hit._score ?? null,
      ...(hit._source as Record<string, unknown>),
    })
  );

  const hosts: AffectedAsset[] = (aggs?.affected_hosts?.buckets ?? []).map((b) => ({
    name: b.key,
    hitCount: b.doc_count,
  }));
  const users: AffectedAsset[] = (aggs?.affected_users?.buckets ?? []).map((b) => ({
    name: b.key,
    hitCount: b.doc_count,
  }));
  const perIndex = (aggs?.per_index?.buckets ?? []).map((b) => ({
    index: b.key,
    hitCount: b.doc_count,
    required: matchesRequired(b.key),
  }));

  const hasConfirmedHit = perIndex.some((bucket) => bucket.required && bucket.hitCount > 0);

  return {
    status: total === 0 ? 'no_environment_hits' : 'environment_hits_found',
    hasConfirmedHit,
    searchedIocs: iocs.length,
    searchedTechniques: techniques.length,
    resolvedIocs: iocs,
    resolvedTechniques: techniques,
    timeRange: { from, to },
    counts: {
      totalHits: total,
      returnedHits: hits.length,
      affectedHosts: hosts.length,
      affectedUsers: users.length,
    },
    hits,
    affectedAssets: { hosts, users },
    perIndex,
  };
};
