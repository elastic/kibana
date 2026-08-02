/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { useOpenLifecycle } from './use_open_lifecycle';

interface ProbeProps {
  correlationId: string;
}

/** Stands in for the caller a list page would be: a row with an "open lifecycle" affordance. */
const Probe: React.FC<ProbeProps> = ({ correlationId }) => {
  const openLifecycle = useOpenLifecycle(correlationId);

  return (
    <button data-test-subj="pndTestOpenLifecycle" onClick={openLifecycle} type="button">
      {'open'}
    </button>
  );
};

describe('useOpenLifecycle', () => {
  it('opens the overlay by putting the discovery id in the search string', () => {
    const { history } = renderWithPndProviders(<Probe correlationId="ad-1" />, {
      route: '/watches/activity',
    });

    fireEvent.click(screen.getByTestId('pndTestOpenLifecycle'));

    expect(history.location.search).toBe('?lifecycle=ad-1');
  });

  it('stays on the page it was called from, so the list is still behind the overlay', () => {
    const { history } = renderWithPndProviders(<Probe correlationId="ad-1" />, {
      route: '/watches/activity',
    });

    fireEvent.click(screen.getByTestId('pndTestOpenLifecycle'));

    expect(history.location.pathname).toBe('/watches/activity');
  });

  it('keeps the params the page already had', () => {
    const { history } = renderWithPndProviders(<Probe correlationId="ad-1" />, {
      route: '/watches/activity?bucket=tune',
    });

    fireEvent.click(screen.getByTestId('pndTestOpenLifecycle'));

    expect(history.location.search).toBe('?bucket=tune&lifecycle=ad-1');
  });

  it('pushes one history entry, so Back closes the overlay', () => {
    const { history } = renderWithPndProviders(<Probe correlationId="ad-1" />, {
      route: '/watches/activity',
    });

    fireEvent.click(screen.getByTestId('pndTestOpenLifecycle'));

    expect(history.length).toBe(2);
  });

  it('does nothing without a discovery id', () => {
    const { history } = renderWithPndProviders(<Probe correlationId="" />, {
      route: '/watches/activity',
    });

    fireEvent.click(screen.getByTestId('pndTestOpenLifecycle'));

    expect(history.location.search).toBe('');
  });
});
