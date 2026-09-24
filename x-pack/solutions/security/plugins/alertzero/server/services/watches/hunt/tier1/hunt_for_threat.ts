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
import {
  ALERT_TECHNIQUE_ID_FIELDS,
  attributeHits,
  HASH_ALGO_BY_LENGTH,
  hashFieldsForAlgo,
  IOC_FIELDS_BY_TYPE,
} from './attribute_hits';
import type { HuntForThreatParams } from './types';

const termClause = (field: string, value: string): Record<string, unknown> => ({
  term: { [field]: value },
});

/**
 * Per-IOC `should` clause across every ECS field the value might reasonably
 * land in, not narrowed by event source since the same IOC type can appear
 * in several ECS slots depending on which integration produced the document.
 * Hash is the one type narrowed further, by length, to the matching algo's
 * fields — an md5 value has no business matching a sha256 field.
 */
const buildIocShould = (iocs: HuntIoc[]): Array<Record<string, unknown>> => {
  const clauses: Array<Record<string, unknown>> = [];
  for (const { type, value } of iocs) {
    if (type === 'hash') {
      const algo = HASH_ALGO_BY_LENGTH[value.length];
      if (algo) clauses.push(...hashFieldsForAlgo(algo).map((field) => termClause(field, value)));
      continue;
    }
    for (const field of IOC_FIELDS_BY_TYPE[type] ?? []) {
      clauses.push(termClause(field, value));
    }
  }
  return clauses;
};

/**
 * Alerts tag a sub-technique such as `T1078.004` on
 * `kibana.alert.rule.threat.technique.subtechnique.id`, with only the parent
 * `T1078` on `technique.id`, so both paths are searched. The same two paths
 * drive Tier 1 hit attribution (`ALERT_TECHNIQUE_ID_FIELDS`).
 */
const buildTechniqueShould = (techniques: string[]): Array<Record<string, unknown>> =>
  techniques.length === 0
    ? []
    : ALERT_TECHNIQUE_ID_FIELDS.map((field) => ({ terms: { [field]: techniques } }));

/**
 * Bucket cap for the `_index` terms aggregation that sets the hit bar. Every
 * data-stream generation is its own `_index` value, so a 30-day window over a
 * handful of patterns can span far more concrete indices than patterns; a cap
 * derived from the pattern count could drop the required bucket and read a
 * real hit as clean.
 */
const PER_INDEX_MAX_BUCKETS = 500;

export const emptyHuntForThreatResult = (
  status: HuntForThreatResult['status'],
  resolved_iocs: HuntIoc[],
  resolved_techniques: string[],
  time_range: { from: string; to: string },
  message: string
): HuntForThreatResult => ({
  status,
  has_confirmed_hit: false,
  searched_iocs: resolved_iocs.length,
  searched_techniques: resolved_techniques.length,
  resolved_iocs,
  resolved_techniques,
  time_range,
  counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
  hits: [],
  affected_assets: { hosts: [], users: [], services: [] },
  per_index: [],
  message,
});

