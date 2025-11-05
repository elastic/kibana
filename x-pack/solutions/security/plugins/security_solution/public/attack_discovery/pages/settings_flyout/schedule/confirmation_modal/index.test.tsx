/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { ConfirmationModal } from '.';
import {
  ARE_YOU_SURE,
  CANCEL,
  DISCARD_CHANGES,
  DISCARD_UNSAVED_CHANGES,
  YOU_MADE_CHANGES,
} from './translations';

const defaultProps = {
  onCancel: jest.fn(),
  onDiscard: jest.fn(),
};

describe('ConfirmationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a title with the expected text', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByTestId('title')).toHaveTextContent(DISCARD_UNSAVED_CHANGES);
  });

  it('renders a body with the expected text', () => {
    render(<ConfirmationModal {...defaultProps} />);

    const body = screen.getByTestId('body');

    expect(body).toHaveTextContent(YOU_MADE_CHANGES);
    expect(body).toHaveTextContent(ARE_YOU_SURE);
  });

  it('renders a cancel button with the expected text', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByTestId('cancel')).toHaveTextContent(CANCEL);
  });

  it('calls onCancel when the cancel button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cancel'));

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders a discard changes button with the expected text', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByTestId('discardChanges')).toHaveTextContent(DISCARD_CHANGES);
  });

  it('calls onDiscard when the discard changes button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('discardChanges'));

    expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
  });
});
