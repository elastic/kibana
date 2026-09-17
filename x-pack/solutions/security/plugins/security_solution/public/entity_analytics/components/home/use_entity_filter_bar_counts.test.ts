/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEntityFilterCountsRequest,
  parseEntityFilterCountsResponse,
} from './use_entity_filter_bar_counts';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import { RiskSeverity } from '../../../../common/search_strategy';
import { CriticalityLevelsForBulkUpload } from '../../../../common/entity_analytics/asset_criticality/constants';

// ─── buildEntityFilterCountsRequest ─────────────────────────────────────────

describe('buildEntityFilterCountsRequest', () => {
  it('targets the space-specific entity-latest alias', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'my-space', view: 'resolved' });
    expect(req.index).toEqual(['entities-latest-my-space']);
  });

  it('requests size 0 (agg-only, no hits)', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', view: 'resolved' });
    expect(req.size).toBe(0);
  });

  it('always includes an entity type allowlist filter', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', view: 'resolved' });
    const filters = req.query.bool.filter;
    expect(filters).toContainEqual({
      terms: { 'entity.EngineMetadata.Type': getEntityAnalyticsEntityTypes() },
    });
  });

  it('includes the caller-supplied filter when provided', () => {
    const esFilter = { term: { 'host.name': 'foo' } };
    const req = buildEntityFilterCountsRequest({
      spaceId: 'default',
      view: 'resolved',
      filter: esFilter,
    });
    expect(req.query.bool.filter).toContainEqual(esFilter);
  });

  it('omits the caller-supplied filter when not provided', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', view: 'resolved' });
    // only the entity type allowlist filter (and the resolved-view exclusion)
    const hasExtraTerms = req.query.bool.filter.some(
      (f) => !('terms' in f) && !('bool' in f)
    );
    expect(hasExtraTerms).toBe(false);
  });

  it('adds the resolved-view exclusion filter when view is resolved', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', view: 'resolved' });
    const hasResolutionExclusion = req.query.bool.filter.some(
      (f) =>
        'bool' in f &&
        'must_not' in (f as { bool: Record<string, unknown> }).bool
    );
    expect(hasResolutionExclusion).toBe(true);
  });

  it('omits the resolved-view exclusion filter when view is raw', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', view: 'raw' });
    const hasResolutionExclusion = req.query.bool.filter.some(
      (f) =>
        'bool' in f &&
        'must_not' in (f as { bool: Record<string, unknown> }).bool
    );
    expect(hasResolutionExclusion).toBe(false);
  });

  it('includes all five expected aggregation fields', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', view: 'resolved' });
    expect(req.aggs).toMatchObject({
      entity_types: { terms: { field: 'entity.EngineMetadata.Type' } },
      risk_levels: { terms: { field: 'entity.risk.calculated_level' } },
      asset_criticality: { terms: { field: 'asset.criticality' } },
      watchlists: { terms: { field: 'entity.attributes.watchlists' } },
      data_sources: { terms: { field: 'entity.source' } },
    });
  });

  it('sets missing: Unknown for risk_levels so unscored entities are counted', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', view: 'resolved' });
    expect(req.aggs.risk_levels.terms.missing).toBe(RiskSeverity.Unknown);
  });

  it('sets missing: unassigned for asset_criticality so unassigned entities are counted', () => {
    const req = buildEntityFilterCountsRequest({ spaceId: 'default', view: 'resolved' });
    expect(req.aggs.asset_criticality.terms.missing).toBe(
      CriticalityLevelsForBulkUpload.UNASSIGNED
    );
  });
});

// ─── parseEntityFilterCountsResponse ────────────────────────────────────────

describe('parseEntityFilterCountsResponse', () => {
  it('returns empty maps when aggs is undefined', () => {
    const result = parseEntityFilterCountsResponse(undefined);
    expect(result).toEqual({
      entity_types: {},
      risk_levels: {},
      asset_criticality: {},
      watchlists: {},
      data_sources: {},
    });
  });

  it('maps bucket keys and doc_counts for each agg', () => {
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
});
