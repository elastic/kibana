/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_SOURCE_FIXTURES,
  toEventSource,
} from '../../common/__fixtures__/analytics_event_sources';
import type { AnalyticsSourceFields } from '../../common/analytics';
import { inferSourceUseCase, resolveSourceRoles } from './source_field_roles';
import type { AnalyticsEventSource } from './types';

const fixture = (id: string): AnalyticsEventSource => {
  const found = EVENT_SOURCE_FIXTURES.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`No fixture named ${id}`);
  }
  return toEventSource(found);
};

const NO_FIELDS: AnalyticsSourceFields = { actors: [], measures: [], dimensions: [] };

describe('inferSourceUseCase', () => {
  it.each([
    ['ecs-clickstream', 'clickstream'],
    ['product-analytics', 'clickstream'],
    ['game-telemetry', 'gaming'],
    ['payments', 'transactions'],
    ['crypto-transactions', 'transactions'],
    ['iot-sensors', 'iot'],
    ['adtech', 'adtech'],
    ['multi-tenant', 'customerFacing'],
    ['unrecognisable', undefined],
  ])('reads %s as %s', (id, useCaseId) => {
    expect(inferSourceUseCase(fixture(id).fields)).toBe(useCaseId);
  });

  it('names no use case when the fields say too little', () => {
    expect(
      inferSourceUseCase({
        ...NO_FIELDS,
        action: { name: 'event', label: 'event' },
        actors: [{ name: 'user_id', label: 'user', kind: 'user' }],
      })
    ).toBeUndefined();
  });

  it('names no use case when two fit equally well', () => {
    expect(
      inferSourceUseCase({
        ...NO_FIELDS,
        actors: [{ name: 'player_id', label: 'player', kind: 'player' }],
        dimensions: [{ name: 'site', label: 'site', kind: 'site' }],
      })
    ).toBeUndefined();
  });
});

describe('resolveSourceRoles', () => {
  it('has no roles for a source without detected fields', () => {
    expect(resolveSourceRoles({ source: fixture('unrecognisable') })).toEqual({
      useCaseId: undefined,
      isUseCaseInferred: false,
      dimensions: [],
    });
  });

  it('infers the use case and keeps the status field apart from the breakdowns', () => {
    const roles = resolveSourceRoles({ source: fixture('payments') });

    expect(roles).toMatchObject({
      useCaseId: 'transactions',
      isUseCaseInferred: true,
      action: { name: 'type' },
      actor: { name: 'customer_id' },
      actorNoun: 'customer',
      measure: { name: 'amount' },
      status: { name: 'status' },
      currency: { name: 'currency' },
    });
    expect(roles.session).toBeUndefined();
    expect(roles.dimensions.map(({ name }) => name)).toEqual([
      'merchant_category',
      'payment_method',
      'currency',
    ]);
  });

  it('lets the selected use case win over what the fields point to', () => {
    expect(
      resolveSourceRoles({ source: fixture('payments'), selectedUseCaseId: 'iot' })
    ).toMatchObject({
      useCaseId: 'iot',
      isUseCaseInferred: false,
      measure: { name: 'risk_score' },
    });
  });

  it('breaks ties between candidate fields by use case', () => {
    const source = fixture('game-telemetry');
    const pick = (selectedUseCaseId?: 'gaming' | 'iot' | 'clickstream'): string[] => {
      const { measure, dimensions } = resolveSourceRoles({ source, selectedUseCaseId });
      return [measure?.name ?? '', dimensions[0]?.name ?? ''];
    };

    expect(pick('gaming')).toEqual(['purchase_amount_usd', 'game_mode']);
    expect(pick('iot')).toEqual(['score', 'platform']);
    expect(pick('clickstream')).toEqual(['purchase_amount_usd', 'platform']);
  });

  it('prefers the actor the use case is about', () => {
    const source: AnalyticsEventSource = {
      ...fixture('iot-sensors'),
      fields: {
        ...NO_FIELDS,
        actors: [
          { name: 'user_id', label: 'user', kind: 'user' },
          { name: 'device_id', label: 'device', kind: 'device' },
        ],
      },
    };

    expect(resolveSourceRoles({ source }).actor?.name).toBe('user_id');
    expect(resolveSourceRoles({ source, selectedUseCaseId: 'iot' }).actor?.name).toBe('device_id');
  });

  it.each([
    [undefined, 'user'],
    ['clickstream', 'user'],
    ['gaming', 'player'],
    ['transactions', 'customer'],
  ] as const)('with use case %s calls a plain user a %s', (selectedUseCaseId, actorNoun) => {
    const source: AnalyticsEventSource = {
      ...fixture('unrecognisable'),
      fields: { ...NO_FIELDS, actors: [{ name: 'user_id', label: 'user', kind: 'user' }] },
    };

    expect(resolveSourceRoles({ source, selectedUseCaseId }).actorNoun).toBe(actorNoun);
  });

  it('keeps what the field itself calls the actor', () => {
    expect(
      resolveSourceRoles({ source: fixture('iot-sensors'), selectedUseCaseId: 'gaming' }).actorNoun
    ).toBe('device');
  });
});
