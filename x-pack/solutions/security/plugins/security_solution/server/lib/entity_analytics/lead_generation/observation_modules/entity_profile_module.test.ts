/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { LeadEntity } from '../types';
import { createEntityProfileModule } from './entity_profile_module';
import { PRIVILEGED_USER_WATCHLIST_ID } from './utils';

const logger = loggingSystemMock.createLogger();

interface EntityRecordOverrides {
  type?: string;
  name?: string;
  behaviors?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
  lifecycle?: Record<string, unknown>;
  criticality?: string;
}

const buildEntity = ({
  type = 'user',
  name = 'alice',
  behaviors,
  attributes,
  relationships,
  lifecycle,
  criticality,
}: EntityRecordOverrides = {}): LeadEntity => {
  const id = `${type}:${name}`;
  return {
    id,
    type,
    name,
    record: {
      entity: { id, type, name, behaviors, attributes, relationships, lifecycle },
      ...(criticality ? { asset: { criticality } } : {}),
    } as unknown as LeadEntity['record'],
  };
};

const collect = (entity: LeadEntity) => {
  const module = createEntityProfileModule({ logger });
  return module.collect([entity]);
};

describe('createEntityProfileModule', () => {
  it('is always enabled', () => {
    expect(createEntityProfileModule({ logger }).isEnabled()).toBe(true);
  });

  it('exposes the entity_profile module weight', () => {
    expect(createEntityProfileModule({ logger }).config.weight).toBe(0.5);
  });

  it('emits an unfamiliar_access observation when infrequent access exceeds the threshold', async () => {
    const entity = buildEntity({
      relationships: { accesses_infrequently: ['host:a', 'host:b', 'host:c'] },
    });

    const observations = await collect(entity);
    const unfamiliar = observations.find((o) => o.type === 'unfamiliar_access');

    expect(unfamiliar).toBeDefined();
    expect(unfamiliar?.metadata.infrequent_access_count).toBe(3);
    expect(unfamiliar?.description).toContain('3 infrequently-used entities');
  });

  it('does not emit unfamiliar_access below the threshold', async () => {
    const entity = buildEntity({ relationships: { accesses_infrequently: ['host:a'] } });

    const observations = await collect(entity);

    expect(observations.find((o) => o.type === 'unfamiliar_access')).toBeUndefined();
  });

  it('emits behavioral observations for brute force, new country, and usb device', async () => {
    const entity = buildEntity({
      behaviors: {
        brute_force_victim: true,
        new_country_login: true,
        used_usb_device: true,
      },
    });

    const observations = await collect(entity);
    const types = observations.map((o) => o.type);

    expect(types).toContain('brute_force_target');
    expect(types).toContain('new_country_login');
    expect(types).toContain('usb_device_use');
  });

  it('emits broad_communication when communication peers exceed the threshold', async () => {
    const entity = buildEntity({
      relationships: { communicates_with: Array.from({ length: 9 }, (_, i) => `host:${i}`) },
    });

    const observations = await collect(entity);
    const broad = observations.find((o) => o.type === 'broad_communication');

    expect(broad).toBeDefined();
    expect(broad?.metadata.communication_peer_count).toBe(9);
  });

  it('emits newly_observed_entity when first_seen is within the window', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const entity = buildEntity({ lifecycle: { first_seen: twoDaysAgo } });

    const observations = await collect(entity);
    const newly = observations.find((o) => o.type === 'newly_observed_entity');

    expect(newly).toBeDefined();
    expect(newly?.metadata.days_since_first_seen).toBe(2);
  });

  it('does not emit newly_observed_entity for entities first seen long ago', async () => {
    const longAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const entity = buildEntity({ lifecycle: { first_seen: longAgo } });

    const observations = await collect(entity);

    expect(observations.find((o) => o.type === 'newly_observed_entity')).toBeUndefined();
  });

  it('emits a high-severity governance_gap for privileged entities lacking MFA', async () => {
    const entity = buildEntity({
      attributes: {
        watchlists: [PRIVILEGED_USER_WATCHLIST_ID],
        mfa_enabled: false,
        managed: false,
      },
    });

    const observations = await collect(entity);
    const gap = observations.find((o) => o.type === 'governance_gap');

    expect(gap).toBeDefined();
    expect(gap?.severity).toBe('high');
    expect(gap?.description).toContain('lacks MFA');
    expect(gap?.description).toContain('is unmanaged');
  });

  it('emits a medium-severity governance_gap for high-criticality non-privileged entities', async () => {
    const entity = buildEntity({
      criticality: 'extreme_impact',
      attributes: { mfa_enabled: false },
    });

    const observations = await collect(entity);
    const gap = observations.find((o) => o.type === 'governance_gap');

    expect(gap).toBeDefined();
    expect(gap?.severity).toBe('medium');
  });

  it('does not emit governance_gap when there is no elevated context', async () => {
    const entity = buildEntity({ attributes: { mfa_enabled: false, managed: false } });

    const observations = await collect(entity);

    expect(observations.find((o) => o.type === 'governance_gap')).toBeUndefined();
  });

  it('returns no observations for an entity with an empty profile', async () => {
    const observations = await collect(buildEntity());

    expect(observations).toHaveLength(0);
  });
});
