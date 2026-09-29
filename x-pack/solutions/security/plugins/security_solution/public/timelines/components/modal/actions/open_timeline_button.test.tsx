/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { OpenTimelineButton } from './open_timeline_button';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useParams } from 'react-router-dom';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useTimelineStatus } from '../../open_timeline/use_timeline_status';

vi.mock('../../../../common/lib/apm/use_start_transaction');
vi.mock('../../open_timeline/use_timeline_status');
vi.mock('react-redux-v7', () => {
  const origin = require('react-redux-v7');
  const mockDispatch = vi.fn();
  return {
    ...origin,
    useDispatch: vi.fn(() => mockDispatch),
  };
});
vi.mock('react-router-dom', () => {
  const actual = require('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});
vi.mock('../../../../common/lib/kibana', async () => {
  const actual = await vi.importActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useNavigation: () => ({
      navigateTo: vi.fn(),
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
    (useParams as Mock).mockReturnValue({ tabName: TimelineTypeEnum.template });
    (useStartTransaction as Mock).mockReturnValue({ startTransaction: vi.fn() });
    (useTimelineStatus as Mock).mockReturnValue({
      timelineStatus: 'active',
      templateTimelineFilter: null,
      installPrepackagedTimelines: vi.fn(),
    });

    const { getByTestId } = renderOpenTimelineButton();

    getByTestId('timeline-modal-open-timeline-button').click();

    await waitFor(() => {
      expect(getByTestId('open-timeline-modal')).toBeInTheDocument();
    });
  });
});
