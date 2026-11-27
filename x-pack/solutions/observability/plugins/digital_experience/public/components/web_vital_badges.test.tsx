/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { WebVitalValue } from './web_vital_badges';

describe('WebVitalValue', () => {
  it('formats the value of the vital and carries its rating', () => {
    render(
      <>
        <WebVitalValue vital="lcp" value={2100} data-test-subj="lcp" />
        <WebVitalValue vital="inp" value={260} data-test-subj="inp" />
        <WebVitalValue vital="cls" value={0.31} data-test-subj="cls" />
      </>,
      { wrapper: EuiProvider }
    );

    expect(screen.getByTestId('lcp')).toHaveTextContent('2.10 s');
    expect(screen.getByTestId('lcp')).toHaveAttribute('data-rating', 'good');
    expect(screen.getByTestId('inp')).toHaveAttribute('data-rating', 'needsImprovement');
    expect(screen.getByTestId('cls')).toHaveTextContent('0.310');
    expect(screen.getByTestId('cls')).toHaveAttribute('data-rating', 'poor');
  });

  it('carries the sample count only when it is given', () => {
    render(
      <>
        <WebVitalValue vital="lcp" value={2100} data-test-subj="withCount" data-sample-count={42} />
        <WebVitalValue vital="lcp" value={2100} data-test-subj="withoutCount" />
      </>,
      { wrapper: EuiProvider }
    );

    expect(screen.getByTestId('withCount')).toHaveAttribute('data-sample-count', '42');
    expect(screen.getByTestId('withoutCount')).not.toHaveAttribute('data-sample-count');
  });
});
