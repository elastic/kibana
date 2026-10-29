/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import type { Feature } from '@kbn/significant-events-schema';
import { matchesKnowledgeIndicatorFilters } from './matches_knowledge_indicator_filters';

const makeFeatureKI = (overrides: Partial<Feature> = {}): KnowledgeIndicator =>
  ({
    kind: 'feature',
    feature: { id: 'f1', source_id: 's1', type: 'entity', title: 'CPU Usage', ...overrides },
  } as unknown as KnowledgeIndicator);

const makeQueryKI = (title: string): KnowledgeIndicator =>
  ({
    kind: 'query',
    query: { id: 'q1', title, type: 'match' },
    rule: { backed: false, id: 'q1' },
    source_id: 's2',
  } as unknown as KnowledgeIndicator);

describe('matchesKnowledgeIndicatorFilters', () => {
  it('excludes excluded features from the active status and keeps the rest', () => {
    const criteria = { statusFilter: 'active' } as const;

    expect(matchesKnowledgeIndicatorFilters(makeFeatureKI({ excluded: true }), criteria)).toBe(
      false
    );
    expect(matchesKnowledgeIndicatorFilters(makeFeatureKI(), criteria)).toBe(true);
    expect(matchesKnowledgeIndicatorFilters(makeQueryKI('Slow requests'), criteria)).toBe(true);
  });

  it('keeps only excluded features for the excluded status', () => {
    const criteria = { statusFilter: 'excluded' } as const;

    expect(matchesKnowledgeIndicatorFilters(makeFeatureKI({ excluded: true }), criteria)).toBe(
      true
    );
    expect(matchesKnowledgeIndicatorFilters(makeFeatureKI(), criteria)).toBe(false);
  });

  it('matches the search term against the lowercased feature or query title', () => {
    expect(matchesKnowledgeIndicatorFilters(makeFeatureKI(), { searchTerm: 'cpu' })).toBe(true);
    expect(matchesKnowledgeIndicatorFilters(makeFeatureKI(), { searchTerm: 'memory' })).toBe(false);
    expect(
      matchesKnowledgeIndicatorFilters(makeQueryKI('Slow Requests'), { searchTerm: 'slow' })
    ).toBe(true);
  });

  it('hides computed feature types only when asked', () => {
    const computed = makeFeatureKI({ type: 'dataset_analysis' });

    expect(matchesKnowledgeIndicatorFilters(computed, { hideComputedTypes: true })).toBe(false);
    expect(matchesKnowledgeIndicatorFilters(computed, { hideComputedTypes: false })).toBe(true);
    expect(matchesKnowledgeIndicatorFilters(makeFeatureKI(), { hideComputedTypes: true })).toBe(
      true
    );
  });

  it('narrows by selected streams, types and subtypes', () => {
    const ki = makeFeatureKI({ subtype: 'service' });

    expect(matchesKnowledgeIndicatorFilters(ki, { selectedStreams: ['s1'] })).toBe(true);
    expect(matchesKnowledgeIndicatorFilters(ki, { selectedStreams: ['s2'] })).toBe(false);
    expect(matchesKnowledgeIndicatorFilters(ki, { selectedTypes: ['entity'] })).toBe(true);
    expect(matchesKnowledgeIndicatorFilters(ki, { selectedTypes: ['technology'] })).toBe(false);
    expect(matchesKnowledgeIndicatorFilters(ki, { selectedSubtypes: ['service'] })).toBe(true);
    expect(matchesKnowledgeIndicatorFilters(ki, { selectedSubtypes: ['database'] })).toBe(false);
    expect(
      matchesKnowledgeIndicatorFilters(makeFeatureKI(), { selectedSubtypes: ['service'] })
    ).toBe(false);
  });
});
