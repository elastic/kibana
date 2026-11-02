/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyResolvedEntityValueChanges,
  buildEntityFilterCountsRequest,
  parseEntityFilterCountsResponse,
} from './use_entity_filter_bar_counts';
import type { EntityFilterBarCounts } from './use_entity_filter_bar_counts';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import { RiskSeverity } from '../../../../common/search_strategy';
import { CriticalityLevelsForBulkUpload } from '../../../../common/entity_analytics/asset_criticality/constants';

// ─── buildEntityFilterCountsRequest ─────────────────────────────────────────

describe('buildEntityFilterCountsRequest', () => {
  it('uses the space-specific index alias', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'my-space', rowsMode: 'resolved' });
    expect(req.index).toEqual(['entities-latest-my-space']);
  });

  it('fetches no hits (size 0)', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'resolved' });
    expect(req.size).toBe(0);
  });

  it('filters to known entity types', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'resolved' });
    const filters = req.query.bool.filter;
    expect(filters).toContainEqual({
      terms: { 'entity.EngineMetadata.Type': getEntityAnalyticsEntityTypes() },
    });
  });

  it('applies the caller filter when provided', () => {
    const esFilter = { term: { 'host.name': 'foo' } };
    const req = buildEntityFilterCountsRequest({
      spaceId: 'default',
      rowsMode: 'resolved',
      filter: esFilter,
    });
    expect(req.query.bool.filter).toContainEqual(esFilter);
  });

  it('omits the caller filter when not provided', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'resolved' });
    // only the entity type allowlist filter (and the resolved-rows exclusion)
    const hasExtraTerms = req.query.bool.filter.some((f) => !('terms' in f) && !('bool' in f));
    expect(hasExtraTerms).toBe(false);
  });

  it('includes the resolved-rows exclusion when rowsMode is resolved', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'resolved' });
    const hasResolutionExclusion = req.query.bool.filter.some(
      (f) => 'bool' in f && 'must_not' in (f as { bool: Record<string, unknown> }).bool
    );
    expect(hasResolutionExclusion).toBe(true);
  });

  it('omits the resolved-rows exclusion when rowsMode is individual', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'individual' });
    const hasResolutionExclusion = req.query.bool.filter.some(
      (f) => 'bool' in f && 'must_not' in (f as { bool: Record<string, unknown> }).bool
    );
    expect(hasResolutionExclusion).toBe(false);
  });

  it('has all five agg fields', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'individual' });
    expect(req.aggs).toMatchObject({
      entity_types: { terms: { field: 'entity.EngineMetadata.Type' } },
      risk_levels: { terms: { field: 'entity.risk.calculated_level' } },
      asset_criticality: { terms: { field: 'asset.criticality' } },
      watchlists: { terms: { field: 'entity.attributes.watchlists' } },
      data_sources: { terms: { field: 'entity.source' } },
    });
  });

  it('counts unscored entities via missing: Unknown on risk_levels', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'individual' });
    expect(req.aggs).toMatchObject({ risk_levels: { terms: { missing: RiskSeverity.Unknown } } });
  });

  it("counts a resolved entity by its group's risk level, else its own", () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'resolved' });
    const groupLevel = 'entity.relationships.resolution.risk.calculated_level';

    expect(req.aggs).toMatchObject({
      group_risk_levels: {
        filter: { exists: { field: groupLevel } },
        aggs: { levels: { terms: { field: groupLevel } } },
      },
      risk_levels: {
        filter: { bool: { must_not: { exists: { field: groupLevel } } } },
        aggs: {
          levels: {
            terms: { field: 'entity.risk.calculated_level', missing: RiskSeverity.Unknown },
          },
        },
      },
    });
  });

  it('counts unassigned entities via missing: unassigned on asset_criticality', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', rowsMode: 'resolved' });
    expect(req.aggs.asset_criticality.terms.missing).toBe(
      CriticalityLevelsForBulkUpload.UNASSIGNED
    );
  });
});

// ─── parseEntityFilterCountsResponse ────────────────────────────────────────

describe('parseEntityFilterCountsResponse', () => {
  it('returns empty maps for undefined aggs', () => {
    const result = parseEntityFilterCountsResponse(undefined);
    expect(result).toEqual({
      entity_types: {},
      risk_levels: {},
      asset_criticality: {},
      watchlists: {},
      data_sources: {},
    });
  });

  it('maps buckets to key/count pairs for each agg', () => {
    const aggs = {
      entity_types: { buckets: [{ key: 'host', doc_count: 10 }] },
      risk_levels: { buckets: [{ key: 'Critical', doc_count: 3 }] },
      asset_criticality: { buckets: [{ key: 'extreme_impact', doc_count: 1 }] },
      watchlists: { buckets: [{ key: 'wl-1', doc_count: 5 }] },
      data_sources: { buckets: [{ key: 'okta', doc_count: 7 }] },
    } as Parameters<typeof parseEntityFilterCountsResponse>[0];

    expect(parseEntityFilterCountsResponse(aggs)).toEqual({
      entity_types: { host: 10 },
      risk_levels: { Critical: 3 },
      asset_criticality: { extreme_impact: 1 },
      watchlists: { 'wl-1': 5 },
      data_sources: { okta: 7 },
    });
  });

  it("adds the resolved entities' group risk levels to the others' own", () => {
    const aggs = {
      risk_levels: { levels: { buckets: [{ key: 'High', doc_count: 2 }] } },
      group_risk_levels: {
        levels: {
          buckets: [
            { key: 'High', doc_count: 1 },
            { key: 'Critical', doc_count: 4 },
          ],
        },
      },
    } as Parameters<typeof parseEntityFilterCountsResponse>[0];

    expect(parseEntityFilterCountsResponse(aggs).risk_levels).toEqual({ High: 3, Critical: 4 });
  });
});

describe('applyResolvedEntityValueChanges', () => {
  const COUNTS: EntityFilterBarCounts = {
    entity_types: { host: 3 },
    risk_levels: {},
    asset_criticality: { high_impact: 1, unassigned: 2 },
    watchlists: {},
    data_sources: { okta: 1 },
  };

  it("moves a resolved entity from its main entity's own values to its group's", () => {
    const counts = applyResolvedEntityValueChanges(COUNTS, [
      { field: 'asset.criticality', value: 'extreme_impact', change: 1 },
      { field: 'asset.criticality', value: 'high_impact', change: -1 },
      { field: 'entity.source', value: 'aws', change: 1 },
      { field: 'entity.source', value: 'okta', change: 1 },
      { field: 'entity.source', value: 'okta', change: -1 },
      { field: 'entity.attributes.watchlists', value: 'wl-2', change: 1 },
    ]);

    expect(counts).toEqual({
      ...COUNTS,
      asset_criticality: { extreme_impact: 1, high_impact: 0, unassigned: 2 },
      watchlists: { 'wl-2': 1 },
      data_sources: { okta: 1, aws: 1 },
    });
  });

  it('counts a missing criticality as unassigned, and skips missing sources and watchlists', () => {
    const counts = applyResolvedEntityValueChanges(COUNTS, [
      { field: 'asset.criticality', value: null, change: -1 },
      { field: 'entity.source', value: null, change: 1 },
    ]);

    expect(counts.asset_criticality.unassigned).toBe(1);
    expect(counts.data_sources).toEqual(COUNTS.data_sources);
  });

  it('never counts below zero', () => {
    const counts = applyResolvedEntityValueChanges(COUNTS, [
      { field: 'entity.source', value: 'okta', change: -3 },
    ]);

    expect(counts.data_sources.okta).toBe(0);
  });
});
