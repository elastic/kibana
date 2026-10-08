/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { DeltaBadge } from './delta_badge';

const renderBadge = (props: React.ComponentProps<typeof DeltaBadge>) =>
  render(
    <EuiProvider>
      <DeltaBadge {...props} data-test-subj="delta" />
    </EuiProvider>
  );

describe('DeltaBadge', () => {
  it('uses the same colour for an increase when up is bad as for a decrease when up is good', () => {
    const { unmount } = renderBadge({ delta: 4, previous: 2, upIsBad: true });
    const badUp = screen.getByTestId('delta').className;
    unmount();
    const { unmount: unmountDown } = renderBadge({ delta: -4, previous: 8, upIsBad: true });
    const goodDown = screen.getByTestId('delta').className;
    unmountDown();
    expect(badUp).not.toEqual(goodDown);
    renderBadge({ delta: -4, previous: 8, upIsBad: false });
    expect(screen.getByTestId('delta').className).toEqual(badUp);
  });

  it('shows "new" when there was no previous value and nothing when delta is missing', () => {
    const { unmount } = renderBadge({ delta: 3, previous: 0, upIsBad: true });
    expect(screen.getByTestId('delta')).toHaveTextContent('new');
    unmount();
    renderBadge({ upIsBad: true });
    expect(screen.queryByTestId('delta')).not.toBeInTheDocument();
  });
});
