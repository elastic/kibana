/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseAllRelayAppBindings } from '../../../data/relay_apps/use_relay_app_bindings';
import {
  findUnconnectedChannels,
  getUnconnectedSlackChannels,
  getUnconnectedSlackChannelsMessage,
} from './unconnected_slack_channels';

const connected: UseAllRelayAppBindings = {
  bindings: [
    { channel: 'C1', displayName: 'alerts', status: 'bound_to_self' },
    { channel: 'C2', displayName: 'oncall', status: 'bound_to_self' },
  ],
  isLoading: false,
  isError: false,
  isComplete: true,
};

describe('findUnconnectedChannels', () => {
  it('returns the values that are not connected channels', () => {
    expect(findUnconnectedChannels(['C1', 'C3', 'C4'], connected)).toEqual(['C3', 'C4']);
  });

  it('treats every value as unconnected when the full list is empty', () => {
    expect(findUnconnectedChannels(['C1'], { ...connected, bindings: [] })).toEqual(['C1']);
  });

  it('treats a legacy #name as connected when it matches a connected channel name', () => {
    expect(findUnconnectedChannels(['#alerts', '#gone'], connected)).toEqual(['#gone']);
  });

  it.each([
    ['loading', { isLoading: true }],
    ['failed', { isError: true }],
    ['truncated', { isComplete: false }],
  ])('returns nothing while the connected list is %s', (_state, state) => {
    expect(findUnconnectedChannels(['C3'], { ...connected, ...state })).toEqual([]);
  });
});

describe('getUnconnectedSlackChannels', () => {
  it('collects unconnected channels from Slack rows only, without duplicates', () => {
    expect(
      getUnconnectedSlackChannels(
        [
          { kind: 'slack', channels: ['C1', 'C3'] },
          { kind: 'slack', channels: ['C3'] },
          { kind: 'alert' },
          { kind: 'schedule' },
        ],
        connected
      )
    ).toEqual(['C3']);
  });

  it('ignores a Slack row without a channel filter', () => {
    expect(getUnconnectedSlackChannels([{ kind: 'slack' }], connected)).toEqual([]);
  });

  it('flags every stored channel after the only binding is deleted', () => {
    expect(
      getUnconnectedSlackChannels([{ kind: 'slack', channels: ['C1'] }], {
        ...connected,
        bindings: [],
      })
    ).toEqual(['C1']);
  });
});

describe('getUnconnectedSlackChannelsMessage', () => {
  it('names the channels', () => {
    expect(getUnconnectedSlackChannelsMessage(['C1', '#x'])).toBe(
      'Slack channel not connected: C1, #x. Messages there will not start this automation.'
    );
  });
});
