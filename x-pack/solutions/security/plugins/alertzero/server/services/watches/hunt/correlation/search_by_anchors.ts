/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ported verbatim from mustard `services/search_by_anchors.ts` with three adaptations:
 * 1. `buildSpaceFilterTerms` → `buildHuntSpaceFilterTerms` (local helper, Phase 1)
 * 2. `THREAT_REPORTS_INDEX_PATTERN` → `HUNT_REPORTS_INDEX` (local constant)
 * 3. `IOC_NOISE_DOMAINS` → imported from local `./ioc_noise_domains` (no cross-plugin import)
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { HUNT_REPORTS_INDEX } from '../../../../../common/constants';
import { buildHuntSpaceFilterTerms } from '../common/space_filter';
import { IOC_NOISE_DOMAINS } from './ioc_noise_domains';
import type {
  AnchorHit,
  AnchorIoc,
  AnchorMatchBreakdown,
  AnchorSet,
  SearchByAnchorsParams,
  SearchByAnchorsResult,
} from './types';

const HASH_IOC_TYPE = 'hash' as const;
const NETWORK_IOC_TYPES = new Set(['ip', 'domain', 'url']);
const DEFAULT_SIZE = 20;
const MAX_SIZE = 50;

const splitIocs = (iocs: AnchorIoc[]): { hashValues: string[]; networkValues: string[] } => {
  const hashValues = new Set<string>();
  const networkValues = new Set<string>();

  for (const { type, value } of iocs) {
    if (!value) {
      // skip
    } else if (type === HASH_IOC_TYPE) {
      hashValues.add(value.toLowerCase());
    } else if (NETWORK_IOC_TYPES.has(type)) {
      const lower = value.toLowerCase();
      if (!IOC_NOISE_DOMAINS.has(lower)) {
        networkValues.add(lower);
      }
    }
  }

  return { hashValues: [...hashValues], networkValues: [...networkValues] };
};

interface StoredReportSource {
  '@timestamp'?: string;
  content?: { title?: string };
  source?: { type?: string };
  severity?: { level?: string };
  lineage?: { extracted_at?: string };
  extracted?: {
    iocs?: Array<{ type?: string; value?: string }>;
    ioc_set_hash?: string;
    threat_actors?: string[];
    ttps?: { techniques?: string[] };
  };
}

const SOURCE_FIELDS = [
  '@timestamp',
  'content.title',
  'source.type',
  'severity.level',
  'lineage.extracted_at',
  'extracted.iocs',
  'extracted.ioc_set_hash',
  'extracted.threat_actors',
  'extracted.ttps.techniques',
] as const;

const fetchSourceAnchors = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  sourceReportId: string
): Promise<AnchorSet | null> => {
  const response = await esClient.search<StoredReportSource>({
    index: HUNT_REPORTS_INDEX,
    size: 1,
    query: {
      bool: {
        filter: [buildHuntSpaceFilterTerms(spaceId), { term: { _id: sourceReportId } }],
      },
    },
    _source: [...SOURCE_FIELDS],
  });

  const hit = response.hits.hits[0];
  if (!hit?._source) return null;

  const { extracted } = hit._source;
  return {
    iocs: (extracted?.iocs ?? []).filter(
      (ioc): ioc is { type: string; value: string } => !!ioc.type && !!ioc.value
    ),
    ioc_set_hash: extracted?.ioc_set_hash ?? null,
    actors: extracted?.threat_actors ?? [],
    technique_ids: extracted?.ttps?.techniques ?? [],
  };
};

