/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from '../common';
import {
  ambiguousEntityKeys,
  entityEvidenceKey,
  evidenceStatus,
  sampledEvidenceStatus,
  knownUncasedCount,
} from './evidence';

const entity = (id: string, type: EntityType, name: string): IntelligenceEntity => ({
  id,
  type,
  name,
  identifierValue: name,
  riskScoreNorm: undefined,
  riskLevel: 'Unknown',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
});

describe('entity evidence identity and availability', () => {
  it('separates a user and application service with the same name', () => {
    expect(entityEvidenceKey('user', 'deploy')).not.toBe(entityEvidenceKey('service', 'deploy'));
    const entities = [
      entity('user:1', EntityType.user, 'deploy'),
      entity('service:1', EntityType.service, 'deploy'),
    ];
    expect(ambiguousEntityKeys(entities).size).toBe(0);
    expect(ambiguousEntityKeys(entities, false).has('deploy')).toBe(true);
  });

  it('rejects same-kind name joins for local accounts with distinct canonical IDs', () => {
    const entities = [
      entity('user:root@host-a', EntityType.user, 'root'),
      entity('user:root@host-b', EntityType.user, 'ROOT'),
    ];
    expect(ambiguousEntityKeys(entities).has('user:root')).toBe(true);
  });

  it('does not turn a repeated canonical identity into an ambiguity', () => {
    const root = entity('user:root@host-a', EntityType.user, 'root');
    expect(ambiguousEntityKeys([root, root]).size).toBe(0);
  });

  it('preserves failed, ambiguous, and truncated evidence states', () => {
    expect(evidenceStatus({ unavailable: true })).toBe('unavailable');
    expect(evidenceStatus({ unavailable: false, ambiguous: true })).toBe('ambiguous');
    expect(evidenceStatus({ unavailable: false, partial: true })).toBe('partial');
    expect(evidenceStatus({ unavailable: false })).toBe('available');
  });

  it('does not subtract one case from a hundred alerts', () => {
    expect(knownUncasedCount(100, 1, 'available', 'available')).toBeUndefined();
    expect(knownUncasedCount(1, 2, 'available', 'available')).toBeUndefined();
  });

  it('only counts all alerts as uncased with complete, unambiguous negative case evidence', () => {
    expect(knownUncasedCount(100, 0, 'available', 'available')).toBe(100);
    expect(knownUncasedCount(100, 0, 'available', 'partial')).toBeUndefined();
    expect(knownUncasedCount(100, 0, 'ambiguous', 'available')).toBeUndefined();
    expect(knownUncasedCount(0, 0, 'unavailable', 'available')).toBeUndefined();
    expect(knownUncasedCount(0, 0, 'available', 'unavailable')).toBe(0);
  });
  it('does not report zero anomalies for an entity outside a bounded top-results sample', () => {
    expect(sampledEvidenceStatus({ unavailable: false, isLimited: true, isPresent: false })).toBe(
      'partial'
    );
    expect(sampledEvidenceStatus({ unavailable: false, isLimited: true, isPresent: true })).toBe(
      'available'
    );
    expect(sampledEvidenceStatus({ unavailable: false, isLimited: false, isPresent: false })).toBe(
      'available'
    );
    expect(sampledEvidenceStatus({ unavailable: true, isLimited: true, isPresent: true })).toBe(
      'unavailable'
    );
  });
});
