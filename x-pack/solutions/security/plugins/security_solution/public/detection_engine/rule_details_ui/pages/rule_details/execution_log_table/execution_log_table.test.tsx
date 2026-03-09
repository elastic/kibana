/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { noop } from 'lodash/fp';
import { fireEvent, render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { TestProviders } from '../../../../../common/mock';
import { useRuleDetailsContextMock } from '../__mocks__/rule_details_context';
import { getRuleExecutionResultsResponseMock } from '../../../../../../common/api/detection_engine/rule_monitoring/mocks';
import { useExecutionResults } from '../../../../rule_monitoring';
import { useRuleDetailsContext } from '../rule_details_context';
import { ExecutionLogTable } from './execution_log_table';
import { useKibana } from '../../../../../common/lib/kibana';
import { useKibana as mockUseKibana } from '../../../../../common/lib/kibana/__mocks__';

jest.mock('../../../../rule_monitoring/components/execution_results_table/use_execution_results');
jest.mock('../rule_details_context');
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/hooks/use_experimental_features', () => {
  return {
    useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
  };
});

const mockTelemetry = {
  reportEvent: jest.fn(),
};

const mockedUseKibana = {
  ...mockUseKibana(),
  services: {
    ...mockUseKibana().services,
    telemetry: mockTelemetry,
  },
};

const coreStart = coreMock.createStart();

const mockUseRuleExecutionEvents = useExecutionResults as jest.Mock;
mockUseRuleExecutionEvents.mockReturnValue({
  data: getRuleExecutionResultsResponseMock.getSomeResponse(),
  isLoading: false,
  isFetching: false,
});

describe('ExecutionLogTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(mockedUseKibana);
  });

  test('Shows total events returned', () => {
    const ruleDetailsContext = useRuleDetailsContextMock.create();
    (useRuleDetailsContext as jest.Mock).mockReturnValue(ruleDetailsContext);
    render(<ExecutionLogTable ruleId={'0'} selectAlertsTab={noop} {...coreStart} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByTestId('executionsShowing')).toHaveTextContent('Showing 7 rule executions');
  });

  test('should call telemetry when the "Show Source Event Time Range" switch is toggled', async () => {
    const ruleDetailsContext = useRuleDetailsContextMock.create();
    (useRuleDetailsContext as jest.Mock).mockReturnValue(ruleDetailsContext);

    const { getByText } = render(
      <ExecutionLogTable ruleId={'0'} selectAlertsTab={noop} {...coreStart} />,
      {
        wrapper: TestProviders,
      }
    );

    const switchButton = getByText('Show source event time range');

    fireEvent.click(switchButton);

    expect(mockTelemetry.reportEvent).toHaveBeenCalled();
  });
});