const buildMatchBreakdown = (
  source: StoredReportSource | undefined,
  hashValues: string[],
  networkValues: string[],
  iocSetHash: string | null,
  actors: string[],
  techniqueIds: string[]
): AnchorMatchBreakdown => {
  const storedIocs = source?.extracted?.iocs ?? [];
  const storedActors = source?.extracted?.threat_actors ?? [];
  const storedTechniques = source?.extracted?.ttps?.techniques ?? [];
  const storedIocSetHash = source?.extracted?.ioc_set_hash;

  const hashSet = new Set(hashValues);
  const networkSet = new Set(networkValues);
  const actorSet = new Set(actors);
  const techniqueSet = new Set(techniqueIds);

  const iocHashHits = [
    ...new Set(
      storedIocs
        .filter(
          (ioc): ioc is { type: string; value: string } =>
            ioc.type === HASH_IOC_TYPE &&
            typeof ioc.value === 'string' &&
            hashSet.has(ioc.value.toLowerCase())
        )
        .map((ioc) => ioc.value)
    ),
  ];

  const iocNetworkHits = [
    ...new Set(
      storedIocs
        .filter(
          (ioc): ioc is { type: string; value: string } =>
            typeof ioc.type === 'string' &&
            NETWORK_IOC_TYPES.has(ioc.type) &&
            typeof ioc.value === 'string' &&
            networkSet.has(ioc.value.toLowerCase())
        )
        .map((ioc) => ioc.value)
    ),
  ];

  const iocSetHashMatch = !!(iocSetHash && storedIocSetHash === iocSetHash);
  const actorHits = storedActors.filter((a) => actorSet.has(a));
  const techniqueHits = storedTechniques.filter((t) => techniqueSet.has(t));

  const discriminatingMatchCount =
    (iocHashHits.length > 0 ? 1 : 0) + (iocSetHashMatch ? 1 : 0) + (actorHits.length > 0 ? 1 : 0);

  return {
    ioc_hash_hits: iocHashHits,
    ioc_network_hits: iocNetworkHits,
    ioc_set_hash_match: iocSetHashMatch,
    actor_hits: actorHits,
    technique_hits: techniqueHits,
    discriminating_match_count: discriminatingMatchCount,
  };
};

const mapHit = (
  hit: { _id: string; _score?: number | null; _source?: StoredReportSource },
  hashValues: string[],
  networkValues: string[],
  iocSetHash: string | null,
  actors: string[],
  techniqueIds: string[]
): AnchorHit => {
  const source = hit._source;
  return {
    report_id: hit._id,
    score: hit._score ?? null,
    title: source?.content?.title?.trim() ?? hit._id,
    severity: source?.severity?.level ?? 'unknown',
    source_type: source?.source?.type ?? 'unknown',
    extracted_at: source?.lineage?.extracted_at ?? source?.['@timestamp'] ?? '',
    match_breakdown: buildMatchBreakdown(
      source,
      hashValues,
      networkValues,
      iocSetHash,
      actors,
      techniqueIds
    ),
  };
};

const nestedIocConstantScore = (
  types: string | string[],
  values: string[],
  boost: number
): Record<string, unknown> => ({
  constant_score: {
    filter: {
      nested: {
        path: 'extracted.iocs',
        query: {
          bool: {
            must: [
              Array.isArray(types)
                ? { terms: { 'extracted.iocs.type': types } }
                : { term: { 'extracted.iocs.type': types } },
              { terms: { 'extracted.iocs.value': values } },
            ],
          },
        },
      },
    },
    boost,
  },
});

const emptyResult = (
  iocSetHash: string | null,
  hashCount: number,
  networkCount: number,
  actorCount: number,
  techniqueCount: number
): SearchByAnchorsResult => ({
  hits: [],
  total: 0,
  anchor_summary: {
    hash_ioc_count: hashCount,
    network_ioc_count: networkCount,
    ioc_set_hash: iocSetHash,
    actor_count: actorCount,
    technique_count: techniqueCount,
    discriminating_anchor_count: 0,
  },
});

/**
 * Exact-anchor correlation search against the threat-reports data stream.
 *
 * Discriminating gate (filter — ≥1 required):
 *   - shared file-hash IOC value
 *   - exact ioc_set_hash match (infrastructure fingerprint)
 *   - shared threat actor name
 *
 * Boost-only (should — never alone-qualifying):
 *   - shared network IOC (ip/domain/url), noise-domain filtered
 *   - shared MITRE technique ID
 */
