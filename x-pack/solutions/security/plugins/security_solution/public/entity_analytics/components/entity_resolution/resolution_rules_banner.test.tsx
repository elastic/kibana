/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { useResolutionRulesHealth } from './hooks/use_resolution_rules_health';
import { ResolutionRulesBanner } from './resolution_rules_banner';
import {
  RESOLUTION_RULES_BANNER_BUTTON_TEST_ID,
  RESOLUTION_RULES_BANNER_TEST_ID,
} from './test_ids';

jest.mock('./hooks/use_resolution_rules_health');
jest.mock('../../../common/lib/kibana/kibana_react', () => ({ useKibana: jest.fn() }));

const mockNavigateToApp = jest.fn();
const health = (overrides: Record<string, unknown>) => ({
  data: {
    failing: 0,
    failed_runs_24h: 0,
    dashboard_id: 'dash-default',
    dashboard_installed: true,
    rules: [],
    ...overrides,
  },
});

const renderBanner = () =>
  render(
    <TestProviders>
      <ResolutionRulesBanner />
    </TestProviders>
  );

describe('ResolutionRulesBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { application: { navigateToApp: mockNavigateToApp } },
    });
  });

  it('is hidden when no rule is failing and none failed in the past 24 hours', () => {
    (useResolutionRulesHealth as jest.Mock).mockReturnValue(health({}));
    expect(renderBanner().queryByTestId(RESOLUTION_RULES_BANNER_TEST_ID)).toBeNull();
  });

  it('is hidden while the health is loading', () => {
    (useResolutionRulesHealth as jest.Mock).mockReturnValue({ data: undefined });
    expect(renderBanner().queryByTestId(RESOLUTION_RULES_BANNER_TEST_ID)).toBeNull();
  });

  it('shows how many rules are failing now', () => {
    (useResolutionRulesHealth as jest.Mock).mockReturnValue(health({ failing: 2 }));
    expect(renderBanner().getByTestId(RESOLUTION_RULES_BANNER_TEST_ID)).toHaveTextContent(
      '2 resolution rules are failing'
    );
  });

  it('shows when a rule failed in the past 24 hours but is fine now', () => {
    (useResolutionRulesHealth as jest.Mock).mockReturnValue(health({ failed_runs_24h: 3 }));
    expect(renderBanner().getByTestId(RESOLUTION_RULES_BANNER_TEST_ID)).toHaveTextContent(
      'failed in the past 24 hours'
    );
  });

  it('still shows for a failing rule when the run stream cannot be read', () => {
    (useResolutionRulesHealth as jest.Mock).mockReturnValue(
      health({ failing: 1, failed_runs_24h: null })
    );
    expect(renderBanner().getByTestId(RESOLUTION_RULES_BANNER_TEST_ID)).toBeInTheDocument();
  });

  it('stays hidden when nothing is failing and the run stream cannot be read', () => {
    (useResolutionRulesHealth as jest.Mock).mockReturnValue(health({ failed_runs_24h: null }));
    expect(renderBanner().queryByTestId(RESOLUTION_RULES_BANNER_TEST_ID)).toBeNull();
  });

  it('opens the monitoring dashboard from the button', () => {
    (useResolutionRulesHealth as jest.Mock).mockReturnValue(health({ failing: 1 }));
    fireEvent.click(renderBanner().getByTestId(RESOLUTION_RULES_BANNER_BUTTON_TEST_ID));
    expect(mockNavigateToApp).toHaveBeenCalledWith('dashboards', { path: '#/view/dash-default' });
  });

  it('hides the dashboard button when the dashboard is not installed, but still warns', () => {
    (useResolutionRulesHealth as jest.Mock).mockReturnValue(
      health({ failing: 1, dashboard_installed: false })
    );
    const { getByTestId, queryByTestId } = renderBanner();

    expect(getByTestId(RESOLUTION_RULES_BANNER_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(RESOLUTION_RULES_BANNER_BUTTON_TEST_ID)).toBeNull();
  });
});
