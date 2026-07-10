/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFlyoutNavTitle } from './build_flyout_nav_title';

const mockGetState = jest.fn();

jest.mock('@elastic/eui', () => ({
  getFlyoutManagerStore: () => ({ getState: mockGetState }),
}));

const withSession = (session: Record<string, unknown>) => ({ sessions: [session] });

describe('buildFlyoutNavTitle', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('returns the child title as-is when no session is active', () => {
    mockGetState.mockReturnValue({ sessions: [] });

    expect(buildFlyoutNavTitle('Child A')).toBe('Child A');
  });

  it('composes "<session title> -> <child>" for the first hop in a session', () => {
    mockGetState.mockReturnValue(withSession({ title: 'Host: session-b' }));

    expect(buildFlyoutNavTitle('Graph B')).toBe('Host: session-b -> Graph B');
  });

  it('prefers the session childTitle over the main title once a child is open', () => {
    mockGetState.mockReturnValue(withSession({ title: 'Host: session-c', childTitle: 'Graph C' }));

    expect(buildFlyoutNavTitle('Entity: entity-c')).toBe('Graph C -> Entity: entity-c');
  });

  it('stays flat across repeated hops instead of accumulating the full chain', () => {
    mockGetState.mockReturnValue(withSession({ title: 'Host: session-d' }));
    const firstHop = buildFlyoutNavTitle('Graph D');
    expect(firstHop).toBe('Host: session-d -> Graph D');

    mockGetState.mockReturnValue(withSession({ title: 'Host: session-d', childTitle: firstHop }));
    const secondHop = buildFlyoutNavTitle('Entity: entity-d1');
    expect(secondHop).toBe('Graph D -> Entity: entity-d1');

    mockGetState.mockReturnValue(withSession({ title: 'Host: session-d', childTitle: secondHop }));
    const thirdHop = buildFlyoutNavTitle('Entity: entity-d2');
    expect(thirdHop).toBe('Entity: entity-d1 -> Entity: entity-d2');
  });

  it('treats a raw title containing the literal separator as a single label, not an already-flattened chain', () => {
    mockGetState.mockReturnValue(withSession({ title: 'Rule: prod -> staging' }));

    expect(buildFlyoutNavTitle('Alert E')).toBe('Rule: prod -> staging -> Alert E');
  });

  describe('resetToRoot', () => {
    it('chains from the session title instead of a stale childTitle left by a previous sibling', () => {
      mockGetState.mockReturnValue(withSession({ title: 'Graph: session-f', childTitle: 'Alert' }));

      expect(buildFlyoutNavTitle('Host: my-host', { resetToRoot: true })).toBe(
        'Graph: session-f -> Host: my-host'
      );
    });

    it('still flattens a subsequent normal hop chained off a resetToRoot composition', () => {
      mockGetState.mockReturnValue(withSession({ title: 'Graph: session-g', childTitle: 'Alert' }));
      const anchoredHop = buildFlyoutNavTitle('Host: my-host', { resetToRoot: true });
      expect(anchoredHop).toBe('Graph: session-g -> Host: my-host');

      mockGetState.mockReturnValue(
        withSession({ title: 'Graph: session-g', childTitle: anchoredHop })
      );
      const drillDownHop = buildFlyoutNavTitle('Rule: My Rule');
      expect(drillDownHop).toBe('Host: my-host -> Rule: My Rule');
    });

    it('falls back to the child title as-is when no session is active', () => {
      mockGetState.mockReturnValue({ sessions: [] });

      expect(buildFlyoutNavTitle('Host: my-host', { resetToRoot: true })).toBe('Host: my-host');
    });
  });
});
