/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RuleLibraryListItem } from '../types';
import { LibraryHeader } from './library_header';

const library = (overrides: Partial<RuleLibraryListItem> = {}): RuleLibraryListItem => ({
  id: 'acme',
  group: 'custom',
  title: 'Acme',
  description: '',
  icon: 'package',
  provider: 'git',
  version: '1.0.0',
  ruleCount: 10,
  syncStatus: 'synced',
  owner: '',
  license: '',
  scope: 'space',
  ...overrides,
});

const renderHeader = (
  overrides: Partial<RuleLibraryListItem> = {},
  props: { isRemoving?: boolean } = {}
) =>
  render(
    <LibraryHeader
      library={library(overrides)}
      canSync
      canRemove
      onSync={jest.fn()}
      onRemove={jest.fn()}
      {...props}
    />
  );

describe('LibraryHeader', () => {
  const bar = () => screen.queryByTestId('ruleLibraryHeaderSyncBar');

  it('has no bar when nothing is happening to the library', () => {
    renderHeader();

    expect(bar()).not.toBeInTheDocument();
  });

  it('fills a bar as the library syncs, and says how far it has got in percent', () => {
    renderHeader({ syncStatus: 'syncing', syncProgress: { done: 500, total: 2000 } });

    expect(bar()).toHaveAttribute('value', '500');
    expect(screen.getByText('Syncing · 25%')).toBeInTheDocument();
  });

  it('gives the exact count in a tooltip', async () => {
    renderHeader({ syncStatus: 'syncing', syncProgress: { done: 500, total: 2000 } });

    fireEvent.mouseOver(screen.getByText('Syncing · 25%'));

    expect(await screen.findByText('500 of 2,000 rules')).toBeInTheDocument();
  });

  it('says how many rules are synced when it does not know how many there will be', () => {
    renderHeader({ syncStatus: 'syncing', syncProgress: { done: 12500 } });

    expect(screen.getByText('Syncing · 12,500 rules synced')).toBeInTheDocument();
    expect(bar()).not.toHaveAttribute('value');
  });

  it('shows the same bar, without values, while the library is being removed', () => {
    renderHeader(
      { syncStatus: 'synced', syncProgress: { done: 500, total: 2000 } },
      { isRemoving: true }
    );

    expect(bar()).toBeInTheDocument();
    expect(bar()).not.toHaveAttribute('value');
  });

  it('says the library is being removed in its status', () => {
    renderHeader({ syncStatus: 'synced' }, { isRemoving: true });

    expect(screen.getByText('Removing')).toBeInTheDocument();
    expect(screen.queryByText('Synced')).not.toBeInTheDocument();
  });
});
