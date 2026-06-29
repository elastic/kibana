/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { GenerationStep } from '.';

describe('GenerationStep', () => {
  it('renders the generation step panel', () => {
    render(<GenerationStep />);

    expect(screen.getByTestId('generationStep')).toBeInTheDocument();
  });

  it('renders the title "Generation"', () => {
    render(<GenerationStep />);

    expect(screen.getByText('Generation')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<GenerationStep />);

    expect(
      screen.getByText('Configure how Attack Discovery generates findings from retrieved alerts.')
    ).toBeInTheDocument();
  });

  it('renders the avatar with step number 2', () => {
    render(<GenerationStep />);

    expect(screen.getByTestId('generationStepAvatar')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(
      <GenerationStep>
        <div data-test-subj="childContent">{'Child content'}</div>
      </GenerationStep>
    );

    expect(screen.getByTestId('childContent')).toBeInTheDocument();
  });
});
