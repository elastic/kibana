/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RuleLibraryListItem } from '../types';
import { LibrariesList } from './libraries_list';

const library = (overrides: Partial<RuleLibraryListItem>): RuleLibraryListItem => ({
  id: 'library',
  group: 'custom',
  title: 'Library',
  description: '',
  icon: 'package',
  provider: 'git',
  ruleCount: 0,
  syncStatus: 'synced',
  owner: '',
  license: '',
  scope: 'space',
  ...overrides,
});

const renderList = (libraries: RuleLibraryListItem[]) =>
  render(
    <LibrariesList
      libraries={libraries}
      selectedId="all"
      isCollapsed={false}
      onToggleCollapsed={jest.fn()}
      onSelect={jest.fn()}
    />
  );

describe('LibrariesList', () => {
  it('splits custom libraries into a shared group and a space group', () => {
    renderList([
      library({ id: 'elastic', group: 'elastic', title: 'Elastic', scope: 'shared' }),
      library({ id: 'shared', title: 'Shared library', scope: 'shared' }),
      library({ id: 'space', title: 'Space library', scope: 'space' }),
    ]);

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map(({ textContent }) => textContent);

    expect(headings).toEqual(['Elastic', 'Custom (Shared)', 'Custom']);
  });

  it('says a library is syncing even before it has a version', () => {
    renderList([
      library({ id: 'first', title: 'First', syncStatus: 'syncing' }),
      library({ id: 'second', title: 'Second', syncStatus: 'syncing', version: '1.0.0' }),
      library({ id: 'third', title: 'Third', syncStatus: 'never_synced' }),
      library({ id: 'fourth', title: 'Fourth', version: '2.0.0' }),
    ]);

    const rowText = (id: string) => screen.getByTestId(`ruleLibraryListItem-${id}`).textContent;

    expect(rowText('first')).toContain('git · Syncing…');
    expect(rowText('second')).toContain('git · Syncing…');
    expect(rowText('third')).toContain('git · Not synced');
    expect(rowText('fourth')).toContain('git · v2.0.0');
  });

  it('leaves out the groups that have no libraries', () => {
    renderList([library({ id: 'shared', title: 'Shared library', scope: 'shared' })]);

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map(({ textContent }) => textContent);

    expect(headings).toEqual(['Custom (Shared)']);
  });
});
