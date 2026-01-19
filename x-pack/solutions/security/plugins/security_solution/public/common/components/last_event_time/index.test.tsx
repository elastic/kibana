/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import '../../mock/formatted_relative';
import { getEmptyValue } from '../empty_value';
import { LastEventIndexKey } from '../../../../common/search_strategy';
import { mockLastEventTimeQuery } from '../../containers/events/last_event_time/mock';

import { useTimelineLastEventTime } from '../../containers/events/last_event_time';
import { TestProviders } from '../../mock';

import { LastEventTime } from '.';

jest.mock('../../containers/events/last_event_time', () => ({
  useTimelineLastEventTime: jest.fn(),
}));

describe('Last Event Time Stat', () => {
  beforeEach(() => {
    (useTimelineLastEventTime as jest.Mock).mockReset();
  });

  test('Loading', () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      true,
      {
        lastSeen: null,
        errorMessage: null,
      },
    ]);
    const { container } = render(
      <TestProviders>
        <LastEventTime indexKey={LastEventIndexKey.hosts} indexNames={[]} />
      </TestProviders>
    );
    // Removed strict equality as the EuiLoader has been converted to Emotion and will no longer have the euiLoadingSpinner--medium class
    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  test('Last seen', async () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      {
        lastSeen: mockLastEventTimeQuery.lastSeen,
        errorMessage: mockLastEventTimeQuery.errorMessage,
      },
    ]);
    const { container } = render(
      <TestProviders>
        <LastEventTime indexKey={LastEventIndexKey.hosts} indexNames={[]} />
      </TestProviders>
    );
    expect(container.textContent).toBe('Last event: 20 hours ago');
  });

  test('Bad date time string', async () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      {
        lastSeen: 'something-invalid',
        errorMessage: mockLastEventTimeQuery.errorMessage,
      },
    ]);
    const { container } = render(
      <TestProviders>
        <LastEventTime indexKey={LastEventIndexKey.hosts} indexNames={[]} />
      </TestProviders>
    );

    expect(container).toHaveTextContent('something-invalid');
  });
  test('Null time string', async () => {
    (useTimelineLastEventTime as jest.Mock).mockReturnValue([
      false,
      {
        lastSeen: null,
        errorMessage: mockLastEventTimeQuery.errorMessage,
      },
    ]);
    const { container } = render(
      <TestProviders>
        <LastEventTime indexKey={LastEventIndexKey.hosts} indexNames={[]} />
      </TestProviders>
    );
    expect(container.textContent).toBe(getEmptyValue());
  });
});
