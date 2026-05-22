/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';

import { ScheduleExecutionLogs } from '.';
import { TestProviders } from '../../../../../../common/mock';
import { useKibana } from '../../../../../../common/lib/kibana';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';
import { useFetchScheduleRuleType } from '../../logic/use_fetch_schedule_rule_type';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../logic/use_fetch_schedule_rule_type');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderComponent = async (schedule = mockAttackDiscoverySchedule) => {
  await act(() => {
    render(<TestProviders>{<ScheduleExecutionLogs schedule={schedule} />}</TestProviders>);
  });
};

describe('ScheduleExecutionLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        triggersActionsUi: {
          ...triggersActionsUiMock.createStart(),
          getRuleEventLogList: () => <></>,
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    (useFetchScheduleRuleType as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { id: 'test-rule-type' },
    });
  });

  it('should render title', async () => {
    await renderComponent();

    expect(screen.getByTestId('executionLogsTitle')).toBeInTheDocument();
  });

  it('should render execution event logs', async () => {
    await renderComponent();

    expect(screen.getByTestId('executionEventLogs')).toBeInTheDocument();
  });
});
