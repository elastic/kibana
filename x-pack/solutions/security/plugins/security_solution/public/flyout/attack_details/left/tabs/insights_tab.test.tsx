/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { InsightsTab } from './insights_tab';
import { AttackDetailsProvider } from '../../context';

jest.mock('../../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

jest.mock('../../hooks/use_attack_details', () => ({
  useAttackDetails: jest.fn().mockReturnValue({
    loading: false,
    attack: {
      id: 'test-alert-1',
      alertIds: ['alert-1'],
      detectionEngineRuleId: 'rule-1',
      ruleStatus: 'enabled',
      ruleVersion: 1,
      timestamp: '2024-01-01T00:00:00Z',
      entities: { users: [], hosts: [] },
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
}));

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openLeftPanel: jest.fn(),
  }),
  useExpandableFlyoutState: () => ({
    left: { path: { tab: 'insights', subTab: 'entity' } },
  }),
}));

jest.mock('../components/attack_entities_details', () => ({
  AttackEntitiesDetails: () => (
    <div data-test-subj="attack-entities-details">{'Attack entities details'}</div>
  ),
}));

const renderInsightsTab = () =>
  render(
    <TestProviders>
      <AttackDetailsProvider attackId="test-id" indexName=".alerts-security.alerts-default">
        <InsightsTab />
      </AttackDetailsProvider>
    </TestProviders>
  );

describe('InsightsTab', () => {
  it('renders insights button group', () => {
    renderInsightsTab();

    expect(screen.getByTestId('attack-details-left-insights-button-group')).toBeInTheDocument();
  });

  it('renders Entities sub-tab button', () => {
    renderInsightsTab();

    expect(screen.getByTestId('attack-details-left-insights-entities-button')).toBeInTheDocument();
  });

  it('renders AttackEntitiesDetails when entity sub-tab is selected', () => {
    renderInsightsTab();

    expect(screen.getByTestId('attack-entities-details')).toBeInTheDocument();
    expect(screen.getByText('Attack entities details')).toBeInTheDocument();
  });
});
