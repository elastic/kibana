/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ValidationStep } from '.';

describe('ValidationStep', () => {
  it('renders the validation step panel', () => {
    render(
      <ValidationStep>
        <div data-test-subj="content">{'Content'}</div>
      </ValidationStep>
    );

    expect(screen.getByTestId('validationStep')).toBeInTheDocument();
  });

  it('renders the title "Validation"', () => {
    render(
      <ValidationStep>
        <div>{'Content'}</div>
      </ValidationStep>
    );

    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(
      <ValidationStep>
        <div>{'Content'}</div>
      </ValidationStep>
    );

    expect(
      screen.getByText(
        'Choose how discoveries are validated or enriched before they are saved as attacks.'
      )
    ).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <ValidationStep>
        <div data-test-subj="childContent">{'Child content'}</div>
      </ValidationStep>
    );

    expect(screen.getByTestId('childContent')).toBeInTheDocument();
  });

  it('renders with hasError=true without crashing', () => {
    render(
      <ValidationStep hasError>
        <div>{'Content'}</div>
      </ValidationStep>
    );

    expect(screen.getByTestId('validationStep')).toBeInTheDocument();
  });

  it('renders the avatar with step number 3', () => {
    render(
      <ValidationStep>
        <div>{'Content'}</div>
      </ValidationStep>
    );

    expect(screen.getByTestId('validationStepAvatar')).toBeInTheDocument();
  });
});
