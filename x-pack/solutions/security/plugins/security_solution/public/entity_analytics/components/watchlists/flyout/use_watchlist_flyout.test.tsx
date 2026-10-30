/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { useWatchlistFlyout } from './use_watchlist_flyout';
import type { WatchlistFlyoutProps } from './watchlist_flyout';

const mockWatchlistFlyout = jest.fn();

jest.mock('./watchlist_flyout', () => ({
  WatchlistFlyout: (props: WatchlistFlyoutProps) => {
    mockWatchlistFlyout(props);
    return <div data-test-subj="mockWatchlistFlyout" />;
  },
}));

describe('useWatchlistFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing until opened', () => {
    const { result } = renderHook(() => useWatchlistFlyout('default'));

    expect(result.current.flyout).toBeNull();
  });

  it('openCreate renders the flyout in create mode', () => {
    const { result } = renderHook(() => useWatchlistFlyout('default'));

    act(() => result.current.openCreate());
    render(<>{result.current.flyout}</>);

    expect(screen.getByTestId('mockWatchlistFlyout')).toBeInTheDocument();
    expect(mockWatchlistFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'create', watchlistId: undefined, spaceId: 'default' })
    );
  });

  it('openEdit renders the flyout in edit mode for the given watchlist', () => {
    const { result } = renderHook(() => useWatchlistFlyout('default'));

    act(() => result.current.openEdit('wl-1'));
    render(<>{result.current.flyout}</>);

    expect(mockWatchlistFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'edit', watchlistId: 'wl-1', spaceId: 'default' })
    );
  });

  it('onClose unmounts the flyout', () => {
    const { result } = renderHook(() => useWatchlistFlyout('default'));

    act(() => result.current.openCreate());
    render(<>{result.current.flyout}</>);
    const { onClose } = mockWatchlistFlyout.mock.calls[0][0] as WatchlistFlyoutProps;
    act(() => onClose());

    expect(result.current.flyout).toBeNull();
  });
});
