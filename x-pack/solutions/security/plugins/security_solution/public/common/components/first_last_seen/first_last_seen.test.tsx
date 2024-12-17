/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, waitFor } from '@testing-library/react';

import { useFirstLastSeen } from '../../containers/use_first_last_seen';
import { TestProviders } from '../../mock';
import type { FirstLastSeenProps } from './first_last_seen';
import { FirstLastSeen, FirstLastSeenType } from './first_last_seen';

const MOCKED_RESPONSE = {
  firstSeen: '2019-04-08T16:09:40.692Z',
  lastSeen: '2022-04-08T18:35:45.064Z',
};

jest.mock('../../containers/use_first_last_seen');
const useFirstLastSeenMock = useFirstLastSeen as jest.Mock;
useFirstLastSeenMock.mockReturnValue([false, MOCKED_RESPONSE]);

describe('FirstLastSeen Component', () => {
  const firstSeen = 'Apr 8, 2019 @ 16:09:40.692';
  const lastSeen = 'Apr 8, 2022 @ 18:35:45.064';

  const renderComponent = (overrides?: Partial<FirstLastSeenProps>) => {
    return render(
      <TestProviders>
        <FirstLastSeen
          field="host.name"
          value="some-host"
          indexPatterns={[]}
          type={FirstLastSeenType.FIRST_SEEN}
          {...overrides}
        />
      </TestProviders>
    );
  };

  test('Loading', async () => {
    useFirstLastSeenMock.mockReturnValue([true, MOCKED_RESPONSE]);

    const { getByTestId } = renderComponent();

    expect(getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('First Seen', async () => {
    useFirstLastSeenMock.mockReturnValue([false, MOCKED_RESPONSE]);

    const { getByText } = renderComponent();

    await waitFor(() => {
      expect(getByText(firstSeen)).toBeInTheDocument();
    });
  });

  test('Last Seen', async () => {
    useFirstLastSeenMock.mockReturnValue([false, MOCKED_RESPONSE]);

    const { getByText } = renderComponent({ type: FirstLastSeenType.LAST_SEEN });

    await waitFor(() => {
      expect(getByText(lastSeen)).toBeInTheDocument();
    });
  });

  test('First Seen is empty but not Last Seen', async () => {
    useFirstLastSeenMock.mockReturnValue([
      false,
      {
        ...MOCKED_RESPONSE,
        firstSeen: null,
      },
    ]);

    const { getByText } = renderComponent({ type: FirstLastSeenType.LAST_SEEN });

    await waitFor(() => {
      expect(getByText(lastSeen)).toBeInTheDocument();
    });
  });

  test('Last Seen is empty but not First Seen', async () => {
    useFirstLastSeenMock.mockReturnValue([
      false,
      {
        ...MOCKED_RESPONSE,
        lastSeen: null,
      },
    ]);

    const { getByText } = renderComponent({ type: FirstLastSeenType.FIRST_SEEN });

    await waitFor(() => {
      expect(getByText(firstSeen)).toBeInTheDocument();
    });
  });

  test('With a bad date time string', async () => {
    useFirstLastSeenMock.mockReturnValue([
      false,
      {
        ...MOCKED_RESPONSE,
        firstSeen: 'something-invalid',
      },
    ]);
    const { getByText } = renderComponent();
    await waitFor(() => {
      expect(getByText('something-invalid')).toBeInTheDocument();
    });
  });
});
