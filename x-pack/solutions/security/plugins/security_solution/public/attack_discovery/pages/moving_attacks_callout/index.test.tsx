/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { TestProviders } from '../../../common/mock';
import { CALLOUT_TEST_DATA_ID, MovingAttacksCallout } from '.';
import { useMovingAttacksCallout } from './use_moving_attacks_callout';
import { mockUseMovingAttacksCallout } from './use_moving_attacks_callout.mock';

jest.mock('./use_moving_attacks_callout');

const useMovingAttacksCalloutMock = useMovingAttacksCallout as jest.Mock;

const renderCallout = () => {
  return render(
    <TestProviders>
      <MovingAttacksCallout />
    </TestProviders>
  );
};

describe('MovingAttacksCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useMovingAttacksCalloutMock.mockReturnValue(mockUseMovingAttacksCallout());
  });

  it('does not render the callout when isMovingAttacksCalloutVisible is false', () => {
    useMovingAttacksCalloutMock.mockReturnValue(
      mockUseMovingAttacksCallout({ isMovingAttacksCalloutVisible: false })
    );

    renderCallout();

    expect(screen.queryByTestId(CALLOUT_TEST_DATA_ID)).not.toBeInTheDocument();
  });

  it('renders the callout when isMovingAttacksCalloutVisible is true', () => {
    renderCallout();

    expect(screen.getByTestId(CALLOUT_TEST_DATA_ID)).toBeInTheDocument();
  });

  it('calls hideCallout when the callout is dismissed', async () => {
    const mockHideCallout = jest.fn();

    useMovingAttacksCalloutMock.mockReturnValue(
      mockUseMovingAttacksCallout({
        hideMovingAttacksCallout: mockHideCallout,
        isMovingAttacksCalloutVisible: true,
      })
    );

    renderCallout();

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    await waitFor(() => {
      expect(mockHideCallout).toHaveBeenCalled();
    });
  });
});
