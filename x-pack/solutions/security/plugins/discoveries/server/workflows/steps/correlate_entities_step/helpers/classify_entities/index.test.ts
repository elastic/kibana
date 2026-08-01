/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyEntities } from '.';
import type { EntityCandidate } from '../extract_entity_candidates';

// NOTE: a local (non-IdP) user identity requires user.name + host context
// (e.g. host.id) to pass the EUID pipeline gate, mirroring real alert docs:
const userCandidate: EntityCandidate = {
  entityType: 'user',
  euid: 'user:jdoe',
  sampleSource: { host: { id: 'host-1' }, user: { name: 'jdoe' } },
};

const hostCandidate: EntityCandidate = {
  entityType: 'host',
  euid: 'host:web-01',
  sampleSource: { host: { name: 'web-01' } },
};

describe('classifyEntities', () => {
  it('classifies candidates whose EUID is in the store as entities (EUID stored as-is)', () => {
    const { entities } = classifyEntities({
      candidates: [userCandidate, hostCandidate],
      matchedEuids: new Set(['user:jdoe']),
    });

    expect(entities).toEqual([{ id: 'user:jdoe', type: 'user' }]);
  });

  it('classifies unmatched candidates as observable entities with POC type keys', () => {
    const { observableEntities } = classifyEntities({
      candidates: [userCandidate, hostCandidate],
      matchedEuids: new Set(['user:jdoe']),
    });

    expect(observableEntities).toEqual([{ type_key: 'observable-type-hostname', value: 'web-01' }]);
  });

  it('uses observable-type-user-name for unmatched users', () => {
    const { observableEntities } = classifyEntities({
      candidates: [userCandidate],
      matchedEuids: new Set(),
    });

    expect(observableEntities).toEqual([{ type_key: 'observable-type-user-name', value: 'jdoe' }]);
  });

  it('uses observable-type-service-name for unmatched services', () => {
    const { observableEntities } = classifyEntities({
      candidates: [
        {
          entityType: 'service',
          euid: 'service:nginx',
          sampleSource: { service: { name: 'nginx' } },
        },
      ],
      matchedEuids: new Set(),
    });

    expect(observableEntities).toEqual([
      { type_key: 'observable-type-service-name', value: expect.any(String) },
    ]);
  });

  it('records display values of matched candidates in matchedIdentityValues', () => {
    const { matchedIdentityValues } = classifyEntities({
      candidates: [hostCandidate],
      matchedEuids: new Set(['host:web-01']),
    });

    expect(matchedIdentityValues.has('web-01')).toBe(true);
  });

  it('falls back to the raw EUID as value when the sample source has no identity fields', () => {
    const { observableEntities } = classifyEntities({
      candidates: [{ entityType: 'user', euid: 'user:mystery', sampleSource: {} }],
      matchedEuids: new Set(),
    });

    expect(observableEntities).toEqual([
      { type_key: 'observable-type-user-name', value: 'user:mystery' },
    ]);
  });

  it('deduplicates matched entities by EUID', () => {
    const { entities } = classifyEntities({
      candidates: [userCandidate, userCandidate],
      matchedEuids: new Set(['user:jdoe']),
    });

    expect(entities).toHaveLength(1);
  });

  it('deduplicates observable entities by type_key + value', () => {
    const { observableEntities } = classifyEntities({
      candidates: [hostCandidate, hostCandidate],
      matchedEuids: new Set(),
    });

    expect(observableEntities).toHaveLength(1);
  });

  it('returns empty results for no candidates', () => {
    expect(classifyEntities({ candidates: [], matchedEuids: new Set() })).toEqual({
      entities: [],
      matchedIdentityValues: new Set(),
      observableEntities: [],
    });
  });
});