interface HuntAggregations {
  per_index?: { buckets: Array<{ key: string; doc_count: number }> };
  affected_hosts?: { buckets: Array<{ key: string; doc_count: number }> };
  affected_users?: {
    buckets: Array<{
      key: string;
      doc_count: number;
      non_human_identity?: { doc_count: number };
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
const NON_HUMAN_AWS_IDENTITY_TYPES = ['AssumedRole', 'Role', 'AWSAccount', 'AWSService'] as const;

const AWS_IDENTITY_TYPE_FIELD = 'aws.cloudtrail.user_identity.type';

/**
 * Counts the documents in a `user.name` bucket whose CloudTrail identity type
 * is non-human. Built from `match` queries rather than a `terms` aggregation
 * on purpose: the AWS integration maps the field as plain `keyword` (no
 * `.keyword` sub-field), while dynamically mapped data (the demo generator)
 * gets `text` plus `.keyword`. A terms agg needs one exact field name and
 * 400s the whole search on a `text` field; `match` runs against either
 * mapping and is a no-op when the field is absent.
 */
const nonHumanIdentityFilter = (): Record<string, unknown> => ({
  filter: {
    bool: {
      should: NON_HUMAN_AWS_IDENTITY_TYPES.map((type) => ({
        match: { [AWS_IDENTITY_TYPE_FIELD]: type },
      })),
      minimum_should_match: 1,
    },
  },
});

/**
 * Classifies a `user.name` bucket as a person or a role/service identity by
 * majority vote over its documents' CloudTrail identity type (a handful of
 * demo/edge-case docs could carry a stray type). Buckets with no non-human
 * documents (non-CloudTrail sources, or an index pattern that doesn't map the
 * field) default to 'user': the conservative choice, since misclassifying a
 * real user as a service is worse than the reverse for the entity-chip's
 * Security-page link.
 */
const classifyIdentityType = (
  bucketDocCount: number,
  nonHumanDocCount: number | undefined
): 'user' | 'service' => {
  if (!nonHumanDocCount || bucketDocCount <= 0) return 'user';
  return nonHumanDocCount * 2 > bucketDocCount ? 'service' : 'user';
};

/**
 * Tier 1 deterministic hunt: searches the resolved scope for a report's IOCs
 * and/or ATT&CK technique IDs. The index list comes from `params.scope` rather
 * than a hardcoded allow-list.
 *
 * Hit bar: at least one confirmed match in a *required* index pattern inside
 * the window. A match only in an optional pattern (including the alerts
 * pattern), or outside the window, does not set `has_confirmed_hit`. It can
 * still appear in `hits`/`counts`/`per_index` for context. The coordinator's
 * `tier2_when: on_hits` gate follows `has_confirmed_hit` for the same reason.
 */
export const huntForThreat = async (
  esClient: ElasticsearchClient,
  params: HuntForThreatParams
): Promise<HuntForThreatResult> => {
  const { scope, iocs = [], techniques = [], time_range, size, maxAssets = 50 } = params;

  const from = time_range?.from ?? scope.window.from;
  const to = time_range?.to ?? scope.window.to;
  const rowLimit = size ?? scope.row_limit;

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
  // `per_index` buckets on `_index`, which is a concrete index/data-stream name
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
      'event.action',
      'event.provider',
      'host.name',
      'host.os.family',
      'user.name',
      'source.ip',
      'destination.ip',
      'url.full',
      'kibana.alert.rule.name',
      // Alerts store this as a dotted top-level key whose value is the threat
      // array (`[{ tactic, technique: [{ id, subtechnique: [{ id }] }] }]`), so
      // the filter names the key as stored, not a path inside it.
      'kibana.alert.rule.threat',
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
        terms: { field: '_index', size: PER_INDEX_MAX_BUCKETS },
      },
      affected_hosts: {
        terms: { field: 'host.name', size: maxAssets },
      },
      affected_users: {
        terms: { field: 'user.name', size: maxAssets },
        aggs: {
          non_human_identity: nonHumanIdentityFilter(),
        },
      },
    },
  });

  const aggs = response.aggregations as HuntAggregations | undefined;

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;
  const hits = attributeHits(
    (response.hits.hits ?? []).map(
      // Envelope keys last so a document with its own top-level `id`/`index`/`score`
      // field cannot clobber the hit's `_id`/`_index`/`_score`.
      (hit): HuntForThreatHit => ({
        ...(hit._source as Record<string, unknown>),
        index: hit._index,
        id: hit._id ?? '',
        score: hit._score ?? null,
      })
    ),
    iocs,
    techniques
  );

  const hosts: AffectedAsset[] = (aggs?.affected_hosts?.buckets ?? []).map((b) => ({
    name: b.key,
    hit_count: b.doc_count,
  }));
  const userBuckets = aggs?.affected_users?.buckets ?? [];
  const users: AffectedAsset[] = [];
  const services: AffectedAsset[] = [];
  for (const bucket of userBuckets) {
    const asset: AffectedAsset = { name: bucket.key, hit_count: bucket.doc_count };
    if (
      classifyIdentityType(bucket.doc_count, bucket.non_human_identity?.doc_count) === 'service'
    ) {
      services.push(asset);
    } else {
      users.push(asset);
    }
  }
  const perIndex = (aggs?.per_index?.buckets ?? []).map((b) => ({
    index: b.key,
    hit_count: b.doc_count,
    required: matchesRequired(b.key),
  }));

  const hasConfirmedHit = perIndex.some((bucket) => bucket.required && bucket.hit_count > 0);

  return {
    status: total === 0 ? 'no_environment_hits' : 'environment_hits_found',
    has_confirmed_hit: hasConfirmedHit,
    searched_iocs: iocs.length,
    searched_techniques: techniques.length,
    resolved_iocs: iocs,
    resolved_techniques: techniques,
    time_range: { from, to },
    counts: {
      total_hits: total,
      returned_hits: hits.length,
      affected_hosts: hosts.length,
      affected_users: users.length,
    },
    hits,
    affected_assets: { hosts, users, services },
    per_index: perIndex,
  };
};
