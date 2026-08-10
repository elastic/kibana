/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderSecurityActionMenuContributions } from './order_actions';
import type { SecurityActionMenuContribution, SecurityActionMenuPreset } from './types';

const contribution = (id: string): SecurityActionMenuContribution => ({ id, items: [] });
const ACTION_IDS = {
  addToCase: 'addToCase',
  status: 'status',
  tags: 'tags',
} as const;
const PRESET: SecurityActionMenuPreset<
  (typeof ACTION_IDS)[keyof typeof ACTION_IDS],
  'cases' | 'workflow' | 'collaboration'
> = {
  groups: [
    { id: 'cases', actionIds: [ACTION_IDS.addToCase] },
    { id: 'workflow', actionIds: [ACTION_IDS.status] },
    { id: 'collaboration', actionIds: [ACTION_IDS.tags] },
  ],
};

describe('orderSecurityActionMenuContributions', () => {
  it('preserves contribution order when no preset is provided', () => {
    const result = orderSecurityActionMenuContributions({
      contributions: [
        contribution(ACTION_IDS.tags),
        contribution(ACTION_IDS.addToCase),
        contribution('custom'),
      ],
    });

    expect(result.map(({ id }) => id)).toEqual([ACTION_IDS.tags, ACTION_IDS.addToCase, 'custom']);
  });

  it('uses the preset order and appends custom actions', () => {
    const result = orderSecurityActionMenuContributions({
      preset: PRESET,
      contributions: [
        contribution('custom'),
        contribution(ACTION_IDS.tags),
        contribution(ACTION_IDS.addToCase),
      ],
    });

    expect(result.map(({ id }) => id)).toEqual([ACTION_IDS.addToCase, ACTION_IDS.tags, 'custom']);
  });

  it('supports partial order overrides without dropping unspecified actions', () => {
    const result = orderSecurityActionMenuContributions({
      preset: PRESET,
      contributions: [
        contribution(ACTION_IDS.addToCase),
        contribution(ACTION_IDS.status),
        contribution(ACTION_IDS.tags),
      ],
      actionOrder: [ACTION_IDS.tags, ACTION_IDS.addToCase],
    });

    expect(result.map(({ id }) => id)).toEqual([
      ACTION_IDS.tags,
      ACTION_IDS.addToCase,
      ACTION_IDS.status,
    ]);
  });

  it('places custom actions relative to preset actions', () => {
    const result = orderSecurityActionMenuContributions({
      preset: PRESET,
      contributions: [
        contribution(ACTION_IDS.addToCase),
        contribution(ACTION_IDS.status),
        {
          ...contribution('custom'),
          placement: { before: ACTION_IDS.status },
        },
      ],
    });

    expect(result.map(({ id }) => id)).toEqual([ACTION_IDS.addToCase, 'custom', ACTION_IDS.status]);
  });

  it('preserves chained placement constraints', () => {
    const result = orderSecurityActionMenuContributions({
      preset: PRESET,
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
        preset: PRESET,
        contributions: [contribution('duplicate'), contribution('duplicate')],
      })
    ).toThrow('contributed more than once');

    expect(() =>
      orderSecurityActionMenuContributions({
        preset: PRESET,
        contributions: [
          { ...contribution('first'), placement: { after: 'second' } },
          { ...contribution('second'), placement: { after: 'first' } },
        ],
      })
    ).toThrow('contains a cycle');
  });
});
