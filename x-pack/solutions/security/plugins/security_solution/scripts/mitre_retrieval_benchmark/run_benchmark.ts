/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  MITRE_SEMANTIC_FIELD,
  buildMitreAttackFieldMap,
  buildSemanticText,
  loadMitreAttackArtifact,
  type MitreEntity,
} from '@kbn/security-mitre-attack-common';
import { mean, ndcgAtK, percentile, recallAtK, reciprocalRank, successAtK } from './metrics';
import { buildQuerySet, type LabeledQuery, type Stratum } from './query_set';

const INDEX_NAME = '.mitre-retrieval-benchmark';
const INFERENCE_ID = '.elser-2-elasticsearch';
/**
 * Both consumers hand their whole result set to an LLM that then chooses, so the
 * question is whether the right entity is anywhere in the candidate window, not
 * whether it ranked first. `TOOL_K` is the assistant and agent-builder tool
 * default; `TOP_K` is `MAX_TECHNIQUE_CANDIDATES` in `add_mitre_mappings`.
 */
const TOP_K = 25;
const TOOL_K = 10;
const BULK_BATCH_SIZE = 50;

/**
 * Retrieval strategies under comparison.
 *
 * `bm25_poc`, `semantic_only` and `hybrid_rrf` mirror the queries the shipped
 * `MitreAttackDataClient` issues. `bm25_tuned` is benchmark-only: it exists to
 * check whether cheap keyword tuning closes whatever gap the semantic arms
 * open, before concluding that an inference dependency is warranted.
 *
 * `hybrid_tuned` fuses the tuned keyword leg with the semantic leg. `hybrid_rrf`
 * inherits the POC's keyword weaknesses (notably on misspelled names) because
 * its keyword leg is untuned, so `hybrid_tuned` is the arm that represents the
 * best configuration actually available to ship.
 */
export type Arm =
  | 'bm25_poc'
  | 'bm25_tuned'
  | 'semantic_only'
  | 'hybrid_rrf'
  | 'hybrid_tuned'
  | 'bm25_expanded'
  | 'semantic_expanded'
  | 'hybrid_expanded';

const ARMS: Arm[] = [
  'bm25_poc',
  'bm25_tuned',
  'semantic_only',
  'hybrid_rrf',
  'hybrid_tuned',
  'bm25_expanded',
  'semantic_expanded',
  'hybrid_expanded',
];

/**
 * Arms that search with an LLM-rewritten form of the query rather than the
 * user's own words, to test whether a query-planning step in the skill closes
 * the vocabulary gap that the semantic leg is otherwise there to close. They
 * are scored only over queries an expansion was supplied for, so their `n` is
 * reported separately.
 */
const EXPANDED_ARMS = new Set<Arm>(['bm25_expanded', 'semantic_expanded', 'hybrid_expanded']);

const STRATA: Stratum[] = [
  'indep_tactic',
  'indep_abstract',
  'indep_technique',
  'prompt_tactic',
  'prompt_abstract',
  'prompt_technique',
  'stale_id',
  'stale_name',
  'v19_new',
  'exact_id',
  'exact_name',
  'near_name',
  'description_lead',
  'behavioral',
  'rule_prompt',
];

const keywordQuery = (query: string) => ({
  multi_match: {
    query,
    fields: ['name.text^3', 'description', 'id^2'],
    operator: 'or' as const,
  },
});

/**
 * Adds fuzziness and an exact-id clause on top of the shipped keyword query, so
 * a win for the semantic arms cannot be explained by an untuned baseline.
 */
const tunedKeywordQuery = (query: string) => ({
  bool: {
    should: [
      { term: { id: { value: query.toUpperCase(), boost: 10 } } },
      {
        multi_match: {
          query,
          fields: ['name.text^3', 'description'],
          type: 'best_fields' as const,
          fuzziness: 'AUTO',
          operator: 'or' as const,
        },
      },
      {
        multi_match: {
          query,
          fields: ['name.text^2', 'description'],
          type: 'cross_fields' as const,
          operator: 'or' as const,
        },
      },
    ],
    minimum_should_match: 1,
  },
});

const semanticQuery = (query: string) => ({
  semantic: { field: MITRE_SEMANTIC_FIELD, query },
});

const buildRrf = (keywordLeg: object, semanticLeg: object) => ({
  retriever: {
    rrf: {
      retrievers: [{ standard: { query: keywordLeg } }, { standard: { query: semanticLeg } }],
      rank_window_size: Math.max(50, TOP_K * 4),
      rank_constant: 60,
    },
  },
});

