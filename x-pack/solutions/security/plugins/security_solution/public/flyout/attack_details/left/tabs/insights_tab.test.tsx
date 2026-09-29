/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { InsightsTab } from './insights_tab';
import { AttackDetailsProvider } from '../../context';
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';

vi.mock('../../../../common/hooks/use_space_id', () => {
      const mocked = {
      useSpaceId: () => 'default',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_attack_details', () => {
      const mocked = {
      useAttackDetails: vi.fn().mockReturnValue({
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
        getFieldsData: vi.fn(),
        refetch: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/expandable-flyout', () => {
      const mocked = {
      useExpandableFlyoutApi: () => ({
        openLeftPanel: vi.fn(),
      }),
      useExpandableFlyoutState: vi.fn(() => ({
        left: { path: { tab: 'insights', subTab: 'entity' } },
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../components/attack_entities_details', () => {
      const mocked = {
      AttackEntitiesDetails: () => (
        <div data-test-subj="attack-entities-details">{'Attack entities details'}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../components/attack_related_alerts_details', () => {
      const mocked = {
      AttackRelatedAlertsDetails: () => (
        <div data-test-subj="attack-details-flyout-left-insights-correlation-table">
          {'Correlation content'}
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

const defaultFlyoutState = { left: { path: { tab: 'insights', subTab: 'entity' } } };

const renderInsightsTab = (overrides?: { subTab?: string }) => {
  const state =
    overrides?.subTab !== undefined
      ? { left: { path: { tab: 'insights', subTab: overrides.subTab } } }
      : defaultFlyoutState;
  vi
    .mocked(useExpandableFlyoutState)
    .mockReturnValue(state as ReturnType<typeof useExpandableFlyoutState>);
  return render(
    <TestProviders>
      <AttackDetailsProvider attackId="test-id" indexName=".alerts-security.alerts-default">
        <InsightsTab />
      </AttackDetailsProvider>
    </TestProviders>
  );
};

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

  it('renders Correlation sub-tab button', () => {
    renderInsightsTab();

    expect(
      screen.getByTestId('attack-details-left-insights-correlation-button')
    ).toBeInTheDocument();
    expect(screen.getByText('Correlation')).toBeInTheDocument();
  });

  it('renders AttackRelatedAlertsDetails when correlation sub-tab is selected', () => {
    renderInsightsTab({ subTab: 'correlation' });

    expect(
      screen.getByTestId('attack-details-flyout-left-insights-correlation-table')
    ).toBeInTheDocument();
    expect(screen.getByText('Correlation content')).toBeInTheDocument();
  });
});
