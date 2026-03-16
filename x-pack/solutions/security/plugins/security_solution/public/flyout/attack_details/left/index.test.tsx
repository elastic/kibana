/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { AttackDetailsLeftPanel } from '.';
import { AttackDetailsProvider } from '../context';

jest.mock('../../shared/components/flyout_header', () => ({
  FlyoutHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="flyout-header">{children}</div>
  ),
}));

jest.mock('../../shared/components/flyout_body', () => ({
  FlyoutBody: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="flyout-body">{children}</div>
  ),
}));

jest.mock('../hooks/use_attack_details', () => {
  return {
    useAttackDetails: jest.fn().mockReturnValue({
      loading: false,
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
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _index: 'test', _id: 'test-id' },
      getFieldsData: jest.fn(),
      refetch: jest.fn(),
    }),
  };
});

jest.mock('../hooks/use_header_data', () => ({
  useHeaderData: jest.fn().mockReturnValue({ timestamp: '2024-01-01T00:00:00Z' }),
}));

jest.mock('../hooks/use_attack_entities_lists', () => ({
  useAttackEntitiesLists: jest.fn().mockReturnValue({
    userNames: [],
    hostNames: [],
    loading: false,
    error: false,
  }),
}));

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn().mockReturnValue({
    openLeftPanel: jest.fn(),
  }),
}));

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

describe('AttackDetailsLeftPanel', () => {
  it('renders when provided with context via AttackDetailsProvider', () => {
    render(
      <TestProviders>
        <AttackDetailsProvider attackId="test-id" indexName=".alerts-security.alerts-default">
          <AttackDetailsLeftPanel />
        </AttackDetailsProvider>
      </TestProviders>
    );

    expect(screen.getByTestId('flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('flyout-body')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });
});
