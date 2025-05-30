/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TakeAction } from './take_action';
import { TestProviders } from '../../../../common/mock';

const TAKE_ACTION_BTN_TEST_SUBJ = 'take-action-button';
const INVESTIGATE_IN_TIMELINE_TEST_SUBJ = 'investigate-in-timeline-take-action-button';
const TIMELINE_MODAL_TEST_SUBJ = 'timeline-portal-overlay-mask';
const TIMELINE_QUERY_INPUT_TEST_SUBJ = 'timelineQueryInput';

describe('TakeAction', () => {
  it('opens menu with "Investigate in Timeline" option upon clicking button', async () => {
    const { getByTestId } = render(<TakeAction kqlQuery={''} />, {
      wrapper: TestProviders,
    });

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    expect(takeActionButton).toBeInTheDocument();

    await userEvent.click(takeActionButton.firstChild as Element);

    const investigateOption = getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ);
    expect(investigateOption).toBeInTheDocument();
    expect(investigateOption).toBeVisible();
  });

  it('does not open menu when button is disabled', async () => {
    const { getByTestId, queryByTestId } = render(<TakeAction isDisabled={true} kqlQuery={''} />, {
      wrapper: TestProviders,
    });

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    expect(takeActionButton).toBeInTheDocument();

    await userEvent.click(takeActionButton.firstChild as Element);

    expect(queryByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('opens Timeline modal with host parameters', async () => {
    const expectedQuery = 'host.name: "test-host"';
    const { getByTestId, queryByTestId } = render(<TakeAction kqlQuery={expectedQuery} />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).not.toBeInTheDocument();

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    await userEvent.click(takeActionButton.firstChild as Element);

    const investigateOption = getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ);
    await userEvent.click(investigateOption);

    expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).toBeInTheDocument();
  });

  it.only('opens Timeline modal with user parameters', async () => {
    const expectedQuery = 'user.name: "test-user"';
    const { getByTestId, queryByTestId, getByRole } = render(
      <TakeAction kqlQuery={expectedQuery} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).not.toBeInTheDocument();

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    await userEvent.click(takeActionButton.firstChild as Element);

    // const investigateOption = getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ);
    // await userEvent.click(investigateOption.querySelector('button') as Element);
    const button = getByRole('button', { name: /Investigate in Timeline/i });
    await userEvent.click(button);

    expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).toBeInTheDocument();
  });

  xit('opens Timeline modal with generic parameters', () => {
    const expectedQuery = 'entity.id: "test-id" OR related.entity: "test-related-id';
    const { getByTestId } = render(<TakeAction kqlQuery={expectedQuery} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId(TIMELINE_MODAL_TEST_SUBJ)).not.toBeInTheDocument();

    getByTestId(TAKE_ACTION_BTN_TEST_SUBJ).click();
    getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ).click();

    expect(getByTestId(TIMELINE_MODAL_TEST_SUBJ)).toBeInTheDocument();

    const startDateButton = getByTestId('superDatePickerstartDatePopoverButton');
    const endDateButton = getByTestId('superDatePickerendDatePopoverButton');

    const expectedStartTimestamp = '2025-05-30T14:16:51.000Z'; // ISO format timestamp
    const expectedEndTimestamp = '2025-05-30T14:46:51.000Z'; // ISO format timestamp, 30 mins later than start timestamp
    expect(startDateButton).toHaveTextContent(expectedStartTimestamp);
    expect(endDateButton).toHaveTextContent(expectedEndTimestamp);
    expect(getByTestId(TIMELINE_QUERY_INPUT_TEST_SUBJ)).toHaveTextContent(expectedQuery);
  });
});
