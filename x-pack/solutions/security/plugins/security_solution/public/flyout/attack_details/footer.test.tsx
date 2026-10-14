/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import type { AttackDetailsContext as AttackDetailsContextType } from './context';
import { PanelFooter } from './footer';
import { AttackDetailsContext } from './context';
import { FLYOUT_FOOTER_TEST_ID } from './constants/test_ids';

jest.mock('../../flyout_v2/attack/main/footer', () => ({
  Footer: ({ attack }: { attack: { id: string } }) => (
    <div data-test-subj="mockV2Footer" data-attack-id={attack.id} />
  ),
}));

const defaultSearchHit = {
  _id: 'attack-1',
  _source: {},
};

const createMockContextValue = (
  overrides: Partial<AttackDetailsContextType> = {}
): AttackDetailsContextType =>
  ({
    attackId: 'attack-1',
    attack: {
      id: 'test-alert-1',
      alertIds: ['alert-1'],
      detectionEngineRuleId: 'rule-1',
      ruleStatus: 'enabled',
      ruleVersion: 1,
      timestamp: '2024-01-01T00:00:00Z',
      entities: {
        users: [],
        hosts: [],
      },
      summaryMarkdown: '# Test Alert Summary',
      mitreTactics: [],
      mitreTechniques: [],
    },
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
  it('renders the flyout footer wrapper when attack is present', () => {
    renderFooter();

    expect(screen.getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
  });

  it('renders the v2 Footer when attack is present', () => {
    renderFooter();

    expect(screen.getByTestId('mockV2Footer')).toBeInTheDocument();
  });

  it('passes the attack id to the v2 Footer', () => {
    renderFooter();

    expect(screen.getByTestId('mockV2Footer')).toHaveAttribute('data-attack-id', 'test-alert-1');
  });

  it('does not render when attack is null', () => {
    renderFooter({ attack: null });

    expect(screen.queryByTestId(FLYOUT_FOOTER_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockV2Footer')).not.toBeInTheDocument();
  });

  it('does not render when attackId is empty and attack is null', () => {
    renderFooter({ attackId: '', attack: null });

    expect(screen.queryByTestId(FLYOUT_FOOTER_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockV2Footer')).not.toBeInTheDocument();
  });
});
