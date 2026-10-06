/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import type { DiscoveredDataset } from './discover_hunt_datasets';
import { buildMatchesRequired } from './matches_required';
import { matchDatasetsWithModel } from './match_hunt_datasets';
import { resolveTier2Targets } from './resolve_tier2_targets';
import { MAX_SCOPE_TARGETS } from './scope_bounds';

jest.mock('./match_hunt_datasets', () => ({
  matchDatasetsWithModel: jest.fn(),
}));

const matchDatasetsWithModelMock = matchDatasetsWithModel as jest.MockedFunction<
  typeof matchDatasetsWithModel
>;

const model = {} as ScopedModel;

const oktaDataset: DiscoveredDataset = {
  index_pattern: 'logs-okta.system-*',
  dataset: 'okta.system',
  vendor: 'okta',
  data_streams: ['logs-okta.system-default'],
  search_patterns: ['logs-okta.system-*'],
};

const emptyScope = {
  report_matches: [],
  actionable_indices: [],
  discovered: [oktaDataset],
  index_patterns: ['*'],
};

const hits = (...indices: string[]) => ({
  per_index: indices.map((index) => ({ index, hit_count: 1, required: true })),
});

describe('resolveTier2Targets', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    matchDatasetsWithModelMock.mockReset();
    matchDatasetsWithModelMock.mockResolvedValue(undefined);
  });

  it('unions the report match, the Tier 1 hit indices, and the actionable indices, recording each source in a fixed order', async () => {
    const result = await resolveTier2Targets({
      scope: {
        ...emptyScope,
        report_matches: ['logs-okta.system-*'],
        actionable_indices: ['logs-endpoint.events.process-default*'],
      },
      tier1: hits('.ds-logs-okta.system-default-2026.09.30-000001'),
      logger,
    });

    expect(result).toEqual({
      tier2_targets: [
        'logs-okta.system-*',
        'logs-okta.system-default*',
        'logs-endpoint.events.process-default*',
      ],
      tier2_target_sources: ['report_match', 'tier1_hits', 'actionable'],
      degraded: false,
    });
  });

  it('collapses Tier 1 hit indices to a wildcard-suffixed stream or index, deduped', async () => {
    const result = await resolveTier2Targets({
      scope: emptyScope,
      tier1: hits(
        '.ds-logs-okta.system-default-2026.09.30-000001',
        '.ds-logs-okta.system-default-2026.09.30-000002',
        'winlogbeat-8.15.0-2026.09.30'
      ),
      logger,
    });

    expect(result.tier2_targets).toEqual([
      'logs-okta.system-default*',
      'winlogbeat-8.15.0-2026.09.30*',
    ]);
    expect(result.tier2_target_sources).toEqual(['tier1_hits']);
  });

  it('lists only the sources that contributed', async () => {
    const result = await resolveTier2Targets({
      scope: { ...emptyScope, actionable_indices: ['logs-endpoint.events.process-default*'] },
      tier1: hits(),
      logger,
    });

    expect(result.tier2_target_sources).toEqual(['actionable']);
  });

  describe('the model fallback', () => {
    const report = { text: 'Okta session theft' };
    const modelMatch = {
      matches: [oktaDataset],
      confidence: 0.9,
      scored: [{ dataset: 'okta.system', confidence: 0.9 }],
    };

    it('runs when the report match and the Tier 1 hits are both empty, and reads degraded', async () => {
      matchDatasetsWithModelMock.mockResolvedValueOnce(modelMatch);

      const result = await resolveTier2Targets({
        scope: { ...emptyScope, actionable_indices: ['logs-endpoint.events.process-default*'] },
        tier1: hits(),
        report,
        model,
        logger,
      });

      expect(matchDatasetsWithModelMock).toHaveBeenCalledWith({
        model,
        datasets: [oktaDataset],
        report,
        logger,
      });
      expect(result).toEqual({
        tier2_targets: ['logs-okta.system-*', 'logs-endpoint.events.process-default*'],
        tier2_target_sources: ['model', 'actionable'],
        degraded: true,
      });
    });

    it('is not called when the report matched a dataset', async () => {
      await resolveTier2Targets({
        scope: { ...emptyScope, report_matches: ['logs-okta.system-*'] },
        tier1: hits(),
        report,
        model,
        logger,
      });

      expect(matchDatasetsWithModelMock).not.toHaveBeenCalled();
    });

    it('is not called when Tier 1 hit an index', async () => {
      await resolveTier2Targets({
        scope: emptyScope,
        tier1: hits('logs-endpoint.events.process-default'),
        report,
        model,
        logger,
      });

      expect(matchDatasetsWithModelMock).not.toHaveBeenCalled();
    });

    it.each([
      ['there is no model', { report }],
      ['there is no report text', { model, report: { vendor: 'Okta' } }],
      ['there is no report at all', { model }],
    ])('is not called when %s', async (_label, inputs) => {
      const result = await resolveTier2Targets({
        scope: emptyScope,
        tier1: hits(),
        logger,
        ...inputs,
      });

      expect(matchDatasetsWithModelMock).not.toHaveBeenCalled();
      expect(result.tier2_targets).toEqual([]);
    });

    it('contributes nothing when the model matched nothing', async () => {
      const result = await resolveTier2Targets({
        scope: emptyScope,
        tier1: hits(),
        report,
        model,
        logger,
      });

      expect(matchDatasetsWithModelMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ tier2_targets: [], tier2_target_sources: [], degraded: false });
    });
  });

  describe('bounding the union', () => {
    it('collapses a union that does not fit onto one pattern per dataset and reads degraded', async () => {
      const datasets = MAX_SCOPE_TARGETS / 2;
      const reportMatches = Array.from({ length: datasets }, (_, index) => [
        `logs-vendor${index}.stream-default*`,
        `logs-vendor${index}.stream-prod*`,
        `logs-vendor${index}.stream-staging*`,
      ]).flat();

      const result = await resolveTier2Targets({
        scope: { ...emptyScope, report_matches: reportMatches },
        tier1: hits(),
        logger,
      });

      expect(result.tier2_targets).toHaveLength(datasets);
      expect(result.tier2_targets).toContain('logs-vendor0.stream-*');
      expect(result.tier2_target_sources).toEqual(['report_match']);
      expect(result.degraded).toBe(true);
    });

    it('drops a union that cannot fit even as vendor wildcards, and reads degraded', async () => {
      const reportMatches = Array.from(
        { length: MAX_SCOPE_TARGETS },
        (_, index) => `logs-vendor${index}.stream-default*`
      );
      const actionable = reportMatches.map((pattern) => pattern.replace('logs-', 'metrics-'));

      const result = await resolveTier2Targets({
        scope: { ...emptyScope, report_matches: reportMatches, actionable_indices: actionable },
        tier1: hits(),
        logger,
      });

      expect(result).toEqual({ tier2_targets: [], tier2_target_sources: [], degraded: true });
    });
  });

  describe('constraining against the universe', () => {
    it('narrows a generalized dataset pattern that reaches outside the universe exclusion to its own backing streams', async () => {
      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: ['logs-okta.system-*'],
          index_patterns: ['logs-okta.system-*', '-logs-okta.system-prod*'],
        },
        tier1: hits(),
        logger,
      });

      expect(result.tier2_targets).toEqual(['logs-okta.system-default*']);
      expect(result.tier2_target_sources).toEqual(['report_match']);
      expect(result.degraded).toBe(true);

      // The excluded stream must be absent from both what Tier 2 targets (the FROM)
      // and what it allows (the hit bar / `assertEsqlSourcesAllowed` allowlist) — both
      // read straight off `tier2_targets`.
      const matchesRequired = buildMatchesRequired(result.tier2_targets);
      expect(matchesRequired('.ds-logs-okta.system-prod-2026.09.30-000001')).toBe(false);
      expect(matchesRequired('.ds-logs-okta.system-default-2026.09.30-000001')).toBe(true);
    });

    it('drops a pattern that reaches outside the universe and has no owning dataset to narrow it against', async () => {
      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: ['logs-okta.system-*', 'logs-okta.system-prod*'],
          index_patterns: ['logs-okta.system-*', '-logs-okta.system-prod*'],
        },
        tier1: hits(),
        logger,
      });

      expect(result.tier2_targets).toEqual(['logs-okta.system-default*']);
      expect(result.tier2_target_sources).toEqual(['report_match']);
      expect(result.degraded).toBe(true);
    });

    it('constrains a namespace restriction with no exclusion syntax the same way', async () => {
      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: ['logs-okta.system-*'],
          index_patterns: ['logs-okta.system-default*'],
        },
        tier1: hits(),
        logger,
      });

      expect(result.tier2_targets).toEqual(['logs-okta.system-default*']);
      expect(result.degraded).toBe(true);
    });

    it('leaves a pattern untouched and not degraded when it already stays inside the universe', async () => {
      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: ['logs-okta.system-*'],
          index_patterns: ['logs-*'],
        },
        tier1: hits(),
        logger,
      });

      expect(result.tier2_targets).toEqual(['logs-okta.system-*']);
      expect(result.degraded).toBe(false);
    });

    it('does not accept a generalized pattern merely because a narrower positive happens to extend its prefix', async () => {
      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: ['logs-okta.system-*'],
          // Narrower than the generalized candidate's own prefix — a single synthetic
          // probe character used to wrongly accept this before the prefix rewrite.
          index_patterns: ['logs-okta.system-x*'],
        },
        tier1: hits(),
        logger,
      });

      // oktaDataset's only backing stream is 'logs-okta.system-default', which does not
      // stay inside 'logs-okta.system-x*' either, so there is nothing safe to narrow to.
      expect(result.tier2_targets).toEqual([]);
      expect(result.degraded).toBe(true);
    });

    it('accepts a narrowed pattern against an exact, non-wildcard universe entry', async () => {
      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: ['logs-okta.system-*'],
          index_patterns: ['logs-okta.system-default'],
        },
        tier1: hits(),
        logger,
      });

      expect(result.tier2_targets).toEqual(['logs-okta.system-default*']);
      expect(result.degraded).toBe(true);
    });

    it('grants no coverage from a universe positive with a wildcard in the middle', async () => {
      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: ['logs-okta.system-*'],
          // Shares a literal prefix with the candidate, but also requires '-default'
          // later in the name — something a prefix comparison cannot verify, so this
          // positive must not be trusted to cover a trailing-wildcard candidate.
          index_patterns: ['logs-*-default*'],
        },
        tier1: hits(),
        logger,
      });

      expect(result.tier2_targets).toEqual([]);
      expect(result.degraded).toBe(true);
    });
  });

  describe('re-checking after the request-path bound', () => {
    it('narrows a dataset-collapsed pattern that the bound re-widened past an exclusion', async () => {
      const vendorDatasetCount = MAX_SCOPE_TARGETS / 2;
      const vendorMatches = Array.from({ length: vendorDatasetCount }, (_, index) => [
        `logs-vendor${index}.stream-default*`,
        `logs-vendor${index}.stream-prod*`,
        `logs-vendor${index}.stream-staging*`,
      ]).flat();

      // Only the 'default' stream was ever discovered — the universe excludes 'prod'.
      const oktaNoProd: DiscoveredDataset = {
        index_pattern: 'logs-okta.system-*',
        dataset: 'okta.system',
        vendor: 'okta',
        data_streams: ['logs-okta.system-default'],
        search_patterns: ['logs-okta.system-default*'],
      };

      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: [...vendorMatches, 'logs-okta.system-default*'],
          discovered: [oktaNoProd],
          index_patterns: ['logs-*', '-logs-okta.system-prod*'],
        },
        tier1: hits(),
        logger,
      });

      // `boundTargetPatterns` collapses the oversized union onto one pattern per
      // dataset, reconstructing the generalized 'logs-okta.system-*' from the safe,
      // narrow 'logs-okta.system-default*' it was given. The final check has to undo
      // that re-widening rather than let it ship as the Tier 2 target and allowlist.
      expect(result.tier2_targets).toContain('logs-okta.system-default*');
      expect(result.tier2_targets).not.toContain('logs-okta.system-*');
      expect(result.degraded).toBe(true);
    });

    it('drops the result when trading a collapsed pattern back for its streams grows past the request-path limit', async () => {
      const vendorDatasetCount = MAX_SCOPE_TARGETS / 2;
      const vendorMatches = Array.from({ length: vendorDatasetCount }, (_, index) => [
        `logs-vendor${index}.stream-default*`,
        `logs-vendor${index}.stream-prod*`,
        `logs-vendor${index}.stream-staging*`,
      ]).flat();

      // Discovery found 40 namespaces for this dataset — none of them 'prod' — so
      // narrowing back out of the dataset-wide collapse re-expands to all 40.
      const manyStreams = Array.from({ length: 40 }, (_, index) => `logs-okta.system-ns${index}`);
      const oktaManyStreams: DiscoveredDataset = {
        index_pattern: 'logs-okta.system-*',
        dataset: 'okta.system',
        vendor: 'okta',
        data_streams: manyStreams,
        search_patterns: manyStreams.map((stream) => `${stream}*`),
      };

      const result = await resolveTier2Targets({
        scope: {
          ...emptyScope,
          report_matches: [...vendorMatches, 'logs-okta.system-ns0*'],
          discovered: [oktaManyStreams],
          index_patterns: ['logs-*', '-logs-okta.system-prod*'],
        },
        tier1: hits(),
        logger,
      });

      // 32 vendor patterns plus 40 re-expanded okta streams is 72 — over
      // MAX_SCOPE_TARGETS — so the whole run gets no target rather than a partially
      // bounded one.
      expect(result).toEqual({ tier2_targets: [], tier2_target_sources: [], degraded: true });
    });
  });

  it('returns empty, not degraded, when every signal is empty', async () => {
    expect(await resolveTier2Targets({ scope: emptyScope, tier1: hits(), logger })).toEqual({
      tier2_targets: [],
      tier2_target_sources: [],
      degraded: false,
    });
  });
});
