/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LegendSteps, type LegendStep } from './legend_steps';

describe('LegendSteps', () => {
  const steps: LegendStep[] = [
    { color: '#54B399', label: 'Low', value: 0 },
    { color: '#E7664C', label: 'High', value: 1 },
  ];

  it('announces the color value in the color swatch accessible name', () => {
    render(<LegendSteps steps={steps} onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: /#54B399/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /#E7664C/ })).toBeInTheDocument();
  });
});
