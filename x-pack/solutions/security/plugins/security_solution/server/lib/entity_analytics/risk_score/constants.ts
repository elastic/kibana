/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The risk scoring algorithm uses a Riemann zeta function to sum an entity's risk inputs to a known, finite value (@see getRiemannZetaValue).
 * It does so by assigning each input a weight based on its position in the list (ordered by score) of inputs.
 * This value represents the complex variable s of Re(s) in traditional Riemann zeta function notation.
 *
 * Read more: https://en.wikipedia.org/wiki/Riemann_zeta_function
 */
export const RIEMANN_ZETA_S_VALUE = 1.5;

/**
 * Default number of an entity's highest-scoring alerts that feed its risk score
 * (`alertSampleSizePerShard`). Alerts past this many add almost nothing to the score: with every
 * alert at 100, the 500 highest already reach about 97% of the 10,000-alert total. The scoring
 * query reserves memory for this many values per entity up front, whatever the entity's alert
 * count, so a large sample size costs memory on every page.
 */
export const DEFAULT_ALERT_SAMPLE_SIZE = 500;

const partialZetaSum = (s: number, terms: number): number => {
  let sum = 0;
  for (let k = 1; k <= terms; k++) {
    sum += k ** -s;
  }
  return sum;
};

const zetaBySampleSize = new Map<number, number>();

/**
 * Returns the value calculated by Riemann Zeta function for RIEMANN_ZETA_S_VALUE with `sampleSize` iterations (inputs).
 * The maximum unnormalized risk score value is calculated by multiplying this value by the maximum alert risk_score (100),
 * so normalization maps an entity whose sampled alerts all score 100 to a normalized score of 100.
 *
 * Normalize with the sample size the scoring query actually used, which `alertSampleSizePerShard` can override.
 * Dividing by the value for another sample size pushes saturated scores past 100 (larger sample size) or below it (smaller).
 * Results are memoized per sample size, since the sum is O(sampleSize).
 *
 * The Riemann Zeta value for different number of inputs is:
 * | 𝑍(s,inputs)  |
 * | :---------------------------------------|
 * | 𝑍(1.5,10)≈1.9953364933456017            |
 * | 𝑍(1.5,100)≈2.412874098703719            |
 * | 𝑍(1.5,500)≈2.522977328584379            |
 * | 𝑍(1.5,1000)≈2.5491456029175756          |
 * | 𝑍(1.5,10_000)≈2.5923758486729866        |
 * | 𝑍(1.5,100_000)≈2.6060508091764736       |
 * | 𝑍(1.5,1_000_000)≈2.6103753491852295     |
 * | 𝑍(1.5,10_000_000)≈2.611742893169012     |
 * | 𝑍(1.5,100_000_000)≈2.6121753486854478   |
 * | 𝑍(1.5,1_000_000_000)≈2.6123121030481857 |
 *
 * Read more: https://en.wikipedia.org/wiki/Riemann_zeta_function
 */
export const getRiemannZetaValue = (sampleSize: number): number => {
  const terms = Math.max(1, Math.floor(sampleSize));
  const cached = zetaBySampleSize.get(terms);
  if (cached !== undefined) {
    return cached;
  }
  const value = partialZetaSum(RIEMANN_ZETA_S_VALUE, terms);
  zetaBySampleSize.set(terms, value);
  return value;
};

/**
 * This value represents the maximum possible risk score after normalization.
 */
export const RISK_SCORING_NORMALIZATION_MAX = 100;

/**
 * This value represents the max amount of alert inputs we store, per entity, in the risk document.
 */
export const MAX_INPUTS_COUNT = 10;

export const RISK_SCORING_REQUEST_TIMEOUT = '5m';

/**
 * Aligns maintainer resolution-member fetch bounds with entity_store resolution APIs,
 * which cap resolution search responses at 10k and treat larger groups as truncated.
 */
export const MAX_RESOLUTION_MEMBER_FETCH_COUNT = 10_000;

/**
 * Page size for entity store cursor-mode (`search_after`) reads.
 *
 * Bounded only by `index.max_result_window` (default 10,000) when the cursor's
 * implicit `from` is 0 — which is the case for `search_after`. We sit at that
 * cap.
 *
 * Phase 0 lookup build uses this directly. Phase 1 base scoring is driven by
 * the lookup index (cursor-paginated via ES|QL output on `entity_id`) and
 * doesn't read the entity store directly anymore — see
 * `score_base_entities.ts` for the `WHERE entity_id IN (...)` scoring path.
 */
export const MAX_ENTITY_SEARCH_PAGE_SIZE = 10_000;

/**
 * Maximum number of resolution target IDs scored per ES|QL pass.
 *
 * Resolution scoring still uses an `IN (...)` clause sourced from a composite
 * aggregation over the lookup index. The effective ceiling on this count is
 * `index.max_terms_count` (default 65,536). 10,000 fits well within that and
 * matches the ES|QL row-output cap so the in-query LIMIT never truncates.
 */
export const MAX_RESOLUTION_TARGETS_PER_PAGE = 10_000;
