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
jest.mock('./space_rules_health_app_header', () => ({ SpaceRulesHealthAppHeader: () => null }));
jest.mock('../../../rule_monitoring/logic/detection_engine_health/use_space_rules_health', () => ({
  useSpaceRulesHealth: jest.fn(),
}));

const useSpaceRulesHealthMock = useSpaceRulesHealth as jest.Mock;

describe('DetectionEngineSpaceRulesHealthPage', () => {
  beforeEach(() => {
    useSpaceRulesHealthMock.mockReturnValue({ isLoading: false, isFetching: false });
  });

  it('requests health for the interval selected in the page body', () => {
    render(
      <TestProviders>
        <DetectionEngineSpaceRulesHealthPage />
      </TestProviders>
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: HealthIntervalType.last_hour },
    });

    expect(useSpaceRulesHealthMock).toHaveBeenLastCalledWith({
      interval: {
        type: HealthIntervalType.last_hour,
        granularity: HealthIntervalGranularity.minute,
      },
    });
  });
});
