/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeParallelMerge, perSourceResolvedToField } from './parallel_resolution';

describe('perSourceResolvedToField', () => {
  // Regression lockdown for the per-source slot paths. The automated_resolution
  // and embedding_resolution maintainers both compute their "already resolved"
  // filter field via this helper; pinning the exact strings here prevents an
  // accidental rename from silently breaking pagination on existing indices.
  it('returns the by_rule path', () => {
    expect(perSourceResolvedToField('rule')).toBe(
      'entity.relationships.resolution.by_rule.resolved_to'
    );
  });

  it('returns the by_embedding path', () => {
    expect(perSourceResolvedToField('embedding')).toBe(
      'entity.relationships.resolution.by_embedding.resolved_to'
    );
  });

  it('returns the by_manual path', () => {
    expect(perSourceResolvedToField('manual')).toBe(
      'entity.relationships.resolution.by_manual.resolved_to'
    );
  });
});

describe('computeParallelMerge', () => {
  it('returns null effectiveTo and not divergent when no source has an opinion', () => {
    expect(computeParallelMerge({})).toEqual({
      effectiveTo: null,
      divergent: false,
      effectiveSource: null,
    });
  });

  it('treats explicit null verdicts as absent', () => {
    expect(
      computeParallelMerge({
        rule: { resolvedTo: null },
        embedding: null,
        manual: { resolvedTo: null },
      })
    ).toEqual({ effectiveTo: null, divergent: false, effectiveSource: null });
  });

  it('rule alone wins when only rule has an opinion', () => {
    expect(computeParallelMerge({ rule: { resolvedTo: 'er-target' } })).toEqual({
      effectiveTo: 'er-target',
      divergent: false,
      effectiveSource: 'rule',
    });
  });

  it('embedding alone wins when only embedding has an opinion', () => {
    expect(
      computeParallelMerge({
        embedding: { resolvedTo: 'er-target', score: 0.91, modelId: '.jina-v5' },
      })
    ).toEqual({
      effectiveTo: 'er-target',
      divergent: false,
      effectiveSource: 'embedding',
    });
  });

  it('agreement between rule and embedding is not divergent and rule attribution wins', () => {
    expect(
      computeParallelMerge({
        rule: { resolvedTo: 'er-target' },
        embedding: { resolvedTo: 'er-target', score: 0.91 },
      })
    ).toEqual({ effectiveTo: 'er-target', divergent: false, effectiveSource: 'rule' });
  });

  it('disagreement: rule wins effectiveTo and divergent flips true', () => {
    expect(
      computeParallelMerge({
        rule: { resolvedTo: 'er-rule-target' },
        embedding: { resolvedTo: 'er-embedding-target', score: 0.91 },
      })
    ).toEqual({
      effectiveTo: 'er-rule-target',
      divergent: true,
      effectiveSource: 'rule',
    });
  });

  it('manual link always wins over automated sources', () => {
    expect(
      computeParallelMerge({
        manual: { resolvedTo: 'er-manual-target' },
        rule: { resolvedTo: 'er-rule-target' },
        embedding: { resolvedTo: 'er-embedding-target', score: 0.91 },
      })
    ).toEqual({
      effectiveTo: 'er-manual-target',
      divergent: true,
      effectiveSource: 'manual',
    });
  });

  it('manual link with agreeing automated sources is not divergent', () => {
    expect(
      computeParallelMerge({
        manual: { resolvedTo: 'er-target' },
        rule: { resolvedTo: 'er-target' },
        embedding: { resolvedTo: 'er-target', score: 0.97 },
      })
    ).toEqual({
      effectiveTo: 'er-target',
      divergent: false,
      effectiveSource: 'manual',
    });
  });

  it('manual link with one disagreeing automated source still flags divergent', () => {
    expect(
      computeParallelMerge({
        manual: { resolvedTo: 'er-manual-target' },
        rule: { resolvedTo: 'er-manual-target' },
        embedding: { resolvedTo: 'er-other-target', score: 0.92 },
      })
    ).toEqual({
      effectiveTo: 'er-manual-target',
      divergent: true,
      effectiveSource: 'manual',
    });
  });

  it('falls back to the only present source when rule has no verdict but embedding does', () => {
    expect(
      computeParallelMerge({
        rule: { resolvedTo: null },
        embedding: { resolvedTo: 'er-target', score: 0.93 },
      })
    ).toEqual({
      effectiveTo: 'er-target',
      divergent: false,
      effectiveSource: 'embedding',
    });
  });
});
