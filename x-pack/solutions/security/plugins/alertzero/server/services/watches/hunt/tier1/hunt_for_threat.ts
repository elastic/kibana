/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  AffectedAsset,
  HuntForThreatPerIoc,
  HuntForThreatResult,
  HuntIncompleteness,
  HuntIoc,
} from '@kbn/alertzero-common';
import { isIndexExclusion } from '../../../../../common/remote_cluster';
import { assertHuntWindow } from '../common/assert_hunt_window';
import { originOfIndices } from '../common/host_origin';
import { summarizeHit } from '../common/summarize_hit';
import {
  ALERT_TECHNIQUE_ID_FIELDS,
  attributeHits,
  CASE_INSENSITIVE_IOC_TYPES,
  EVIDENCE_SOURCE_FIELDS,
  HASH_ALGO_BY_LENGTH,
  hashFieldsForAlgo,
  IOC_FIELDS_BY_TYPE,
  isTier1SearchableIoc,
  normalizeIocValue,
  type HitDocument,
} from './attribute_hits';
import type { HuntForThreatParams, HuntForThreatServiceResult } from './types';

/** Cap on the filters aggregation (one entry per searchable IOC). */
const PER_IOC_FILTER_MAX = 100;
/** Cap on `per_ioc` returned on the wire (schema max 30). */
const PER_IOC_RESULT_MAX = 30;

interface NamedIocClause {
  /** `ioc_<i>|<field>` — authoritative for hit attribution via `matched_queries`. */
  name: string;
  iocIndex: number;
  field: string;
  clause: Record<string, unknown>;
}

/**
 * Folding the report's value is not enough on its own for a case-insensitive IOC
 * type: the document may be the side carrying the mixed case, and `term` on a
 * `keyword` field compares bytes. So the clause itself matches case-insensitively
 * and `normalizeIocValue` folds both sides during attribution.
 *
 * Always the object form so each clause can carry `_name`.
 */
const termClause = (
  field: string,
  value: string,
  name: string,
  caseInsensitive = false
): Record<string, unknown> => ({
  term: {
    [field]: caseInsensitive
      ? { value, case_insensitive: true, _name: name }
      : { value, _name: name },
  },
});

/**
 * Named per-IOC `should` clauses across every ECS field the value might land in.
 * Hash is narrowed by length to the matching algo's fields — an md5 value has no
 * business matching a sha256 field. Hash IOCs whose length is not 32/40/64 are
 * not searchable and produce no clauses.
 */
const buildIocClauses = (iocs: HuntIoc[]): NamedIocClause[] => {
  const clauses: NamedIocClause[] = [];
  iocs.forEach((ioc, iocIndex) => {
    const { type, value } = ioc;
    if (type === 'hash') {
      const algo = HASH_ALGO_BY_LENGTH[value.length];
      // A `term` query is case-sensitive and integrations index digests
      // lowercase, so an uppercase digest from a report has to be folded to
      // match the same file. Attribution folds the same way.
      const digest = normalizeIocValue(type, value);
      if (!algo) return;
      for (const field of hashFieldsForAlgo(algo)) {
        const name = `ioc_${iocIndex}|${field}`;
        clauses.push({
          name,
          iocIndex,
          field,
          clause: termClause(field, digest, name),
        });
      }
      return;
    }
    const caseInsensitive = CASE_INSENSITIVE_IOC_TYPES.has(type);
    for (const field of IOC_FIELDS_BY_TYPE[type] ?? []) {
      const name = `ioc_${iocIndex}|${field}`;
      clauses.push({
        name,
        iocIndex,
        field,
        clause: termClause(field, value, name, caseInsensitive),
      });
    }
  });
  return clauses;
};

