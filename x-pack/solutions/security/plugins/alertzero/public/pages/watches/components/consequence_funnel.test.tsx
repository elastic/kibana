/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ConsequenceFunnel } from './consequence_funnel';

describe('ConsequenceFunnel', () => {
  it('renders one step card per step, in order', () => {
    render(
      <ConsequenceFunnel
        steps={[
          { value: '~240', label: 'alerts / day' },
          { value: 44, label: 'currently qualify', accent: true },
          { value: 44, label: 'closed automatically', outcome: true },
        ]}
      />
    );

    const funnel = screen.getByTestId('alertZeroConsequenceFunnel');
    const steps = within(funnel).getAllByTestId('alertZeroConsequenceFunnelStep');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('~240');
    expect(steps[0]).toHaveTextContent('alerts / day');
    expect(steps[2]).toHaveTextContent('closed automatically');
  });

  it('uses a caller-provided data-test-subj prefix', () => {
    render(
      <ConsequenceFunnel steps={[{ value: 1, label: 'one' }]} data-test-subj="customFunnel" />
    );

    expect(screen.getByTestId('customFunnel')).toBeInTheDocument();
    expect(screen.getByTestId('customFunnelStep')).toBeInTheDocument();
  });
});
