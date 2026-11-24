/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useRuleHealth } from '../../../rule_monitoring/logic/detection_engine_health/use_rule_health';
import { DetectionEngineRuleHealthPage } from './rule_health_page';

const mockUseParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));
jest.mock('../../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../../../rule_monitoring/logic/detection_engine_health/use_rule_health', () => ({
  useRuleHealth: jest.fn(),
}));
jest.mock('./rule_health_app_header', () => ({
  RuleHealthAppHeader: ({ ruleId }: { ruleId: string }) => (
    <div data-test-subj="mockRuleHealthAppHeader">{ruleId}</div>
  ),
}));

const useRuleHealthMock = useRuleHealth as jest.Mock;

const HEALTH_DATA = { health: { marker: 'rule-health-data' } };

const renderPage = () =>
  render(
    <TestProviders>
      <DetectionEngineRuleHealthPage />
    </TestProviders>
  );

describe('DetectionEngineRuleHealthPage', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ ruleId: 'rule-1' });
    useRuleHealthMock.mockReturnValue({ isLoading: false, isFetching: false, data: HEALTH_DATA });
  });

  it('renders the app header for the rule in the route above the health data', () => {
    renderPage();

    const header = screen.getByTestId('mockRuleHealthAppHeader');
    const data = screen.getByText(/rule-health-data/);
    expect(header).toHaveTextContent('rule-1');
    expect(header.compareDocumentPosition(data)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(useRuleHealthMock).toHaveBeenCalledWith({ rule_id: 'rule-1' });
  });

  it.each([
    ['loading', { isLoading: true, isFetching: false }],
    ['refetching', { isLoading: false, isFetching: true }],
  ])('keeps the app header and hides the health data while %s', (_, state) => {
    useRuleHealthMock.mockReturnValue({ ...state, data: HEALTH_DATA });

    renderPage();

    expect(screen.getByTestId('mockRuleHealthAppHeader')).toBeInTheDocument();
    expect(screen.queryByText(/rule-health-data/)).not.toBeInTheDocument();
  });
});
