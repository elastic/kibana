/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { ClearEntityDataButton } from './clear_entity_data_button';

import {
  CLEAR_ENTITY_DATA_BUTTON_TEST_ID,
  CLEAR_ENTITY_DATA_MODAL_TEST_ID,
  CLEAR_ENTITY_DATA_CONFIRM_TEST_ID,
  CLEAR_ENTITY_DATA_CANCEL_TEST_ID,
} from '../../../test_ids';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('ClearEntityDataButton', () => {
  it('opens the confirmation modal when clicked', () => {
    render(<ClearEntityDataButton onDelete={jest.fn()} isDeleting={false} />, {
      wrapper: Wrapper,
    });

    expect(screen.queryByTestId(CLEAR_ENTITY_DATA_MODAL_TEST_ID)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(CLEAR_ENTITY_DATA_BUTTON_TEST_ID));

    expect(screen.getByTestId(CLEAR_ENTITY_DATA_MODAL_TEST_ID)).toBeInTheDocument();
    expect(
      screen.getByText(/This will delete all Security Entity store records/)
    ).toBeInTheDocument();
  });

  it('dismisses the modal when Close is clicked', () => {
    render(<ClearEntityDataButton onDelete={jest.fn()} isDeleting={false} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByTestId(CLEAR_ENTITY_DATA_BUTTON_TEST_ID));
    expect(screen.getByTestId(CLEAR_ENTITY_DATA_MODAL_TEST_ID)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(CLEAR_ENTITY_DATA_CANCEL_TEST_ID));
    expect(screen.queryByTestId(CLEAR_ENTITY_DATA_MODAL_TEST_ID)).not.toBeInTheDocument();
  });

  it('calls onDelete and closes the modal when confirmed', async () => {
    const mockOnDelete = jest.fn().mockResolvedValue(undefined);
    render(<ClearEntityDataButton onDelete={mockOnDelete} isDeleting={false} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByTestId(CLEAR_ENTITY_DATA_BUTTON_TEST_ID));
    fireEvent.click(screen.getByTestId(CLEAR_ENTITY_DATA_CONFIRM_TEST_ID));

    expect(mockOnDelete).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByTestId(CLEAR_ENTITY_DATA_MODAL_TEST_ID)).not.toBeInTheDocument();
    });
  });

  it('passes isDeleting to the modal loading state', () => {
    render(<ClearEntityDataButton onDelete={jest.fn()} isDeleting={true} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByTestId(CLEAR_ENTITY_DATA_BUTTON_TEST_ID));

    expect(screen.getByTestId(CLEAR_ENTITY_DATA_CONFIRM_TEST_ID)).toBeDisabled();
  });
});
