/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AnimatedCounter } from '.';

describe('AnimatedCounter', () => {
  it('renders the expected final count', async () => {
    const animationDurationMs = 10; // ms
    const count = 20;

    render(<AnimatedCounter animationDurationMs={animationDurationMs} count={count} />);
    await new Promise((resolve) => setTimeout(resolve, animationDurationMs + 10));

    const animatedCounter = screen.getByTestId('animatedCounter');

    expect(animatedCounter).toHaveTextContent(`${count}`);
  });
});
