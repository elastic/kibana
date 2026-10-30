/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useWatchlistFlyout } from './use_watchlist_flyout';
import type { WatchlistFlyoutProps } from './watchlist_flyout';

const mockWatchlistFlyout = jest.fn();

// Holds local state like the real form does, so a remount is observable as a reset.
jest.mock('./watchlist_flyout', () => ({
  WatchlistFlyout: (props: WatchlistFlyoutProps) => {
    mockWatchlistFlyout(props);
    const [name, setName] = useState(props.watchlistId ?? '');
    return (
      <div data-test-subj="mockWatchlistFlyout">
        <input
          data-test-subj="mockWatchlistName"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" data-test-subj="mockWatchlistClose" onClick={props.onClose} />
      </div>
    );
  },
}));

const TestComponent = () => {
  const { openCreate, openEdit, flyout } = useWatchlistFlyout('default');
  return (
    <>
      <button type="button" data-test-subj="openCreate" onClick={openCreate} />
      <button type="button" data-test-subj="openEditA" onClick={() => openEdit('wl-a')} />
      <button type="button" data-test-subj="openEditB" onClick={() => openEdit('wl-b')} />
      {flyout}
    </>
  );
};

const typeName = (value: string) =>
  fireEvent.change(screen.getByTestId('mockWatchlistName'), { target: { value } });

describe('useWatchlistFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing until opened', () => {
    render(<TestComponent />);

    expect(screen.queryByTestId('mockWatchlistFlyout')).not.toBeInTheDocument();
  });

  it('openCreate renders the flyout in create mode', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('openCreate'));

    expect(screen.getByTestId('mockWatchlistFlyout')).toBeInTheDocument();
    expect(mockWatchlistFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'create', watchlistId: undefined, spaceId: 'default' })
    );
  });

  it('openEdit renders the flyout in edit mode for the given watchlist', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('openEditA'));

    expect(mockWatchlistFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'edit', watchlistId: 'wl-a', spaceId: 'default' })
    );
  });

  it('onClose unmounts the flyout', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('openCreate'));
    fireEvent.click(screen.getByTestId('mockWatchlistClose'));

    expect(screen.queryByTestId('mockWatchlistFlyout')).not.toBeInTheDocument();
  });

  it('discards unsaved edits when the flyout is closed and reopened', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('openCreate'));
    typeName('unsaved');
    fireEvent.click(screen.getByTestId('mockWatchlistClose'));
    fireEvent.click(screen.getByTestId('openCreate'));

    expect(screen.getByTestId('mockWatchlistName')).toHaveValue('');
  });

  it('discards unsaved edits when switching to another watchlist without closing', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('openEditA'));
    typeName('unsaved edit on A');
    fireEvent.click(screen.getByTestId('openEditB'));

    expect(screen.getByTestId('mockWatchlistName')).toHaveValue('wl-b');
  });

  it('discards unsaved edits when switching from edit to create without closing', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByTestId('openEditA'));
    typeName('unsaved edit on A');
    fireEvent.click(screen.getByTestId('openCreate'));

    expect(screen.getByTestId('mockWatchlistName')).toHaveValue('');
  });
});
