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
import { useKibana } from '../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../common/lib/telemetry';
import { CALLOUT_TEST_DATA_ID, HIDE_BUTTON_TEST_DATA_ID, MovingAttacksCallout } from '.';
import { useMovingAttacksCallout } from './use_moving_attacks_callout';
import { mockUseMovingAttacksCallout } from './use_moving_attacks_callout.mock';

jest.mock('./use_moving_attacks_callout');
jest.mock('../../../common/lib/kibana');

const useMovingAttacksCalloutMock = useMovingAttacksCallout as jest.Mock;

const renderCallout = () => {
  return render(
    <TestProviders>
      <MovingAttacksCallout />
    </TestProviders>
  );
};

describe('MovingAttacksCallout', () => {
  const reportEventMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    reportEventMock.mockClear();

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
      },
    });

    useMovingAttacksCalloutMock.mockReturnValue(mockUseMovingAttacksCallout());
  });

  it('does not render the callout when isMovingAttacksCalloutVisible is false', () => {
    useMovingAttacksCalloutMock.mockReturnValue({
      ...mockUseMovingAttacksCallout(),
      isMovingAttacksCalloutVisible: false,
    });

    renderCallout();

    expect(screen.queryByTestId(CALLOUT_TEST_DATA_ID)).not.toBeInTheDocument();
  });

  it('renders the callout when isMovingAttacksCalloutVisible is true', () => {
    renderCallout();

    expect(screen.getByTestId(CALLOUT_TEST_DATA_ID)).toBeInTheDocument();
  });

  it('renders the hide callout button when isMovingAttacksCalloutVisible is true', () => {
    renderCallout();

    expect(screen.getByTestId(HIDE_BUTTON_TEST_DATA_ID)).toBeInTheDocument();
  });

  it('calls hideCallout and reports telemetry when the callout is dismissed', async () => {
    const mockHideMovingAttacksCallout = jest.fn();

    useMovingAttacksCalloutMock.mockReturnValue({
      ...mockUseMovingAttacksCallout(),
      hideMovingAttacksCallout: mockHideMovingAttacksCallout,
      isMovingAttacksCalloutVisible: true,
    });

    renderCallout();

    const hideButton = screen.getByTestId(HIDE_BUTTON_TEST_DATA_ID);
    await userEvent.click(hideButton);

    await waitFor(() => {
      expect(mockHideMovingAttacksCallout).toHaveBeenCalled();
    });

    expect(reportEventMock).toHaveBeenCalledWith(AttacksEventTypes.FeaturePromotionCalloutAction, {
      action: 'hide',
    });
  });

  it('reports telemetry when "View attacks" button is clicked', async () => {
    renderCallout();

    const viewAttacksButton = screen.getByTestId('viewAttacksButton');
    await userEvent.click(viewAttacksButton);

    expect(reportEventMock).toHaveBeenCalledWith(AttacksEventTypes.FeaturePromotionCalloutAction, {
      action: 'view_attacks',
    });
  });
});
