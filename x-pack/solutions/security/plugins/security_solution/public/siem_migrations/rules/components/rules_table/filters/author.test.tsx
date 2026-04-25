/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { AuthorFilterButton } from './author';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { AuthorFilter } from '../../../types';

describe('AuthorFilterButton', () => {
  it('renders the author filter button', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AuthorFilterButton onAuthorChanged={() => {}} />
      </TestProviders>
    );

    expect(getByTestId('authorFilterButton')).toBeInTheDocument();
  });

  it('calls author changed handler on `Elastic` author selection', async () => {
    const onAuthorChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <AuthorFilterButton onAuthorChanged={onAuthorChanged} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('authorFilterButton'));
    fireEvent.click(getByText('Elastic'));

    await waitFor(() => {
      expect(onAuthorChanged).toHaveBeenCalledWith(AuthorFilter.ELASTIC);
    });
  });

  it('calls author changed handler on `Custom` author selection', async () => {
    const onAuthorChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <AuthorFilterButton onAuthorChanged={onAuthorChanged} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('authorFilterButton'));
    fireEvent.click(getByText('Custom'));

    await waitFor(() => {
      expect(onAuthorChanged).toHaveBeenCalledWith(AuthorFilter.CUSTOM);
    });
  });

  it('calls author changed handler on deselection', async () => {
    const onAuthorChanged = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <AuthorFilterButton onAuthorChanged={onAuthorChanged} author={AuthorFilter.CUSTOM} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('authorFilterButton'));
    fireEvent.click(getByText('Custom'));

    await waitFor(() => {
      expect(onAuthorChanged).toHaveBeenCalledWith();
    });
  });
});