/** Collapse duplicate IOCs on normalized `(type, value)`; drop ones with no clauses. */
const dedupeSearchableIocs = (iocs: HuntIoc[]): HuntIoc[] => {
  const seen = new Set<string>();
  const out: HuntIoc[] = [];
  for (const ioc of iocs) {
    if (!isTier1SearchableIoc(ioc)) continue;
    const key = `${ioc.type}\0${normalizeIocValue(ioc.type, ioc.value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ioc);
  }
  return out;
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
 * Bucket cap for the `_index` terms aggregation. Every data-stream generation is its
 * own `_index` value, so a 30-day window over a handful of patterns can span far more
 * concrete indices than patterns; a cap derived from the pattern count could drop the
 * buckets the coordinator turns into Tier 2 targets. The hit bar does not read these
 * buckets: it is the search's own hit count.
 */
const PER_INDEX_MAX_BUCKETS = 500;

/**
 * Per-host `_index` bucket cap. Only "any local index" and the remote cluster aliases are
 * read from these, so a few buckets per host answer it; a cut list that saw no local index
 * leaves the host's origin unknown rather than calling it remote-only.
 */
const HOST_INDEX_MAX_BUCKETS = 20;

/**
 * Fields the wire hit, the entity chips and the Tier 2 digest read, independent
 * of what was searched. Includes the evidence allowlist so sampled hits carry
 * values `attributeHits` copies onto `fields`.
 */
const DISPLAY_SOURCE_FIELDS = [
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
  ...EVIDENCE_SOURCE_FIELDS,
] as const;

/**
 * The display fields plus every ECS field the searched IOC types can match on.
 * `attributeHits` falls back to comparing `_source` against those same fields
 * when `matched_queries` is absent, so a field that is searched but not
 * projected yields a confirmed hit that cannot say which IOC confirmed it —
 * `related.ip`, `user.email`, `dns.question.name`, `url.original` and the hash
 * fields were all in that gap. Scoped to the types actually present so an
 * IP-only hunt does not pay for hash fields.
 */
const sourceFieldsFor = (iocs: HuntIoc[]): string[] => {
  const fields = new Set<string>(DISPLAY_SOURCE_FIELDS);
  for (const { type } of iocs) {
    for (const field of IOC_FIELDS_BY_TYPE[type] ?? []) fields.add(field);
  }
  return [...fields];
};

interface ShardCoverage {
  timed_out?: boolean;
  _shards?: { total: number; failed: number; successful: number };
}

/**
 * Coverage gaps in one request. A 200 response can have lost whole shards or run
 * out of time, and `hits.total` only counts what the shards that answered saw, so
 * a partial search does not look like a failure — it looks like a smaller, quieter
 * environment, which is the worse of the two ways to be wrong here.
 */
const shardCoverageGaps = (label: string, response: ShardCoverage): HuntIncompleteness[] => {
  const gaps: HuntIncompleteness[] = [];
  if (response.timed_out === true) {
    gaps.push({
      reason: 'search_partial',
      detail: `The ${label} timed out, so it counted only the shards that answered in time.`,
    });
  }
  const shards = response._shards;
  if (shards && shards.failed > 0) {
    gaps.push({
      reason: 'search_partial',
      detail:
        `${shards.failed} of ${shards.total} shards failed on the ${label}, so its counts are ` +
        `a floor rather than a total.`,
    });
  }
  return gaps;
};

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

interface PerIocBucket {
  doc_count: number;
  host_count?: { value: number };
  user_count?: { value: number };
  first_seen?: { value: number | null; value_as_string?: string };
  last_seen?: { value: number | null; value_as_string?: string };
}

interface HuntAggregations {
  per_index?: { buckets: Array<{ key: string; doc_count: number }> };
  per_ioc?: { buckets: Record<string, PerIocBucket> };
  affected_hosts?: {
    buckets: Array<{
      key: string;
      doc_count: number;
      doc_count_error_upper_bound?: number;
      by_index?: {
        buckets: Array<{ key: string; doc_count: number }>;
        sum_other_doc_count?: number;
      };
    }>;
  };
  affected_users?: {
    buckets: Array<{
      key: string;
      doc_count: number;
      non_human_identity?: { doc_count: number };
    }>;
  };
}

const perIocFilterKey = (iocIndex: number): string => `ioc_${iocIndex}`;

const buildPerIocFiltersAgg = (
  searchableIocs: HuntIoc[],
  namedClauses: NamedIocClause[]
): Record<string, unknown> | undefined => {
  if (searchableIocs.length === 0) return undefined;
  const filters: Record<string, unknown> = {};
  const limit = Math.min(searchableIocs.length, PER_IOC_FILTER_MAX);
  for (let i = 0; i < limit; i++) {
    const should = namedClauses.filter((c) => c.iocIndex === i).map((c) => c.clause);
    if (should.length === 0) continue;
    filters[perIocFilterKey(i)] = {
      bool: { should, minimum_should_match: 1 },
    };
  }
  if (Object.keys(filters).length === 0) return undefined;
  return {
    filters: { filters },
    aggs: {
      host_count: { cardinality: { field: 'host.name' } },
      user_count: { cardinality: { field: 'user.name' } },
      // `value_as_string` follows the field's mapped format, which is `epoch_millis` digits
      // on some indices; the SSE schema needs ISO 8601, so pin the output format here.
      first_seen: { min: { field: '@timestamp', format: 'strict_date_optional_time' } },
      last_seen: { max: { field: '@timestamp', format: 'strict_date_optional_time' } },
    },
  };
};

const buildPerIocResult = (
  searchableIocs: HuntIoc[],
  namedClauses: NamedIocClause[],
  buckets: Record<string, PerIocBucket> | undefined
): { per_ioc?: HuntForThreatPerIoc[]; per_ioc_truncated?: boolean } => {
  if (!buckets) return {};
  const firstFieldByIoc = new Map<number, string>();
  for (const clause of namedClauses) {
    if (!firstFieldByIoc.has(clause.iocIndex)) {
      firstFieldByIoc.set(clause.iocIndex, clause.field);
    }
  }
  const entries: HuntForThreatPerIoc[] = [];
  for (const [key, bucket] of Object.entries(buckets)) {
    if (bucket.doc_count <= 0) continue;
    const match = /^ioc_(\d+)$/.exec(key);
    if (!match) continue;
    const iocIndex = Number(match[1]);
    const ioc = searchableIocs[iocIndex];
    const field = firstFieldByIoc.get(iocIndex);
    if (!ioc || !field) continue;
    const entry: HuntForThreatPerIoc = {
      type: ioc.type,
      value: ioc.value,
      field,
      count: bucket.doc_count,
    };
    if (typeof bucket.host_count?.value === 'number') {
      entry.host_count = bucket.host_count.value;
    }
    if (typeof bucket.user_count?.value === 'number') {
      entry.user_count = bucket.user_count.value;
    }
    if (bucket.first_seen?.value_as_string) {
      entry.first_seen = bucket.first_seen.value_as_string;
    }
    if (bucket.last_seen?.value_as_string) {
      entry.last_seen = bucket.last_seen.value_as_string;
    }
    entries.push(entry);
  }
  entries.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  const truncated = entries.length > PER_IOC_RESULT_MAX;
  return {
    per_ioc: entries.slice(0, PER_IOC_RESULT_MAX),
    ...(truncated ? { per_ioc_truncated: true } : {}),
  };
};

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
 * Tier 1 deterministic hunt: searches the hunt universe for a report's IOCs
 * and/or ATT&CK technique IDs. The index list comes from `params.scope`
 * (`search_patterns`) rather than a hardcoded allow-list.
 *
 * Hit bar: at least one match inside the window in any searched index. There is
 * no non-confirming bucket, so `has_confirmed_hit` is the search's own hit
 * count. A match outside the window does not set it. The coordinator's
 * `tier2_when: on_hits` gate follows `has_confirmed_hit`.
 */
export const huntForThreat = async (
  esClient: ElasticsearchClient,
  params: HuntForThreatParams
): Promise<HuntForThreatServiceResult> => {
  const {
    scope,
    iocs: rawIocs = [],
    techniques: rawTechniques = [],
    time_range,
    size,
    maxAssets = 50,
  } = params;
  // Alerts store ATT&CK ids as `T1078.004` on keyword fields, and the `terms`
  // clause is case-sensitive, so a caller's `t1078.004` would never match
  // although hit attribution compares case-insensitively.
  //
  // A value that normalises to nothing is then dropped rather than searched for. Both
  // filters bound the request only by length, so a blank entry survives them, and a
  // clause built from it — `terms: { '…technique.id': [''] }` — matches nothing while
  // still counting towards the no-searchable-terms guard below. The guard therefore
  // does not fire, and the run reports `no_environment_hits`: searched and clean, for a
  // hunt that searched for nothing. Dropping them here also keeps `resolved_iocs` and
  // `resolved_techniques` honest about what was actually looked for.
  // Both are normalised before the emptiness test rather than tested on a trimmed copy and
  // then searched raw: a padded `" example.com "` would otherwise pass the filter and be
  // searched verbatim, and a keyword `term` on a padded value matches no document holding
  // `example.com`. That is the same clean-report-for-an-impossible-match this filter exists
  // to prevent, so the value that survives here is the value that gets searched, attributed
  // against, and echoed back in `resolved_iocs`.
  const techniques = rawTechniques
    .map((technique) => technique.trim().toUpperCase())
    .filter((technique) => technique.length > 0);
  const trimmedIocs = rawIocs
    .map((ioc) => ({ ...ioc, value: ioc.value.trim() }))
    .filter(({ value }) => value.length > 0);
  // Deduped searchable IOCs drive named clauses, filters agg keys, and attribution
  // indices (`ioc_<i>|…`). `resolved_iocs` still echoes every non-blank trimmed IOC
  // the caller passed (including unsearchable hashes), so older readers keep seeing
  // the full input list.
  const searchableIocs = dedupeSearchableIocs(trimmedIocs);
  const iocs = trimmedIocs;

  const from = time_range?.from ?? scope.window.from;
  const to = time_range?.to ?? scope.window.to;
  const rowLimit = size ?? scope.row_limit;

  assertHuntWindow({ from, to });

  // An empty index list would search every index rather than none, and a list of
  // exclusions alone resolves to none: neither is a universe to hunt.
  if (!scope.search_patterns.some((pattern) => !isIndexExclusion(pattern))) {
    return emptyHuntForThreatResult(
      'scope_blocked',
      iocs,
      techniques,
      { from, to },
      'The hunt has no index pattern to search, so nothing was searched.'
    );
  }

  const namedIocClauses = buildIocClauses(searchableIocs);
  const techniqueShould = buildTechniqueShould(techniques);
  const should = [...namedIocClauses.map((c) => c.clause), ...techniqueShould];

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

  // A scope reaching this point already passed the blocked gate, so the search is
  // issued with `ignore_unavailable` and `allow_no_indices` and never needs to tell a
  // missing pattern from an empty one. `per_index` buckets on `_index`, which is a
  // concrete index or backing-index name (`.ds-logs-okta.system-default-...`), never
  // the wildcard it resolved from.
  const searchIndices = scope.search_patterns;

  const huntQuery = {
    bool: {
      // `to` is exclusive per `IndexScopeWindow`, so an event on the boundary
      // belongs to the next window only and is never confirmed by both.
      filter: [{ range: { '@timestamp': { gte: from, lt: to } } }],
      should,
      minimum_should_match: 1,
    },
  };

  const perIocAgg = buildPerIocFiltersAgg(searchableIocs, namedIocClauses);

  const response = await esClient.search({
    index: searchIndices,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: rowLimit,
    track_total_hits: true,
    sort: [{ '@timestamp': { order: 'desc' } }],
    _source: sourceFieldsFor(searchableIocs),
    query: huntQuery,
    aggs: {
      per_index: {
        terms: { field: '_index', size: PER_INDEX_MAX_BUCKETS },
      },
      ...(perIocAgg ? { per_ioc: perIocAgg } : {}),
      affected_hosts: {
        terms: { field: 'host.name', size: maxAssets, show_term_doc_count_error: true },
        aggs: {
          // Under CCS, `_index` terms keys come back as `<cluster>:<index>` with either
          // `ccs_minimize_roundtrips` setting (checked on 9.7.0-SNAPSHOT), which tells a remote
          // host apart from a local one.
          by_index: { terms: { field: '_index', size: HOST_INDEX_MAX_BUCKETS } },
        },
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
  const docs: HitDocument[] = (response.hits.hits ?? []).map((hit) => {
    const source = (hit._source ?? {}) as Record<string, unknown>;
    const timestamp =
      typeof source['@timestamp'] === 'string' && source['@timestamp'].length > 0
        ? source['@timestamp']
        : undefined;
    const matchedQueries = Array.isArray(hit.matched_queries)
      ? hit.matched_queries.filter((name): name is string => typeof name === 'string')
      : undefined;
    return {
      id: hit._id ?? '',
      index: hit._index,
      ...(timestamp ? { timestamp } : {}),
      source,
      ...(matchedQueries && matchedQueries.length > 0 ? { matched_queries: matchedQueries } : {}),
    };
  });
  // Digests from full `_source` before wire hits drop source fields — Tier 2
  // grounding still needs rule/host/user/ip context.
  const sampleEventSummaries = docs.map((doc) =>
    summarizeHit({ id: doc.id, index: doc.index, source: doc.source })
  );
  const hits = attributeHits(docs, searchableIocs, techniques);
  const perIocResult = buildPerIocResult(searchableIocs, namedIocClauses, aggs?.per_ioc?.buckets);

  const hosts: AffectedAsset[] = (aggs?.affected_hosts?.buckets ?? []).map((b) => {
    const origin = b.by_index
      ? originOfIndices(b.by_index.buckets.map((indexBucket) => indexBucket.key))
      : undefined;
    // Remote-only needs the host's whole breakdown: no `_index` bucket cut off, and no shard
    // that left the host out of its top terms (a shard where it is rare can be a local one).
    const complete =
      (b.by_index?.sum_other_doc_count ?? 0) === 0 && b.doc_count_error_upper_bound === 0;
    const known = origin && (origin.local || complete);
    return { name: b.key, hit_count: b.doc_count, ...(known ? origin : {}) };
  });
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
    required: true,
  }));

  // One universe, one search: its own hit count is the hit bar, and `per_index` is
  // display context that can be capped without hiding a hit.
  const hasConfirmedHit = total > 0;

  const incomplete = shardCoverageGaps('scope search', response);
  // `ignore_unavailable` stops one missing pattern from failing the whole search,
  // but it applies to every pattern: if all of them went away between scope
  // resolution and the search, zero shards answered, which is indistinguishable from a
  // searched-and-clean universe.
  if (response._shards?.total === 0) {
    incomplete.push({
      reason: 'index_unavailable',
      detail:
        `No index backed the searched patterns (${searchIndices.join(', ')}), so the hunt ` +
        `never searched the universe it was asked to.`,
    });
  }

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
    searched_ioc_count: searchableIocs.length,
    ...(perIocResult.per_ioc && perIocResult.per_ioc.length > 0
      ? { per_ioc: perIocResult.per_ioc }
      : {}),
    ...(perIocResult.per_ioc_truncated ? { per_ioc_truncated: true } : {}),
    ...(incomplete.length > 0 ? { incomplete } : {}),
    ...(sampleEventSummaries.length > 0 ? { sample_event_summaries: sampleEventSummaries } : {}),
  };
};
