/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeFlagHistoryChange, flagDefinitionFromSnapshot } from './flag_history_change';
import type { FlagSnapshot } from '../../../common';

const snapshot = (overrides: Partial<FlagSnapshot> = {}): FlagSnapshot => ({
  key: 'my.flag',
  value_type: 'boolean',
  variations: [true, false],
  apps: ['kibana'],
  tags: [],
  environments: {
    production: { default: false, rules: [] },
  },
  name: 'Layout',
  description: 'Old description',
  ...overrides,
});

describe('describeFlagHistoryChange', () => {
  it('summarizes the fields and environments that changed', () => {
    const previous = snapshot();
    const next = snapshot({
      name: 'New layout',
      description: 'New description',
      apps: ['kibana', 'security'],
      variations: [true, false, true],
      updated_at: '2026-10-27T00:00:00.000Z',
      environments: {
        production: {
          default: false,
          rules: [
            {
              type: 'match',
              attribute: 'kibana.key',
              operator: 'in',
              values: ['1234'],
              return: true,
            },
          ],
        },
      },
    });

    const change = describeFlagHistoryChange({ event_type: 'change', snapshot: next }, previous);

    expect(change.type).toBe('changed');
    expect(change.fields).toEqual(['apps', 'variations', 'name', 'description']);
    expect(change.environments).toEqual(['production']);
    expect(change.before).toEqual({
      apps: ['kibana'],
      variations: [true, false],
      name: 'Layout',
      description: 'Old description',
      environments: { production: previous.environments?.production },
    });
    expect(change.after).toEqual({
      apps: ['kibana', 'security'],
      variations: [true, false, true],
      name: 'New layout',
      description: 'New description',
      environments: { production: next.environments?.production },
    });
  });

  it('ignores timestamps, key order, and empty tags', () => {
    const previous = snapshot({ tags: [], created_by: { username: 'alice' } });
    const next = snapshot({
      tags: undefined,
      updated_at: '2026-10-27T00:00:00.000Z',
      created_at: '2026-10-01T00:00:00.000Z',
      environments: {
        production: { rules: [], default: false },
      },
    });

    const change = describeFlagHistoryChange({ event_type: 'change', snapshot: next }, previous);

    expect(change.fields).toEqual([]);
    expect(change.environments).toEqual([]);
    expect(change.before).toEqual({});
    expect(change.after).toEqual({});
  });

  it('names an environment that was added or removed', () => {
    const previous = snapshot();
    const next = snapshot({
      environments: {
        staging: { default: true },
      },
    });

    const change = describeFlagHistoryChange({ event_type: 'change', snapshot: next }, previous);

    expect(change.environments).toEqual(['production', 'staging']);
    expect(change.before?.environments).toEqual({ production: previous.environments?.production });
    expect(change.after?.environments).toEqual({ staging: next.environments?.staging });
  });

  it('returns the created definition without a previous snapshot', () => {
    const created = snapshot();
    const change = describeFlagHistoryChange(
      { event_type: 'creation', snapshot: created },
      undefined
    );

    expect(change.type).toBe('created');
    expect(change.before).toBeUndefined();
    expect(change.after).toMatchObject({ name: 'Layout', apps: ['kibana'] });
    expect(change.after).not.toHaveProperty('key');
  });

  it('returns the last definition when the flag is deleted', () => {
    const change = describeFlagHistoryChange(
      { event_type: 'deletion', snapshot: snapshot() },
      snapshot({ name: 'Older' })
    );

    expect(change.type).toBe('deleted');
    expect(change.fields).toEqual([]);
    expect(change.after).toMatchObject({ name: 'Layout' });
  });

  it('keeps an update readable when the previous snapshot is missing', () => {
    const change = describeFlagHistoryChange(
      { event_type: 'change', snapshot: snapshot() },
      undefined
    );

    expect(change.type).toBe('changed');
    expect(change.fields).toEqual([]);
    expect(change.before).toBeUndefined();
    expect(change.after).toMatchObject({ name: 'Layout' });
  });
});

describe('flagDefinitionFromSnapshot', () => {
  it('keeps the editable definition and drops recorded metadata', () => {
    expect(
      flagDefinitionFromSnapshot(
        snapshot({
          created_by: { username: 'alice' },
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-27T00:00:00.000Z',
        })
      )
    ).toEqual({
      name: 'Layout',
      description: 'Old description',
      value_type: 'boolean',
      variations: [true, false],
      apps: ['kibana'],
      tags: [],
      environments: { production: { default: false, rules: [] } },
    });
  });

  it('returns undefined when the snapshot is not a complete flag', () => {
    expect(flagDefinitionFromSnapshot({ name: 'partial' })).toBeUndefined();
  });
});
