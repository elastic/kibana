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
  HuntForThreatResult,
  HuntIoc,
} from '@kbn/alertzero-common';
import { buildMatchesRequired } from '../common/matches_required';
import { attributeHits } from './attribute_hits';
import type { HuntForThreatParams } from './types';

const termClause = (field: string, value: string): Record<string, unknown> => ({
  term: { [field]: value },
});

/**
 * Per-IOC `should` clause across every ECS field the value might reasonably
 * land in, not narrowed by event source since the same IOC type can appear
 * in several ECS slots depending on which integration produced the document.
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

const buildTechniqueShould = (techniques: string[]): Array<Record<string, unknown>> =>
  techniques.length === 0
    ? []
    : [{ terms: { 'kibana.alert.rule.threat.technique.id': techniques } }];

export const emptyHuntForThreatResult = (
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
  affectedAssets: { hosts: [], users: [], services: [] },
  perIndex: [],
  message,
});

interface HuntAggregations {
  per_index?: { buckets: Array<{ key: string; doc_count: number }> };
  affected_hosts?: { buckets: Array<{ key: string; doc_count: number }> };
  affected_users?: {
    buckets: Array<{
      key: string;
      doc_count: number;
      identity_types?: { buckets: Array<{ key: string; doc_count: number }> };
    }>;
  };
}

/**
 * AWS CloudTrail `user_identity.type` values that represent a non-person
 * credential (an assumed IAM role, an AWS service principal, or a
 * cross-account role) rather than an actual human user. `user.name` for
 * these is a role/service name (e.g. `escalated-role` assumed via
 * `sts:AssumeRole`), so surfacing it as a Security "user" entity is wrong:
 * it will never resolve on the Users page, human or not. See
 * `classifyIdentityType` below.
 */
const NON_HUMAN_AWS_IDENTITY_TYPES = new Set(['AssumedRole', 'Role', 'AWSAccount', 'AWSService']);

/**
 * Classifies a `user.name` bucket as a person or a role/service identity from
 * its most common `aws.cloudtrail.user_identity.type` value (majority vote,
 * since a handful of demo/edge-case docs could carry a stray type). Buckets
 * with no identity-type sub-aggregation data (non-CloudTrail sources, or an
 * index pattern that doesn't map the field) default to 'user': the
 * conservative choice, since misclassifying a real user as a service is worse
 * than the reverse for the entity-chip's Security-page link.
 */
const classifyIdentityType = (
  identityTypeBuckets: Array<{ key: string; doc_count: number }> | undefined
): 'user' | 'service' => {
  if (!identityTypeBuckets || identityTypeBuckets.length === 0) return 'user';
  const topBucket = identityTypeBuckets.reduce((max, bucket) =>
    bucket.doc_count > max.doc_count ? bucket : max
  );
  return NON_HUMAN_AWS_IDENTITY_TYPES.has(topBucket.key) ? 'service' : 'user';
};

/**
 * Tier 1 deterministic hunt: searches the resolved scope for a report's IOCs
 * and/or ATT&CK technique IDs. The index list comes from `params.scope` rather
 * than a hardcoded allow-list.
 *
 * Hit bar: at least one confirmed match in a *required* index pattern inside
 * the window. A match only in an optional pattern (including the alerts
 * pattern), or outside the window, does not set `hasConfirmedHit`. It can
 * still appear in `hits`/`counts`/`perIndex` for context. The coordinator's
 * `tier2_when: on_hits` gate follows `hasConfirmedHit` for the same reason.
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
    return emptyHuntForThreatResult(
      'no_searchable_terms',
      iocs,
      techniques,
      { from, to },
      'IOCs and/or ATT&CK technique IDs were passed but none mapped to a known ECS field ' +
        '(e.g. hashes with non-standard lengths, or an unsupported IOC type). Re-run with ' +
        'a normalized set of IOCs/techniques.'
    );
  }

  // `required` and `optional` (which already includes the space-derived alerts
  // pattern) are searched together with `ignore_unavailable` and `allow_no_indices`.
  // A scope reaching this point already passed the blocked/degraded gate, so the
  // search never needs to distinguish required from optional; that distinction only
  // matters for the hit bar below.
  const searchIndices = [...scope.required, ...scope.optional];
  // `perIndex` buckets on `_index`, which is a concrete index/data-stream name
  // (e.g. `logs-aws.cloudtrail-default`), never the wildcard pattern it resolved
  // from (e.g. `logs-aws.*`). Shared with Tier 2 so both hit bars agree.
  const matchesRequired = buildMatchesRequired(scope.required);

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
        aggs: {
          identity_types: {
            terms: { field: 'aws.cloudtrail.user_identity.type.keyword', size: 5 },
          },
        },
      },
    },
  });

  const aggs = response.aggregations as HuntAggregations | undefined;

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;
  const hits = attributeHits(
    (response.hits.hits ?? []).map(
      (hit): HuntForThreatHit => ({
        index: hit._index,
        id: hit._id ?? '',
        score: hit._score ?? null,
        ...(hit._source as Record<string, unknown>),
      })
    ),
    iocs,
    techniques
  );

  const hosts: AffectedAsset[] = (aggs?.affected_hosts?.buckets ?? []).map((b) => ({
    name: b.key,
    hitCount: b.doc_count,
  }));
  const userBuckets = aggs?.affected_users?.buckets ?? [];
  const users: AffectedAsset[] = [];
  const services: AffectedAsset[] = [];
  for (const bucket of userBuckets) {
    const asset: AffectedAsset = { name: bucket.key, hitCount: bucket.doc_count };
    if (classifyIdentityType(bucket.identity_types?.buckets) === 'service') {
      services.push(asset);
    } else {
      users.push(asset);
    }
  }
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
    affectedAssets: { hosts, users, services },
    perIndex,
  };
};