export const searchByAnchors = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  spaceId: string,
  params: SearchByAnchorsParams
): Promise<SearchByAnchorsResult> => {
  const { source_report_id: sourceReportId } = params;
  const size = Math.min(params.size ?? DEFAULT_SIZE, MAX_SIZE);

  let anchors = params.anchors;

  if (sourceReportId && !anchors) {
    const fetched = await fetchSourceAnchors(esClient, spaceId, sourceReportId);
    if (!fetched) {
      logger.warn(`search_by_anchors: source report "${sourceReportId}" not found`);
      return emptyResult(null, 0, 0, 0, 0);
    }
    anchors = fetched;
  }

  const {
    iocs = [],
    ioc_set_hash: iocSetHash = null,
    actors = [],
    technique_ids: techniqueIds = [],
  } = anchors ?? {};

  const { hashValues, networkValues } = splitIocs(iocs);
  const cleanActors = actors.filter(Boolean);
  const cleanTechniques = techniqueIds.filter(Boolean);

  const anchorSummary = {
    hash_ioc_count: hashValues.length,
    network_ioc_count: networkValues.length,
    ioc_set_hash: iocSetHash ?? null,
    actor_count: cleanActors.length,
    technique_count: cleanTechniques.length,
    discriminating_anchor_count:
      (hashValues.length > 0 ? 1 : 0) + (iocSetHash ? 1 : 0) + (cleanActors.length > 0 ? 1 : 0),
  };

  if (anchorSummary.discriminating_anchor_count === 0) {
    logger.debug(
      `search_by_anchors: no discriminating anchors (hash/ioc_set_hash/actor) in space="${spaceId}"; skipping query`
    );
    return { hits: [], total: 0, anchor_summary: anchorSummary };
  }

  // Discriminating filter gate — ≥1 clause must match.
  const gateDisc: Array<Record<string, unknown>> = [];
  if (hashValues.length > 0) {
    gateDisc.push({
      nested: {
        path: 'extracted.iocs',
        query: {
          bool: {
            must: [
              { term: { 'extracted.iocs.type': HASH_IOC_TYPE } },
              { terms: { 'extracted.iocs.value': hashValues } },
            ],
          },
        },
      },
    });
  }
  if (iocSetHash) {
    gateDisc.push({ term: { 'extracted.ioc_set_hash': iocSetHash } });
  }
  if (cleanActors.length > 0) {
    gateDisc.push({ terms: { 'extracted.threat_actors': cleanActors } });
  }

  // Scoring should-clauses with explicit boosts:
  //   ioc_set_hash = 5, hash ioc = 4, actor = 3, network ioc = 1.5, technique = 1.0
  const shouldClauses: Array<Record<string, unknown>> = [];

  if (hashValues.length > 0) {
    shouldClauses.push(nestedIocConstantScore(HASH_IOC_TYPE, hashValues, 4.0));
  }
  if (iocSetHash) {
    shouldClauses.push({
      constant_score: { filter: { term: { 'extracted.ioc_set_hash': iocSetHash } }, boost: 5.0 },
    });
  }
  if (cleanActors.length > 0) {
    shouldClauses.push({
      constant_score: { filter: { terms: { 'extracted.threat_actors': cleanActors } }, boost: 3.0 },
    });
  }
  if (networkValues.length > 0) {
    shouldClauses.push(nestedIocConstantScore([...NETWORK_IOC_TYPES], networkValues, 1.5));
  }
  if (cleanTechniques.length > 0) {
    shouldClauses.push({
      constant_score: {
        filter: { terms: { 'extracted.ttps.techniques': cleanTechniques } },
        boost: 1.0,
      },
    });
  }

  const filterClauses: Array<Record<string, unknown>> = [
    buildHuntSpaceFilterTerms(spaceId),
    { bool: { should: gateDisc, minimum_should_match: 1 } },
  ];

  const mustNotClauses: Array<Record<string, unknown>> = [];
  if (sourceReportId) {
    mustNotClauses.push({ term: { _id: sourceReportId } });
  }

  const response = await esClient.search({
    index: HUNT_REPORTS_INDEX,
    size,
    track_total_hits: true,
    _source: [...SOURCE_FIELDS],
    ignore_unavailable: true,
    query: {
      bool: {
        filter: filterClauses,
        should: shouldClauses,
        minimum_should_match: 0,
        ...(mustNotClauses.length > 0 ? { must_not: mustNotClauses } : {}),
      },
    },
    sort: [{ _score: { order: 'desc' } }, { 'severity.score': { order: 'desc', missing: 0 } }],
  } as Parameters<typeof esClient.search>[0]);

  const hits = (response.hits.hits ?? []).map((hit) =>
    mapHit(
      hit as { _id: string; _score?: number | null; _source?: StoredReportSource },
      hashValues,
      networkValues,
      iocSetHash ?? null,
      cleanActors,
      cleanTechniques
    )
  );

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? hits.length;

  logger.debug(
    `search_by_anchors: ${hits.length} hits (total=${total}) in space="${spaceId}" ` +
      `discriminating_count=${anchorSummary.discriminating_anchor_count}`
  );

  return { hits, total, anchor_summary: anchorSummary };
};
