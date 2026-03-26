/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { UpdatedByLabel } from '.';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { screen, render, waitFor } from '@testing-library/react';
import { __IntlProvider as RawIntlProvider } from '@kbn/i18n-react';

jest.mock('../../../../common/components/formatted_date', () => {
  return {
    FormattedDate: jest.fn(({ value }: PropsWithChildren<{ value: string }>) => {
      return <span>{value}</span>;
    }),
  };
});

jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles');

const getMockUser = () => ({
  uid: 'user-1',
  enabled: true,
  user: {
    username: 'username',
    full_name: 'full name',
  },
  data: {},
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RawIntlProvider locale="en">{children}</RawIntlProvider>
);

describe('UpdateByLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [getMockUser()],
    });
  });

  it('should display the full name of the user', async () => {
    render(<UpdatedByLabel updatedBy="user-1" updatedAt="2023-10-10T10:00:00Z" />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(screen.getByTestId('updated_at')).toHaveTextContent(
        'Last updated: full name on 2023-10-10T10:00:00Z'
      );
    });
  });

  it('should display the username if full name is not available', async () => {
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [
        {
          ...getMockUser(),
          user: {
            username: 'username',
            full_name: undefined,
          },
        },
      ],
    });

    render(<UpdatedByLabel updatedBy="user-1" updatedAt="2023-10-10T10:00:00Z" />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(screen.getByTestId('updated_at')).toHaveTextContent(
        'Last updated: username on 2023-10-10T10:00:00Z'
      );
    });
  });
});
