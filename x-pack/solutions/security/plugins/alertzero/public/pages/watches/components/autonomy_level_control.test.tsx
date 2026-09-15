/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import { AutonomyLevelControl } from './autonomy_level_control';

const AD = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;

const renderControl = (
  workerId = AD,
  current: 'manual' | 'assisted' | 'supervised' = 'manual',
  onChange: jest.Mock = jest.fn()
) => {
  render(<AutonomyLevelControl workerId={workerId} current={current} onChange={onChange} />);
  return { onChange };
};

describe('AutonomyLevelControl', () => {
  it('renders only the allowed level cards for the Worker', () => {
    renderControl(AD, 'supervised');

    // Attack Discovery allows manual + supervised only — no Assisted card.
    expect(screen.queryByRole('radio', { name: /Assisted/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Manual/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Supervised/ })).toBeInTheDocument();
  });

  it('marks the selected level card', () => {
    renderControl(AD, 'supervised');

    const track = screen.getByTestId('alertZeroAutonomyTrack');
    expect(track).toHaveAttribute('aria-valuenow', '2');
    expect(track).toHaveAttribute('aria-valuetext', 'Supervised');
  });

  it('persists once when a card is clicked', () => {
    const { onChange } = renderControl(AD, 'manual');

    fireEvent.click(screen.getByRole('radio', { name: /Supervised/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('supervised');
  });

  it('persists for a keyboard step on the track', () => {
    const { onChange } = renderControl(AD, 'manual');

    fireEvent.keyDown(screen.getByTestId('alertZeroAutonomyTrack'), { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('supervised');
  });

  it('does not persist when disabled', () => {
    const onChange = jest.fn();
    render(<AutonomyLevelControl workerId={AD} current="manual" isDisabled onChange={onChange} />);

    fireEvent.click(screen.getAllByRole('radio')[1]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the supervised warning when supervised is selected', () => {
    renderControl(AD, 'supervised');

    expect(screen.getByTestId('alertZeroAutonomyWarn')).toBeInTheDocument();
  });

  it('hides the supervised warning at lower levels', () => {
    renderControl(AD, 'manual');

    expect(screen.queryByTestId('alertZeroAutonomyWarn')).not.toBeInTheDocument();
  });

  it('renders the intro copy when the Worker has card copy', () => {
    renderControl(AD, 'manual');

    expect(screen.getByTestId('alertZeroAutonomyIntro')).toHaveTextContent(
      'This Worker supports Manual and Supervised'
    );
  });

  it('falls back to generic cards for an unknown Worker', () => {
    render(
      <AutonomyLevelControl workerId="some-future-worker" current="assisted" onChange={jest.fn()} />
    );

    // All three levels, no intro, generic who line present.
    expect(screen.queryByTestId('alertZeroAutonomyIntro')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Assisted/ })).toBeInTheDocument();
  });
});
