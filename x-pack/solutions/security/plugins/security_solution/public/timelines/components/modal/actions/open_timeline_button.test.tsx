/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { OpenTimelineButton } from './open_timeline_button';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useParams } from 'react-router-dom';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useTimelineStatus } from '../../open_timeline/use_timeline_status';

jest.mock('../../../../common/lib/apm/use_start_transaction');
jest.mock('../../open_timeline/use_timeline_status');
jest.mock('react-redux', () => {
  const origin = jest.requireActual('react-redux');
  const mockDispatch = jest.fn();
  return {
    ...origin,
    useDispatch: jest.fn(() => mockDispatch),
  };
});
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: jest.fn(),
  };
});
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useNavigation: () => ({
      navigateTo: jest.fn(),
    }),
  };
});

const renderOpenTimelineButton = () =>
  render(
    <TestProviders>
      <OpenTimelineButton />
    </TestProviders>
  );

describe('OpenTimelineButton', () => {
  it('should render the button', () => {
    const { getByTestId, queryByTestId } = renderOpenTimelineButton();

    expect(getByTestId('timeline-modal-open-timeline-button')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-open-timeline-button')).toHaveTextContent('Open');

    expect(queryByTestId('open-timeline-modal')).not.toBeInTheDocument();
  });

  it('should open the modal after clicking on the button', async () => {
    (useParams as jest.Mock).mockReturnValue({ tabName: TimelineTypeEnum.template });
    (useStartTransaction as jest.Mock).mockReturnValue({ startTransaction: jest.fn() });
    (useTimelineStatus as jest.Mock).mockReturnValue({
      timelineStatus: 'active',
      templateTimelineFilter: null,
      installPrepackagedTimelines: jest.fn(),
    });

    const { getByTestId } = renderOpenTimelineButton();

    getByTestId('timeline-modal-open-timeline-button').click();

    await waitFor(() => {
      expect(getByTestId('open-timeline-modal')).toBeInTheDocument();
    });
  });
});
