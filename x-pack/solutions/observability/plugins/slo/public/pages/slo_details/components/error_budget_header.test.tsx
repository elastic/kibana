/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { useKibana } from '../../../hooks/use_kibana';
import { render } from '../../../utils/test_helper';
import { buildSlo } from '../../../data/slo/slo';
import { ErrorBudgetHeader } from './error_budget_header';

jest.mock('../../../hooks/use_kibana');
const useKibanaMock = useKibana as jest.Mock;

describe('In Observability Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        executionContext: {
          get: () => ({
            name: 'observability-overview',
          }),
        },
      },
    });
  });
  it('renders Error Budget Actions button on mouse over', async () => {
    const slo = buildSlo();

    render(<ErrorBudgetHeader isMouseOver={true} slo={slo} />);
    expect(screen.queryByTestId('o11yErrorBudgetActionsButton')).toBeTruthy();
  });

  it('renders "Error budget burn down" title', () => {
    const slo = buildSlo();
    render(<ErrorBudgetHeader isMouseOver={true} slo={slo} />);
    expect(screen.queryByTestId('errorBudgetPanelTitle')).toBeTruthy();
  });
});

describe('In Dashboard Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        executionContext: {
          get: () => ({
            name: 'dashboards',
          }),
        },
      },
    });
  });
  it('does not render Error budget Actions button on mouse over', async () => {
    const slo = buildSlo();
    render(<ErrorBudgetHeader isMouseOver={true} slo={slo} />);
    expect(screen.queryByTestId('o11yErrorBudgetActionsButton')).toBeFalsy();
  });

  it('does not render the "Error budget burn down" title', () => {
    const slo = buildSlo();
    render(<ErrorBudgetHeader showTitle={false} isMouseOver={true} slo={slo} />);
    expect(screen.queryByTestId('errorBudgetPanelTitle')).toBeFalsy();
  });
});
