/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { PulsingTitle } from '.';
import { TestProviders } from '../../../../../common/mock';

describe('PulsingTitle', () => {
  it('renders children text', () => {
    render(
      <TestProviders>
        <PulsingTitle>{'Generation'}</PulsingTitle>
      </TestProviders>
    );

    expect(screen.getByText('Generation')).toBeInTheDocument();
  });

  it('wraps children in a span element', () => {
    render(
      <TestProviders>
        <PulsingTitle>{'Alert retrieval'}</PulsingTitle>
      </TestProviders>
    );

    const element = screen.getByText('Alert retrieval');

    expect(element.tagName).toBe('SPAN');
  });
});
