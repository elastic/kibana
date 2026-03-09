/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { getMockAttackDiscoveryAlerts } from '../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import type { AttackDetailsContext as AttackDetailsContextType } from './context';
import { PanelFooter } from './footer';
import { AttackDetailsContext } from './context';
import {
  FLYOUT_FOOTER_TEST_ID,
  FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID,
} from './constants/test_ids';

const defaultSearchHit = {
  _id: 'attack-1',
  _source: {},
};

const createMockContextValue = (
  overrides: Partial<AttackDetailsContextType> = {}
): AttackDetailsContextType =>
  ({
    attackId: 'attack-1',
    attackDiscovery: getMockAttackDiscoveryAlerts()[0],
    indexName: '.alerts-default',
    scopeId: 'default',
    searchHit: defaultSearchHit,
    getFieldsData: () => null,
    browserFields: {},
    dataFormattedForFieldBrowser: [],
    refetch: jest.fn(),
    ...overrides,
  } as AttackDetailsContextType);

const renderFooter = (contextOverrides: Partial<AttackDetailsContextType> = {}) =>
  render(
    <TestProviders>
      <AttackDetailsContext.Provider value={createMockContextValue(contextOverrides)}>
        <PanelFooter />
      </AttackDetailsContext.Provider>
    </TestProviders>
  );

describe('PanelFooter', () => {
  it('renders the footer with Take Action button when attackDiscovery is present', () => {
    renderFooter();

    expect(screen.getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take action' })).toBeInTheDocument();
  });

  it('does not render the Take Action button when attackDiscovery is null', () => {
    renderFooter({ attackDiscovery: null });

    expect(screen.getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('does not render the Take Action button when attackId is empty and attackDiscovery is null', () => {
    renderFooter({ attackId: '', attackDiscovery: null });

    expect(screen.getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
