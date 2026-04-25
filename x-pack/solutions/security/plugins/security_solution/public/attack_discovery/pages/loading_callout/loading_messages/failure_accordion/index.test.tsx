/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { FailureAccordion } from '.';
import { TestProviders } from '../../../../../common/mock/test_providers';

describe('FailureAccordion', () => {
  describe('when there is only one line', () => {
    const defaultProps = { failureReason: 'Error: what a failure' };
    beforeEach(() => {
      render(
        <TestProviders>
          <FailureAccordion {...defaultProps} />
        </TestProviders>
      );
    });

    it('renders a <p> with the failure reason', () => {
      expect(screen.getByText('Error: what a failure')).toBeInTheDocument();
    });

    it('does not render an accordion', () => {
      expect(screen.queryByTestId('failuresAccordion')).not.toBeInTheDocument();
    });
  });

  it('renders an accordion when there are multiple lines', () => {
    const multiLineProps = {
      failureReason: 'First line\nSecond line\nThird line',
    };

    render(
      <TestProviders>
        <FailureAccordion {...multiLineProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('failuresAccordion')).toBeInTheDocument();
  });

  it('renders all additional lines inside a code block', () => {
    const multiLineProps = {
      failureReason: 'First line\nSecond line\nThird line',
    };

    render(
      <TestProviders>
        <FailureAccordion {...multiLineProps} />
      </TestProviders>
    );

    expect(screen.getByText('Second line')).toBeInTheDocument();
  });

  describe('when failureReason is null', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <FailureAccordion failureReason={null} />
        </TestProviders>
      );
    });

    it('does not render the failure reason text', () => {
      expect(screen.queryByText('Error: what a failure')).not.toBeInTheDocument();
    });

    it('does not render an accordion', () => {
      expect(screen.queryByTestId('failuresAccordion')).not.toBeInTheDocument();
    });
  });
});