const buildSearchBody = (arm: Arm, query: string) => {
  switch (arm) {
    case 'bm25_poc':
      return { query: keywordQuery(query) };
    case 'bm25_tuned':
      return { query: tunedKeywordQuery(query) };
    case 'semantic_only':
      return { query: semanticQuery(query) };
    case 'hybrid_rrf':
      return buildRrf(keywordQuery(query), semanticQuery(query));
    case 'hybrid_tuned':
    case 'hybrid_expanded':
      return buildRrf(tunedKeywordQuery(query), semanticQuery(query));
    case 'bm25_expanded':
      return { query: tunedKeywordQuery(query) };
    case 'semantic_expanded':
      return { query: semanticQuery(query) };
  }
};

interface ArmResult {
  recallAt1: number[];
  recallAt5: number[];
  recallAt10: number[];
  recallAt25: number[];
  successAt10: number[];
  successAt25: number[];
  labelCount: number[];
  mrr: number[];
  ndcg: number[];
}

const emptyArmResult = (): ArmResult => ({
  recallAt1: [],
  recallAt5: [],
  recallAt10: [],
  recallAt25: [],
  successAt10: [],
  successAt25: [],
  labelCount: [],
  mrr: [],
  ndcg: [],
});

const hydrateBenchmarkIndex = async (
  client: Client,
  entities: MitreEntity[],
  log: ToolingLog
): Promise<number> => {
  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (exists) {
    log.info(`Deleting existing ${INDEX_NAME}`);
    await client.indices.delete({ index: INDEX_NAME });
  }

  const fieldMap = buildMitreAttackFieldMap({ semanticInferenceId: INFERENCE_ID });
  const properties: Record<string, unknown> = {};
  for (const [name, definition] of Object.entries(fieldMap)) {
    const { required: _required, array: _array, multi_fields: multiFields, ...rest } = definition;
    properties[name] = multiFields
      ? {
          ...rest,
          fields: Object.fromEntries(
            multiFields.map((multiField) => [multiField.name, { type: multiField.type }])
          ),
        }
      : rest;
  }

  log.info(`Creating ${INDEX_NAME} with a semantic_text field on "${MITRE_SEMANTIC_FIELD}"`);
  await client.indices.create({
    index: INDEX_NAME,
    mappings: { dynamic: 'strict', properties: properties as never },
  });

  const startedAt = Date.now();
  for (let offset = 0; offset < entities.length; offset += BULK_BATCH_SIZE) {
    const slice = entities.slice(offset, offset + BULK_BATCH_SIZE);
    const operations = slice.flatMap((entity) => [
      { index: { _index: INDEX_NAME, _id: `${entity.framework}:${entity.id}` } },
      { ...entity, [MITRE_SEMANTIC_FIELD]: buildSemanticText(entity) },
    ]);

    const response = await client.bulk({ operations, refresh: false }, { requestTimeout: 300_000 });
    if (response.errors) {
      const firstError = response.items
        .map((item) => Object.values(item)[0]?.error)
        .find((error) => error != null);
      throw new Error(`Bulk indexing failed: ${JSON.stringify(firstError)}`);
    }
    log.debug(`Indexed ${Math.min(offset + BULK_BATCH_SIZE, entities.length)}/${entities.length}`);
  }

  await client.indices.refresh({ index: INDEX_NAME });
  const elapsedMs = Date.now() - startedAt;
  log.info(`Embedded and indexed ${entities.length} entities in ${(elapsedMs / 1000).toFixed(1)}s`);
  return elapsedMs;
};

export type ExpansionMap = Map<string, string>;

/**
 * Resolves the text an arm actually searches with. Returns undefined when the
 * arm expands but no expansion was supplied for this query, which tells the
 * caller to skip rather than silently score the raw prompt as if it had been
 * expanded.
 */
const resolveQueryText = (arm: Arm, query: string, expansions: ExpansionMap): string | undefined =>
  EXPANDED_ARMS.has(arm) ? expansions.get(query) : query;

const runArm = async (
  client: Client,
  arm: Arm,
  queries: LabeledQuery[],
  expansions: ExpansionMap
): Promise<Map<Stratum, ArmResult>> => {
  const byStratum = new Map<Stratum, ArmResult>();

  const searchable = queries.flatMap((labeled) => {
    const searchText = resolveQueryText(arm, labeled.query, expansions);
    return searchText == null ? [] : [{ ...labeled, searchText }];
  });

  for (const { stratum, relevant, searchText } of searchable) {
    const response = await client.search<MitreEntity>({
      index: INDEX_NAME,
      size: TOP_K,
      track_total_hits: false,
      _source: ['id'],
      ...buildSearchBody(arm, searchText),
    });

    const ranked = (response.hits?.hits ?? [])
      .map((hit) => hit._source?.id)
      .filter((id): id is string => id != null);

    const result = byStratum.get(stratum) ?? emptyArmResult();
    result.recallAt1.push(recallAtK(ranked, relevant, 1));
    result.recallAt5.push(recallAtK(ranked, relevant, 5));
    result.recallAt10.push(recallAtK(ranked, relevant, TOOL_K));
    result.recallAt25.push(recallAtK(ranked, relevant, TOP_K));
    result.successAt10.push(successAtK(ranked, relevant, TOOL_K));
    result.successAt25.push(successAtK(ranked, relevant, TOP_K));
    result.labelCount.push(relevant.size);
    result.mrr.push(reciprocalRank(ranked, relevant, TOOL_K));
    result.ndcg.push(ndcgAtK(ranked, relevant, TOOL_K));
    byStratum.set(stratum, result);
  }

  return byStratum;
};

