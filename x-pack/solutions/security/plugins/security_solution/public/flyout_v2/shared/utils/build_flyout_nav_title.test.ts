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

  it('composes "<session root title> -> <child>"', () => {
    mockGetState.mockReturnValue(withSession({ title: 'Host: session-b' }));

    expect(buildFlyoutNavTitle('Graph B')).toBe('Host: session-b -> Graph B');
  });

  it('chains from the session root title, not a currently open sibling child', () => {
    mockGetState.mockReturnValue(withSession({ title: 'Host: session-c', childTitle: 'Alert' }));

    expect(buildFlyoutNavTitle('Entity: entity-c')).toBe('Host: session-c -> Entity: entity-c');
  });

  it('composes the same way across repeated opens in the same session', () => {
    mockGetState.mockReturnValue(withSession({ title: 'Host: session-d' }));

    expect(buildFlyoutNavTitle('Graph D')).toBe('Host: session-d -> Graph D');
    expect(buildFlyoutNavTitle('Graph D')).toBe('Host: session-d -> Graph D');
  });

  it('treats a root title containing the literal separator as a single label', () => {
    mockGetState.mockReturnValue(withSession({ title: 'Rule: prod -> staging' }));

    expect(buildFlyoutNavTitle('Alert E')).toBe('Rule: prod -> staging -> Alert E');
  });
});
