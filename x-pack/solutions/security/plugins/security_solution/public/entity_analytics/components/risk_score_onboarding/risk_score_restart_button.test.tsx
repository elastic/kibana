/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import React from 'react';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { TestProviders } from '../../../common/mock';
import { RiskScoreRestartButton } from './risk_score_restart_button';

import { restartRiskScoreTransforms } from './utils';

jest.mock('./utils');

const mockRestartRiskScoreTransforms = restartRiskScoreTransforms as jest.Mock;

const mockUseState = React.useState;
jest.mock('../../../common/hooks/use_fetch', () => ({
  ...jest.requireActual('../../../common/hooks/use_fetch'),
  useFetch: jest.fn().mockImplementation(() => {
    const [isLoading, setIsLoading] = mockUseState(false);
    return {
      fetch: jest.fn().mockImplementation((param) => {
        setIsLoading(true);
        mockRestartRiskScoreTransforms(param);
      }),
      isLoading,
    };
  }),
}));

describe('RiskScoreRestartButton', () => {
  let user: UserEvent;
  const mockRefetch = jest.fn();
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  describe.each([[RiskScoreEntity.host], [RiskScoreEntity.user]])('%s', (riskScoreEntity) => {
    it('Renders expected children', () => {
      render(
        <TestProviders>
          <RiskScoreRestartButton refetch={mockRefetch} riskScoreEntity={riskScoreEntity} />
        </TestProviders>
      );

      expect(screen.getByTestId(`restart_${riskScoreEntity}_risk_score`)).toHaveTextContent(
        'Restart'
      );
    });

    it('calls restartRiskScoreTransforms with correct entity', async () => {
      render(
        <TestProviders>
          <RiskScoreRestartButton refetch={mockRefetch} riskScoreEntity={riskScoreEntity} />
        </TestProviders>
      );

      await user.click(screen.getByTestId(`restart_${riskScoreEntity}_risk_score`));

      await waitFor(() => {
        expect(mockRestartRiskScoreTransforms).toHaveBeenCalled();
        expect(mockRestartRiskScoreTransforms.mock.calls[0][0].riskScoreEntity).toEqual(
          riskScoreEntity
        );
      });
    });

    it('Update button state while installing', async () => {
      render(
        <TestProviders>
          <RiskScoreRestartButton refetch={mockRefetch} riskScoreEntity={riskScoreEntity} />
        </TestProviders>
      );

      await user.click(screen.getByTestId(`restart_${riskScoreEntity}_risk_score`));

      await waitFor(() => {
        expect(screen.getByTestId(`restart_${riskScoreEntity}_risk_score`)).toHaveProperty(
          'disabled',
          true
        );
      });
    });
  });
});
