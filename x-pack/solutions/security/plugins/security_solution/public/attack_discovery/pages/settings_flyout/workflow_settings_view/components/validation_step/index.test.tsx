/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { ValidationStep } from '.';

const renderComponent = (
  validationPanel: React.ReactNode = <div data-test-subj="validationPanel" />
) =>
  render(
    <TestProviders>
      <ValidationStep validationPanel={validationPanel} />
    </TestProviders>
  );

describe('ValidationStep', () => {
  it('renders the validation section description', () => {
    renderComponent();

    const description = screen.getByTestId('validationStepDescription');

    expect(description).toHaveTextContent(
      'Choose how discoveries are validated or enriched before they are saved as attacks.'
    );
  });

  it('does NOT render a link in the description', () => {
    renderComponent();

    expect(screen.queryByTestId('validationCustomExampleLink')).not.toBeInTheDocument();
  });

  it('renders the validation panel', () => {
    renderComponent();

    expect(screen.getByTestId('validationPanel')).toBeInTheDocument();
  });
});
