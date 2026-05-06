/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';

import { AttackDetails } from '.';
import { TestProviders } from '../../common/mock';

jest.mock('./context', () => {
  const actual = jest.requireActual('./context');
  return {
    ...actual,
    AttackDetailsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('./hooks/use_tabs', () => ({
  useTabs: () => ({
    tabsDisplayed: [
      {
        id: 'overview',
        name: 'Overview',
        content: 'overview-content',
        'data-test-subj': 'overview-tab',
      },
      { id: 'json', name: 'JSON', content: 'json-content', 'data-test-subj': 'json-tab' },
    ],
    selectedTabId: 'overview',
    setSelectedTabId: jest.fn(),
  }),
}));

jest.mock('./components/header_title', () => ({
  HeaderTitle: ({ onShowNotes }: { onShowNotes: () => void }) => (
    <button type="button" data-test-subj="mock-header-title" onClick={onShowNotes}>
      {'header-title'}
    </button>
  ),
}));

jest.mock('./footer', () => ({
  Footer: () => <div data-test-subj="mock-footer">{'footer'}</div>,
}));

const createAttackHit = (extra: DataTableRecord['flattened'] = {}): DataTableRecord =>
  ({
    id: 'attack-1',
    raw: { _index: '.alerts-security.attack.discovery.alerts-default' },
    flattened: { 'event.kind': 'signal', ...extra },
    isAnchor: false,
  } as DataTableRecord);

describe('<AttackDetails />', () => {
  it('renders the header title, the active tab content and the footer', () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <AttackDetails hit={createAttackHit()} onShowNotes={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('mock-header-title')).toBeInTheDocument();
    expect(getByText('overview-content')).toBeInTheDocument();
    expect(getByTestId('mock-footer')).toBeInTheDocument();
  });

  it('forwards the onShowNotes callback to the header title', () => {
    const onShowNotes = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <AttackDetails hit={createAttackHit()} onShowNotes={onShowNotes} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('mock-header-title'));

    expect(onShowNotes).toHaveBeenCalledTimes(1);
  });

  it('renders the remote document callout for hits coming from a remote cluster', () => {
    const remoteHit = {
      id: 'attack-1',
      raw: { _index: 'remote-cluster:.alerts-security.attack.discovery.alerts-default' },
      flattened: {
        'event.kind': 'signal',
        _index: 'remote-cluster:.alerts-security.attack.discovery.alerts-default',
      },
      isAnchor: false,
    } as DataTableRecord;

    const { getByText } = render(
      <TestProviders>
        <AttackDetails hit={remoteHit} onShowNotes={jest.fn()} />
      </TestProviders>
    );

    expect(
      getByText('This alert originates from a remote cluster. Some features may not be available.')
    ).toBeInTheDocument();
  });
});
