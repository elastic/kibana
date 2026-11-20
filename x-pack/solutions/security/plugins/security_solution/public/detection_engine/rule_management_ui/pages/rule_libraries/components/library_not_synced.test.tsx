/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LibraryNotSynced } from './library_not_synced';

describe('LibraryNotSynced', () => {
  const button = () => screen.getByTestId('syncNeverSyncedLibraryButton');

  it('syncs the library when the button is pressed', () => {
    const onSync = jest.fn();
    render(<LibraryNotSynced isSyncing={false} canSync onSync={onSync} />);

    fireEvent.click(button());

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('cannot be pressed while the library is being synced', () => {
    render(<LibraryNotSynced isSyncing canSync onSync={jest.fn()} />);

    expect(button()).toBeDisabled();
  });

  it('cannot be pressed without the privilege', () => {
    render(<LibraryNotSynced isSyncing={false} canSync={false} onSync={jest.fn()} />);

    expect(button()).toBeDisabled();
  });
});