/**
 * Elasticsearch caches the query-side ELSER embedding per query string, so an arm
 * that runs after another arm on the same string reads its vector from cache and
 * looks ~6x faster than it really is. Measuring cold cost therefore requires a
 * separate pass in which every arm sees a string nothing has embedded before; the
 * nonce is what guarantees the cache miss.
 */
const measureColdLatency = async (
  client: Client,
  arm: Arm,
  queries: LabeledQuery[],
  expansions: ExpansionMap
): Promise<Map<Stratum, number[]>> => {
  const byStratum = new Map<Stratum, number[]>();
  const nonceSeed = `${arm}-${Date.now()}`;

  const searchable = queries.flatMap(({ stratum, query }) => {
    const searchText = resolveQueryText(arm, query, expansions);
    return searchText == null ? [] : [{ stratum, searchText }];
  });

  for (const [index, { stratum, searchText }] of searchable.entries()) {
    const coldQuery = `${searchText} zz${nonceSeed}${index}`;
    const startedAt = Date.now();
    await client.search<MitreEntity>({
      index: INDEX_NAME,
      size: TOP_K,
      track_total_hits: false,
      _source: ['id'],
      ...buildSearchBody(arm, coldQuery),
    });

    const samples = byStratum.get(stratum) ?? [];
    samples.push(Date.now() - startedAt);
    byStratum.set(stratum, samples);
  }

  return byStratum;
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const renderLatencyTable = (log: ToolingLog, coldLatency: Map<Arm, Map<Stratum, number[]>>) => {
  log.write('');
  log.write('### cold-cache latency (per-arm, unseen query strings)');
  log.write(
    ['arm', ...STRATA.map(String), 'overall p50', 'overall p95']
      .map((header) => header.padEnd(18))
      .join('')
  );

  for (const arm of ARMS.filter((candidate) => coldLatency.has(candidate))) {
    const byStratum = coldLatency.get(arm) ?? new Map<Stratum, number[]>();
    const all = STRATA.flatMap((stratum) => byStratum.get(stratum) ?? []);
    log.write(
      [
        arm,
        ...STRATA.map((stratum) => {
          const samples = byStratum.get(stratum);
          return samples?.length ? `${Math.round(percentile(samples, 0.5))} ms` : '-';
        }),
        `${Math.round(percentile(all, 0.5))} ms`,
        `${Math.round(percentile(all, 0.95))} ms`,
      ]
        .map((cell) => cell.padEnd(18))
        .join('')
    );
  }
};

const renderTable = (
  log: ToolingLog,
  results: Map<Arm, Map<Stratum, ArmResult>>,
  queries: LabeledQuery[]
) => {
  const countByStratum = new Map<Stratum, number>();
  for (const { stratum } of queries) {
    countByStratum.set(stratum, (countByStratum.get(stratum) ?? 0) + 1);
  }

  for (const stratum of STRATA.filter((candidate) => (countByStratum.get(candidate) ?? 0) > 0)) {
    const anyResult = ARMS.map((arm) => results.get(arm)?.get(stratum)).find(Boolean);
    const labelsPerQuery = anyResult ? mean(anyResult.labelCount).toFixed(2) : '-';

    log.write('');
    log.write(`### ${stratum} (n=${countByStratum.get(stratum)}, labels/query=${labelsPerQuery})`);
    log.write(
      ['arm', 'n', 'R@1', 'R@10', 'R@25', 'S@10', 'S@25', 'MRR@10', 'nDCG@10']
        .map((header) => header.padEnd(16))
        .join('')
    );

    for (const arm of ARMS) {
      const result = results.get(arm)?.get(stratum);
      if (result) {
        log.write(
          [
            arm,
            String(result.recallAt1.length),
            formatPercent(mean(result.recallAt1)),
            formatPercent(mean(result.recallAt10)),
            formatPercent(mean(result.recallAt25)),
            formatPercent(mean(result.successAt10)),
            formatPercent(mean(result.successAt25)),
            mean(result.mrr).toFixed(3),
            mean(result.ndcg).toFixed(3),
          ]
            .map((cell) => cell.padEnd(16))
            .join('')
        );
      }
    }
  }
};

const emitJson = (
  results: Map<Arm, Map<Stratum, ArmResult>>,
  queries: LabeledQuery[],
  hydrationMs: number,
  coldLatency: Map<Arm, Map<Stratum, number[]>>
) => {
  const payload = {
    generatedAt: new Date().toISOString(),
    topK: TOP_K,
    hydrationMs,
    queryCount: queries.length,
    arms: Object.fromEntries(
      ARMS.map((arm) => [
        arm,
        Object.fromEntries(
          STRATA.flatMap((stratum) => {
            const result = results.get(arm)?.get(stratum);
            if (!result) return [];
            return [
              [
                stratum,
                {
                  n: result.mrr.length,
                  recallAt1: mean(result.recallAt1),
                  recallAt5: mean(result.recallAt5),
                  recallAt10: mean(result.recallAt10),
                  recallAt25: mean(result.recallAt25),
                  successAt10: mean(result.successAt10),
                  successAt25: mean(result.successAt25),
                  labelsPerQuery: mean(result.labelCount),
                  mrr: mean(result.mrr),
                  ndcg: mean(result.ndcg),
                  coldLatencyP50: percentile(coldLatency.get(arm)?.get(stratum) ?? [], 0.5),
                  coldLatencyP95: percentile(coldLatency.get(arm)?.get(stratum) ?? [], 0.95),
                },
              ],
            ];
          })
        ),
      ])
    ),
  };

  return JSON.stringify(payload, null, 2);
};

/**
 * Reads `{ prompt, expansion }` pairs produced offline by a model. Kept out of
 * the run itself so the benchmark stays deterministic and needs no model
 * credentials; the LLM call's latency is a property of the calling skill rather
 * than of retrieval.
 */
const loadExpansions = async (log: ToolingLog): Promise<ExpansionMap> => {
  const expansionPath = process.env.EXPANSIONS_JSON;
  if (!expansionPath) {
    return new Map();
  }

  const fs = await import('fs/promises');
  const parsed = JSON.parse(await fs.readFile(expansionPath, 'utf-8')) as Array<{
    prompt: string;
    expansion: string;
  }>;
  const expansions = new Map(parsed.map(({ prompt, expansion }) => [prompt, expansion]));
  log.info(`Loaded ${expansions.size} expansions from ${expansionPath}`);
  return expansions;
};

const benchmark = async (log: ToolingLog) => {
  const node = process.env.ES_URL ?? 'http://localhost:9200';
  const username = process.env.ES_USERNAME ?? 'elastic';
  const password = process.env.ES_PASSWORD ?? 'changeme';
  const samplesPerStratum = Number(process.env.SAMPLES_PER_STRATUM ?? 150);
  const seed = Number(process.env.SEED ?? 1337);
  const skipHydration = process.env.SKIP_HYDRATION === 'true';

  const client = new Client({ node, auth: { username, password } });

  const artifact = loadMitreAttackArtifact();
  log.info(`Artifact ${artifact.stamp} with ${artifact.entities.length} entities`);

  const hydrationMs = skipHydration
    ? 0
    : await hydrateBenchmarkIndex(client, artifact.entities, log);

  const { queries, unknownLabels } = await buildQuerySet({
    entities: artifact.entities,
    samplesPerStratum,
    seed,
  });

  if (unknownLabels.length > 0) {
    log.warning(
      `Dropped ${unknownLabels.length} label(s) absent from ${artifact.stamp}: ${unknownLabels.join(
        ', '
      )}`
    );
  }
  log.info(`Running ${queries.length} queries across ${ARMS.length} arms`);

  const expansions = await loadExpansions(log);

  const activeArms = ARMS.filter((arm) => !EXPANDED_ARMS.has(arm) || expansions.size > 0);

  const results = new Map<Arm, Map<Stratum, ArmResult>>();
  for (const arm of activeArms) {
    log.info(`Arm: ${arm}`);
    results.set(arm, await runArm(client, arm, queries, expansions));
  }

  const coldLatency = new Map<Arm, Map<Stratum, number[]>>();
  for (const arm of activeArms) {
    log.info(`Cold latency: ${arm}`);
    coldLatency.set(arm, await measureColdLatency(client, arm, queries, expansions));
  }

  renderTable(log, results, queries);
  renderLatencyTable(log, coldLatency);

  const jsonPath = process.env.OUTPUT_JSON;
  if (jsonPath) {
    const fs = await import('fs/promises');
    await fs.writeFile(jsonPath, emitJson(results, queries, hydrationMs, coldLatency), 'utf-8');
    log.write('');
    log.info(`Wrote results to ${jsonPath}`);
  }

  await client.close();
};

export const runBenchmark = () =>
  run(async ({ log }) => benchmark(log), {
    description:
      'Compares BM25, semantic (ELSER) and hybrid RRF retrieval over the managed MITRE ATT&CK index. Requires a running Elasticsearch with ELSER deployed.',
  });
