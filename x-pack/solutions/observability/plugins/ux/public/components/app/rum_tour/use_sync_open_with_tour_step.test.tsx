/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { useSyncOpenWithTourStep } from './use_sync_open_with_tour_step';

const mockTourState: { isActive: boolean; toursEnabled: boolean; stepId?: string } = {
  isActive: true,
  toursEnabled: true,
  stepId: 'sessions',
};

jest.mock('./ux_tour_context', () => ({
  useUxTour: () => ({
    isActive: mockTourState.isActive,
    toursEnabled: mockTourState.toursEnabled,
    stepConfig: mockTourState.stepId ? { stepId: mockTourState.stepId } : undefined,
  }),
}));

function Probe() {
  const [open, setOpen] = useState(false);
  useSyncOpenWithTourStep('filters', setOpen);
  return open ? <div data-test-subj="uxOtelFiltersFlyout" /> : null;
}

describe('useSyncOpenWithTourStep', () => {
  beforeEach(() => {
    mockTourState.isActive = true;
    mockTourState.toursEnabled = true;
    mockTourState.stepId = 'sessions';
  });

  it('opens on the matching tour step and closes when Next leaves it', () => {
    const view = render(<Probe />);
    expect(screen.queryByTestId('uxOtelFiltersFlyout')).not.toBeInTheDocument();

    mockTourState.stepId = 'filters';
    view.rerender(<Probe />);
    expect(screen.getByTestId('uxOtelFiltersFlyout')).toBeInTheDocument();

    mockTourState.stepId = 'clickMap';
    view.rerender(<Probe />);
    expect(screen.queryByTestId('uxOtelFiltersFlyout')).not.toBeInTheDocument();
  });

  it('closes when the tour is skipped', () => {
    mockTourState.stepId = 'filters';
    const view = render(<Probe />);
    expect(screen.getByTestId('uxOtelFiltersFlyout')).toBeInTheDocument();

    mockTourState.isActive = false;
    view.rerender(<Probe />);
    expect(screen.queryByTestId('uxOtelFiltersFlyout')).not.toBeInTheDocument();
  });
});
