/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { ClearEntityDataModal } from './clear_entity_data_modal';

import {
  CLEAR_ENTITY_DATA_MODAL_TEST_ID,
  CLEAR_ENTITY_DATA_CONFIRM_TEST_ID,
  CLEAR_ENTITY_DATA_CANCEL_TEST_ID,
} from '../../../test_ids';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('ClearEntityDataModal', () => {
  it('renders nothing when closed', () => {
    render(
      <ClearEntityDataModal
        isOpen={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isDeleting={false}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.queryByTestId(CLEAR_ENTITY_DATA_MODAL_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders the confirmation copy when open', () => {
    render(
      <ClearEntityDataModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isDeleting={false}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId(CLEAR_ENTITY_DATA_MODAL_TEST_ID)).toBeInTheDocument();
    expect(
      screen.getByText(/This will delete all Security Entity store records/)
    ).toBeInTheDocument();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = jest.fn();
    render(
      <ClearEntityDataModal
        isOpen={true}
        onClose={onClose}
        onConfirm={jest.fn()}
        isDeleting={false}
      />,
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByTestId(CLEAR_ENTITY_DATA_CANCEL_TEST_ID));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm and closes the modal when confirmed', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    render(
      <ClearEntityDataModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isDeleting={false}
      />,
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByTestId(CLEAR_ENTITY_DATA_CONFIRM_TEST_ID));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('disables confirm while deleting', () => {
    render(
      <ClearEntityDataModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isDeleting={true}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId(CLEAR_ENTITY_DATA_CONFIRM_TEST_ID)).toBeDisabled();
  });
});
