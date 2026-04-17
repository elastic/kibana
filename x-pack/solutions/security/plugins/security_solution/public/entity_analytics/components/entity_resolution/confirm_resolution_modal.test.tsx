/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ConfirmResolutionModal } from './confirm_resolution_modal';
import { CONFIRM_RESOLUTION_MODAL_TEST_ID } from './test_ids';

const currentEntity = { 'entity.name': 'alice', 'entity.id': 'alice-id' };
const newEntity = { 'entity.name': 'bob', 'entity.id': 'bob-id' };

describe('ConfirmResolutionModal', () => {
  const defaultProps = {
    currentEntity,
    newEntity,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders modal with radio options', () => {
    const { getByTestId, getAllByRole } = render(<ConfirmResolutionModal {...defaultProps} />);

    expect(getByTestId(CONFIRM_RESOLUTION_MODAL_TEST_ID)).toBeInTheDocument();
    expect(getAllByRole('radio')).toHaveLength(2);
  });

  it('default selection resolves new entity to current entity', () => {
    const { getByRole } = render(<ConfirmResolutionModal {...defaultProps} />);

    fireEvent.click(getByRole('button', { name: /confirm resolution/i }));

    // Default: current_as_target → onConfirm(currentId, newId)
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('alice-id', 'bob-id');
  });

  it('swapped selection resolves current entity to new entity', () => {
    const { getAllByRole, getByRole } = render(<ConfirmResolutionModal {...defaultProps} />);

    // Select the second radio option (new_as_target)
    fireEvent.click(getAllByRole('radio')[1]);
    fireEvent.click(getByRole('button', { name: /confirm resolution/i }));

    // new_as_target → onConfirm(newId, currentId)
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('bob-id', 'alice-id');
  });

  it('calls onCancel when cancel button clicked', () => {
    const { getByRole } = render(<ConfirmResolutionModal {...defaultProps} />);

    fireEvent.click(getByRole('button', { name: /cancel/i }));

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    const { getByRole } = render(<ConfirmResolutionModal {...defaultProps} isLoading />);

    const confirmButton = getByRole('button', { name: /confirm resolution/i });
    expect(confirmButton).toBeDisabled();
  });
});
