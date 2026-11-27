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

const channelRows = (name: string, ...rows: string[][]) => ({
  name,
  isEnabled: true,
  trigger: { rows: rows.map((channels) => ({ kind: 'slack', channels })) },
});

describe('findAffectedAutomations', () => {
  const automations = [
    slack('A', ['C1']),
    slack('B', ['C2', '#general']),
    slack('Both', ['C2', 'C3']),
    slack('Any channel'),
    slack('Paused', ['C1'], false),
    channelRows('Rows', ['C1'], ['C2']),
    schedule,
  ];

  it.each([
    [
      'a channel while another stays connected',
      [{ id: 'C1' }],
      [{ id: 'C2' }],
      ['A', 'Paused (disabled)'],
    ],
    [
      'the last connected channel, including unfiltered triggers',
      [{ id: 'C1' }],
      [],
      ['A', 'Any channel', 'Paused (disabled)', 'Rows'],
    ],
    ['a legacy #name', [{ id: 'C9', displayName: 'general' }], [], ['B', 'Any channel']],
    ['a channel no automation depends on', [{ id: 'C9' }], [{ id: 'C2' }], []],
    ['an automation left with no connected channel', [{ id: 'C2' }], [{ id: 'C3' }], ['B', 'Rows']],
    ['a workspace with no connected channels', [], [], []],
  ])('handles %s', (_label, removed, remaining, names) => {
    expect(findAffectedAutomations(automations, removed, remaining)).toEqual({
      count: names.length,
      names,
    });
  });

  it('lists at most 5 names but counts them all', () => {
    const many = Array.from({ length: 7 }, (_, i) => slack(`Auto ${i}`, ['C1']));
    const { count, names } = findAffectedAutomations(many, [{ id: 'C1' }], []);
    expect(count).toBe(7);
    expect(names).toHaveLength(5);
  });
});
