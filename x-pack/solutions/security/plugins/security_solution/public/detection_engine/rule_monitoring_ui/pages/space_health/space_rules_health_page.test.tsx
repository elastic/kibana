/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  HealthIntervalGranularity,
  HealthIntervalType,
} from '../../../../../common/api/detection_engine';
import { TestProviders } from '../../../../common/mock';
import { useSpaceRulesHealth } from '../../../rule_monitoring/logic/detection_engine_health/use_space_rules_health';
import { DetectionEngineSpaceRulesHealthPage } from './space_rules_health_page';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('./space_rules_health_app_header', () => ({
  SpaceRulesHealthAppHeader: () => <div data-test-subj="mockSpaceRulesHealthAppHeader" />,
}));
jest.mock('../../../rule_monitoring/logic/detection_engine_health/use_space_rules_health', () => ({
  useSpaceRulesHealth: jest.fn(),
}));
jest.mock('../../components/health_overview', () => ({
  HealthOverviewCards: () => <div data-test-subj="healthOverviewCards" />,
  RulesByTypeBar: () => null,
  LoggedMessagesBar: () => null,
  PerformanceSection: () => null,
  GapsAndFrozenSection: () => null,
  TopMessagesSection: () => null,
  HistoricalTrendsSection: () => null,
}));
jest.mock('../../components/health_overview/execution_outcomes', () => ({
  ExecutionOutcomesChart: () => null,
}));

const useSpaceRulesHealthMock = useSpaceRulesHealth as jest.Mock;

const renderPage = () =>
  render(
    <TestProviders>
      <DetectionEngineSpaceRulesHealthPage />
    </TestProviders>
  );

// The test environment gives every EUI form row the same generated id, so the selects
// are found by their default selected option instead of by label.
const getTimeRangeSelect = () => screen.getByDisplayValue('Last 24 hours');
const getGranularitySelect = () => screen.getByDisplayValue('Hour');

describe('DetectionEngineSpaceRulesHealthPage', () => {
  beforeEach(() => {
    useSpaceRulesHealthMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      data: { health: {} },
    });
  });

  it('renders the interval controls between the app header and the dashboard', () => {
    renderPage();

    const header = screen.getByTestId('mockSpaceRulesHealthAppHeader');
    const dashboard = screen.getByTestId('healthOverviewCards');
    for (const control of [getTimeRangeSelect(), getGranularitySelect()]) {
      expect(header.compareDocumentPosition(control)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(control.compareDocumentPosition(dashboard)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    }
  });

  it('requests health for the selected time range', () => {
    renderPage();

    fireEvent.change(getTimeRangeSelect(), { target: { value: HealthIntervalType.last_hour } });

    expect(useSpaceRulesHealthMock).toHaveBeenLastCalledWith({
      interval: {
        type: HealthIntervalType.last_hour,
        granularity: HealthIntervalGranularity.minute,
      },
    });
  });

  it('requests health for the selected granularity', () => {
    renderPage();

    fireEvent.change(getGranularitySelect(), {
      target: { value: HealthIntervalGranularity.minute },
    });

    expect(useSpaceRulesHealthMock).toHaveBeenLastCalledWith({
      interval: {
        type: HealthIntervalType.last_day,
        granularity: HealthIntervalGranularity.minute,
      },
    });
  });
});
