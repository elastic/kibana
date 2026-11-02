/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRelatedEntity, formatOmittedRelatedEntityCounts } from './format_related_entity';
import type { RelatedEntity } from './types';

describe('formatRelatedEntity', () => {
  it('renders kind, type, name, criticality, risk, and interaction count', () => {
    const related: RelatedEntity = {
      id: 'host:web-01',
      type: 'host',
      name: 'web-01',
      kinds: ['administers'],
      criticality: 'extreme_impact',
      riskLevel: 'High',
    };

    expect(formatRelatedEntity(related)).toBe(
      'administers host "web-01" (criticality: extreme_impact, risk: High)'
    );
  });

  it('renders interactedWithAtLeast as a lower-bound phrase', () => {
    const related: RelatedEntity = {
      id: 'host:build-3',
      type: 'host',
      name: 'build-3',
      kinds: ['accesses_infrequently'],
      interactedWithAtLeast: 4,
    };

    expect(formatRelatedEntity(related)).toContain('interacted with: at least 4 entities');
  });

  it('omits interactedWithAtLeast when the count is not greater than 1', () => {
    const related: RelatedEntity = {
      id: 'host:solo',
      type: 'host',
      name: 'solo',
      kinds: ['accesses_frequently'],
      interactedWithAtLeast: 1,
    };

    expect(formatRelatedEntity(related)).toBe('accesses_frequently host "solo"');
  });

  it('joins multiple kinds for the same entity', () => {
    const related: RelatedEntity = {
      id: 'host:shared',
      type: 'host',
      name: 'shared',
      kinds: ['administers', 'communicates_with'],
    };

    expect(formatRelatedEntity(related)).toBe('administers, communicates_with host "shared"');
  });

  it('omits the parenthetical when there is no criticality, risk, or interaction count', () => {
    const related: RelatedEntity = { id: 'host:bare', type: 'host', name: 'bare', kinds: ['owns'] };

    expect(formatRelatedEntity(related)).toBe('owns host "bare"');
  });
});

describe('formatOmittedRelatedEntityCounts', () => {
  it('returns an empty string when nothing was omitted', () => {
    const topRelatedEntities: RelatedEntity[] = [
      { id: 'host:a', type: 'host', name: 'a', kinds: ['owns'] },
    ];

    expect(formatOmittedRelatedEntityCounts(topRelatedEntities, { owns: 1 })).toBe('');
  });

  it('returns an empty string when relatedEntityCounts is empty', () => {
    expect(formatOmittedRelatedEntityCounts([], {})).toBe('');
  });

  it('reports how many were omitted for a kind that was capped', () => {
    const topRelatedEntities: RelatedEntity[] = Array.from({ length: 5 }, (_, i) => ({
      id: `host:${i}`,
      type: 'host',
      name: `host-${i}`,
      kinds: ['accesses_frequently'],
    }));

    expect(formatOmittedRelatedEntityCounts(topRelatedEntities, { accesses_frequently: 22 })).toBe(
      '17 more accesses_frequently relationships'
    );
  });

  it('reports multiple kinds, only including those actually truncated', () => {
    const topRelatedEntities: RelatedEntity[] = [
      { id: 'host:owned', type: 'host', name: 'owned', kinds: ['owns'] },
      { id: 'host:a', type: 'host', name: 'a', kinds: ['communicates_with'] },
    ];

    expect(
      formatOmittedRelatedEntityCounts(topRelatedEntities, {
        owns: 1,
        communicates_with: 8,
      })
    ).toBe('7 more communicates_with relationships');
  });

  it('joins multiple truncated kinds with a comma', () => {
    const topRelatedEntities: RelatedEntity[] = [
      { id: 'host:a', type: 'host', name: 'a', kinds: ['accesses_frequently'] },
      { id: 'host:b', type: 'host', name: 'b', kinds: ['communicates_with'] },
    ];

    expect(
      formatOmittedRelatedEntityCounts(topRelatedEntities, {
        accesses_frequently: 18,
        communicates_with: 4,
      })
    ).toBe('17 more accesses_frequently relationships, 3 more communicates_with relationships');
  });

  it('counts a mixed-kind entity toward every kind it was shown under', () => {
    const topRelatedEntities: RelatedEntity[] = [
      { id: 'host:shared', type: 'host', name: 'shared', kinds: ['administers', 'owns'] },
    ];

    expect(formatOmittedRelatedEntityCounts(topRelatedEntities, { administers: 1, owns: 1 })).toBe(
      ''
    );
  });
});
