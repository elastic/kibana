/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findAffectedAutomations } from './affected_automations';

const slack = (name: string, channels?: string[], isEnabled = true) => ({
  name,
  isEnabled,
  trigger: { rows: [{ kind: 'slack', channels }] },
});
const schedule = { name: 'Nightly', isEnabled: true, trigger: { rows: [{ kind: 'schedule' }] } };

describe('findAffectedAutomations', () => {
  const automations = [
    slack('A', ['C1']),
    slack('B', ['C2', '#general']),
    slack('Both', ['C2', 'C3']),
    slack('Any channel'),
    slack('Paused', ['C1'], false),
    schedule,
  ];

  it.each([
    ['a channel id', [{ id: 'C1' }], {}, ['A', 'Paused (disabled)']],
    ['a legacy #name', [{ id: 'C9', displayName: 'general' }], {}, ['B']],
    ['a channel nothing uses', [{ id: 'C9' }], {}, []],
    [
      'only automations left with no connected channel',
      [{ id: 'C2' }],
      { remaining: [{ id: 'C3' }] },
      ['B'],
    ],
    [
      'every connected channel, including unfiltered triggers',
      [{ id: 'C1' }, { id: 'C2' }],
      { includeUnscoped: true },
      ['A', 'B', 'Both', 'Any channel', 'Paused (disabled)'],
    ],
    ['a workspace with no connected channels', [], { includeUnscoped: true }, []],
  ])('matches %s', (_label, removed, options, names) => {
    expect(findAffectedAutomations(automations, removed, options)).toEqual({
      count: names.length,
      names,
    });
  });

  it('lists at most 5 names but counts them all', () => {
    const many = Array.from({ length: 7 }, (_, i) => slack(`Auto ${i}`, ['C1']));
    const { count, names } = findAffectedAutomations(many, [{ id: 'C1' }]);
    expect(count).toBe(7);
    expect(names).toHaveLength(5);
  });
});
