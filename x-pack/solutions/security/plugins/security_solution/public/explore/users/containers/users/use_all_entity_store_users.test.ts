/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import { mapUserEntityRecordToUser } from './use_all_entity_store_users';

const sampleUser = {
  domain: ['acmecrm.com'],
  name: 'guadalupeoconnor',
  id: ['S-1-5-21-465498160-1809111990-1636550433-1002'],
  email: ['guadalupe.oconnor@acmecrm.com'],
};

const sampleRecord: Entity = {
  '@timestamp': '2026-05-04T15:21:42.692Z',
  entity: {
    id: 'user:guadalupe.oconnor@acmecrm.com@active_directory',
    name: 'guadalupeoconnor',
    namespace: 'active_directory',
    source: ['entityanalytics_ad'],
    type: 'Identity',
    confidence: 'high',
    lifecycle: {
      first_seen: '2026-05-04T14:34:25.970Z',
      last_seen: '2026-05-04T14:34:25.970Z',
    },
    risk: {
      calculated_score: 99,
      calculated_score_norm: 38.1885511495,
      calculated_level: 'Low',
    },
  },
  user: sampleUser,
  asset: {},
} as unknown as Entity;

describe('mapUserEntityRecordToUser', () => {
  it('maps a full record to a User', () => {
    expect(mapUserEntityRecordToUser(sampleRecord)).toEqual({
      name: 'guadalupeoconnor',
      lastSeen: '2026-05-04T14:34:25.970Z',
      domain: 'acmecrm.com',
      risk: 'Low',
      criticality: undefined,
      entityId: 'user:guadalupe.oconnor@acmecrm.com@active_directory',
      identityFields: {
        'user.name': 'guadalupeoconnor',
        'user.domain': 'acmecrm.com',
      },
    });
  });

  it('returns null for a non-user entity record', () => {
    const hostRecord: Entity = {
      entity: { id: 'host:some-host', name: 'some-host' },
      host: { name: 'some-host' },
    };
    expect(mapUserEntityRecordToUser(hostRecord)).toBeNull();
  });

  it('returns null when user.name is absent', () => {
    const record: Entity = {
      ...sampleRecord,
      user: { ...sampleUser, name: '' },
    };
    expect(mapUserEntityRecordToUser(record)).toBeNull();
  });

  it('handles domain returned as a string instead of an array', () => {
    const record = {
      ...sampleRecord,
      user: { ...sampleUser, domain: 'acmecrm.com' as unknown as string[] },
    };
    expect(mapUserEntityRecordToUser(record)).toMatchObject({
      domain: 'acmecrm.com',
      identityFields: { 'user.name': 'guadalupeoconnor', 'user.domain': 'acmecrm.com' },
    });
  });

  it('uses empty string for domain and omits it from identityFields when domain is absent', () => {
    const record = {
      ...sampleRecord,
      user: { name: 'guadalupeoconnor' },
    };
    expect(mapUserEntityRecordToUser(record)).toMatchObject({
      domain: '',
      identityFields: { 'user.name': 'guadalupeoconnor' },
    });
    expect(mapUserEntityRecordToUser(record)?.identityFields).not.toHaveProperty('user.domain');
  });

  it('uses empty string for lastSeen when lifecycle.last_seen is absent', () => {
    const record = {
      ...sampleRecord,
      entity: { ...sampleRecord.entity, lifecycle: undefined },
    };
    expect(mapUserEntityRecordToUser(record)).toMatchObject({ lastSeen: '' });
  });

  it('maps user.risk.calculated_level to risk', () => {
    const record = {
      ...sampleRecord,
      entity: {
        ...sampleRecord.entity,
        risk: { calculated_level: 'High', calculated_score: 75, calculated_score_norm: 75 },
      },
    };
    expect(mapUserEntityRecordToUser(record as Entity)).toMatchObject({ risk: 'High' });
  });

  it('maps asset.criticality', () => {
    const record = {
      ...sampleRecord,
      asset: { criticality: 'very_important' },
    };
    expect(mapUserEntityRecordToUser(record as Entity)).toMatchObject({
      criticality: 'very_important',
    });
  });
});
