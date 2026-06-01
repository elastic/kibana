/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyWhenConditionTrueSetFields } from '../euid/commons';
import { getEuidFromObject } from '../euid/memory';
import { userEntityDefinition } from './user';

const SAFE_RELATED_USER = '_safe_related_user';

const applyPreAgg = (doc: Record<string, unknown>) => {
  const working: Record<string, unknown> = { ...doc };
  const entries = userEntityDefinition.whenConditionTrueSetFieldsPreAgg ?? [];
  applyWhenConditionTrueSetFields(working, entries);
  return working;
};

describe('userEntityDefinition related.user collection', () => {
  it('exposes a pre-agg override that copies related.user → _safe_related_user', () => {
    const entries = userEntityDefinition.whenConditionTrueSetFieldsPreAgg ?? [];
    expect(entries).toHaveLength(1);

    const [entry] = entries;
    expect(entry.fields).toEqual({
      [SAFE_RELATED_USER]: { source: 'related.user' },
    });
    expect(entry.condition).toEqual({
      and: [
        { field: 'event.kind', includes: 'asset' },
        { field: 'event.type', includes: 'user' },
      ],
    });
  });

  it('declares a collect_values field that writes the private source into related.user', () => {
    const collected = userEntityDefinition.fields.find(
      (field) => field.destination === 'related.user'
    );
    expect(collected).toBeDefined();
    expect(collected?.source).toBe(SAFE_RELATED_USER);
    expect(collected?.retention.operation).toBe('collect_values');
    expect(collected?.mapping?.type).toBe('keyword');
  });

  describe('gate behavior across pollution paths', () => {
    it('case 1: user-typed asset event populates the private field and yields an okta EUID', () => {
      const doc = {
        'event.kind': ['asset'],
        'event.category': ['iam'],
        'event.type': ['user', 'info'],
        'user.email': 'alice@acme.com',
        'event.module': 'entityanalytics_okta',
        'related.user': ['alice@acme.com', 'alice-okta-id', 'Alice Smith'],
      };

      const result = applyPreAgg(doc);
      expect(result[SAFE_RELATED_USER]).toBeDefined();

      expect(getEuidFromObject('user', doc)).toBe('user:alice@acme.com@okta');
    });

    it('case 2: group-typed asset event (Authentik-style) does not populate the private field', () => {
      const doc = {
        'event.kind': ['asset'],
        'event.category': ['iam'],
        'event.type': ['group', 'info'],
        'user.email': 'alice@acme.com',
        'event.module': 'authentik',
        'related.user': ['alice@acme.com', 'bob@acme.com', 'carol@acme.com'],
      };

      const result = applyPreAgg(doc);
      expect(result[SAFE_RELATED_USER]).toBeUndefined();
    });

    it('case 3: non-asset IAM event (same-EUID rescue branch) does not populate the private field', () => {
      const doc = {
        'event.kind': ['event'],
        'event.category': ['iam'],
        'event.type': ['user'],
        'user.email': 'alice@acme.com',
        'event.module': 'azure',
        'related.user': ['alice@acme.com', 'other-actor@acme.com'],
      };

      const result = applyPreAgg(doc);
      expect(result[SAFE_RELATED_USER]).toBeUndefined();
    });

    it('case 4: endpoint event in local namespace does not populate the private field', () => {
      const doc = {
        'event.kind': ['event'],
        'event.category': ['process'],
        'user.name': 'jdoe',
        'host.id': 'HW-UUID-ABC',
        'event.module': 'endpoint',
        'related.user': ['jdoe', 'jdoe@acme.com', 'Other Person'],
      };

      const result = applyPreAgg(doc);
      expect(result[SAFE_RELATED_USER]).toBeUndefined();

      expect(getEuidFromObject('user', doc)).toBe('user:jdoe@HW-UUID-ABC@local');
    });

    it('case 5: IAM lifecycle event passing idpGate (admin↔target) does not populate the private field', () => {
      const doc = {
        'event.kind': ['event'],
        'event.category': ['iam'],
        'event.type': ['user'],
        'user.email': 'admin@acme.com',
        'event.module': 'azure',
        'related.user': ['admin@acme.com', 'alice@acme.com', 'Alice Smith'],
      };

      const result = applyPreAgg(doc);
      expect(result[SAFE_RELATED_USER]).toBeUndefined();

      expect(getEuidFromObject('user', doc)).toBe('user:admin@acme.com@entra_id');
    });
  });
});
