/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { ExceptionItemDeleteConfirmModal } from '.';

describe('ExceptionItemDeleteConfirmModal', () => {
  it('renders the exception item name in the body', () => {
    render(
      <ExceptionItemDeleteConfirmModal
        exceptionItemName="My exception"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId('exceptionItemDeleteConfirmModal')).toHaveTextContent(
      'This action will delete the exception "My exception". Click "Delete" to continue.'
    );
  });

  it('invokes onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ExceptionItemDeleteConfirmModal
        exceptionItemName="My exception"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('invokes onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ExceptionItemDeleteConfirmModal
        exceptionItemName="My exception"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(onCancel).toHaveBeenCalled();
  });
});
