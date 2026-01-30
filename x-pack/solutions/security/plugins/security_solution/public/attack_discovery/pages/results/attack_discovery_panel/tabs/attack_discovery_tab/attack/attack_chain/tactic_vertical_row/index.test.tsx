/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { matchers } from '@emotion/jest';

import { TacticVerticalRow } from '.';

expect.extend(matchers);

const renderWithEui = (ui: React.ReactElement) => render(<EuiProvider>{ui}</EuiProvider>);

describe('TacticVerticalRow', () => {
  it('renders the tactic label', () => {
    renderWithEui(<TacticVerticalRow tactic="Initial Access" detected={false} />);
    expect(screen.getByTestId('tacticText')).toHaveTextContent('Initial Access');
  });

  it('shows halo only when detected', () => {
    const { rerender } = renderWithEui(<TacticVerticalRow tactic="Execution" detected={false} />);
    expect(screen.getByTestId('outerCircle')).toHaveStyleRule('opacity', '0');

    rerender(
      <EuiProvider>
        <TacticVerticalRow tactic="Execution" detected={true} />
      </EuiProvider>
    );
    expect(screen.getByTestId('outerCircle')).toHaveStyleRule('opacity', '0.25');
  });

  it('trims the dashed line for first and last rows', () => {
    const { rerender } = renderWithEui(
      <TacticVerticalRow tactic="Persistence" detected={false} isFirst />
    );

    expect(screen.getByTestId('dashedLine')).toHaveStyleRule('top', '50%');
    expect(screen.getByTestId('dashedLine')).toHaveStyleRule('bottom', '0');

    rerender(
      <EuiProvider>
        <TacticVerticalRow tactic="Persistence" detected={false} isLast />
      </EuiProvider>
    );

    expect(screen.getByTestId('dashedLine')).toHaveStyleRule('top', '0');
    expect(screen.getByTestId('dashedLine')).toHaveStyleRule('bottom', '50%');
  });
});
