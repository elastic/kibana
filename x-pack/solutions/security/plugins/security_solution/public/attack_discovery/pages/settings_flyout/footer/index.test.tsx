/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Footer } from '.';
import { CLOSE } from './translations';

const defaultProps = {
  closeModal: jest.fn(),
};

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the default close button text', () => {
    render(<Footer {...defaultProps} />);

    const closeButton = screen.getByTestId('close');

    expect(closeButton).toHaveTextContent(CLOSE);
  });

  it('renders custom close button text', () => {
    render(<Footer {...defaultProps} closeButtonText="Custom Close" />);

    const closeButton = screen.getByTestId('close');

    expect(closeButton).toHaveTextContent('Custom Close');
  });

  it('calls closeModal when the button is clicked', () => {
    render(<Footer {...defaultProps} />);

    fireEvent.click(screen.getByTestId('close'));

    expect(defaultProps.closeModal).toHaveBeenCalled();
  });

  it('renders actionButtons when provided', () => {
    render(
      <Footer {...defaultProps} actionButtons={<div data-test-subj="action">{'Action'}</div>} />
    );

    expect(screen.getByTestId('action')).toBeInTheDocument();
  });
});
