/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ACTION_IDS } from './presets';
import { orderSecurityActionMenuContributions } from './order_actions';
import type { SecurityActionMenuContribution } from './types';

const contribution = (id: string): SecurityActionMenuContribution => ({ id, items: [] });

describe('orderSecurityActionMenuContributions', () => {
  it('preserves contribution order when no preset is provided', () => {
    const result = orderSecurityActionMenuContributions({
      contributions: [
        contribution(SECURITY_ACTION_IDS.tags),
        contribution(SECURITY_ACTION_IDS.addToCase),
        contribution('custom'),
      ],
    });

    expect(result.map(({ id }) => id)).toEqual([
      SECURITY_ACTION_IDS.tags,
      SECURITY_ACTION_IDS.addToCase,
      'custom',
    ]);
  });

  it('uses the preset order and appends custom actions', () => {
    const result = orderSecurityActionMenuContributions({
      preset: 'alertRow',
      contributions: [
        contribution('custom'),
        contribution(SECURITY_ACTION_IDS.tags),
        contribution(SECURITY_ACTION_IDS.addToCase),
      ],
    });

    expect(result.map(({ id }) => id)).toEqual([
      SECURITY_ACTION_IDS.addToCase,
      SECURITY_ACTION_IDS.tags,
      'custom',
    ]);
  });

  it('supports partial order overrides without dropping unspecified actions', () => {
    const result = orderSecurityActionMenuContributions({
      preset: 'alertRow',
      contributions: [
        contribution(SECURITY_ACTION_IDS.addToCase),
        contribution(SECURITY_ACTION_IDS.status),
        contribution(SECURITY_ACTION_IDS.tags),
      ],
      actionOrder: [SECURITY_ACTION_IDS.tags, SECURITY_ACTION_IDS.addToCase],
    });

    expect(result.map(({ id }) => id)).toEqual([
      SECURITY_ACTION_IDS.tags,
      SECURITY_ACTION_IDS.addToCase,
      SECURITY_ACTION_IDS.status,
    ]);
  });

  it('places custom actions relative to preset actions', () => {
    const result = orderSecurityActionMenuContributions({
      preset: 'alertRow',
      contributions: [
        contribution(SECURITY_ACTION_IDS.addToCase),
        contribution(SECURITY_ACTION_IDS.status),
        {
          ...contribution('custom'),
          placement: { before: SECURITY_ACTION_IDS.status },
        },
      ],
    });

    expect(result.map(({ id }) => id)).toEqual([
      SECURITY_ACTION_IDS.addToCase,
      'custom',
      SECURITY_ACTION_IDS.status,
    ]);
  });

  it('preserves chained placement constraints', () => {
    const result = orderSecurityActionMenuContributions({
      preset: 'alertRow',
      contributions: [
        { ...contribution('first'), placement: { after: 'second' } },
        { ...contribution('second'), placement: { after: 'third' } },
        contribution('third'),
      ],
    });

    expect(result.map(({ id }) => id)).toEqual(['third', 'second', 'first']);
  });

  it('rejects duplicate IDs and placement cycles', () => {
    expect(() =>
      orderSecurityActionMenuContributions({
        preset: 'alertRow',
        contributions: [contribution('duplicate'), contribution('duplicate')],
      })
    ).toThrow('contributed more than once');

    expect(() =>
      orderSecurityActionMenuContributions({
        preset: 'alertRow',
        contributions: [
          { ...contribution('first'), placement: { after: 'second' } },
          { ...contribution('second'), placement: { after: 'first' } },
        ],
      })
    ).toThrow('contains a cycle');
  });
});
