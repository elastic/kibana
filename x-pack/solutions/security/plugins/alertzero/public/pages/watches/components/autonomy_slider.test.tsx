/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WATCH_AUTONOMY_LEVELS, type WatchAutonomyLevel } from '@kbn/alertzero-common';
import { AutonomySlider } from './autonomy_slider';

const renderSlider = (
  onChange: jest.Mock = jest.fn(),
  current: WatchAutonomyLevel = 'manual',
  levels: readonly WatchAutonomyLevel[] = WATCH_AUTONOMY_LEVELS
) => {
  render(<AutonomySlider current={current} levels={levels} onChange={onChange} />);
  return { onChange, slider: screen.getByTestId('alertZeroAutonomySlider') };
};

describe('AutonomySlider', () => {
  it('offers only the levels the Worker allows', () => {
    const { onChange, slider } = renderSlider(jest.fn(), 'manual', ['manual', 'assisted']);

    expect(slider).toHaveAttribute('max', '1');
    expect(screen.queryByRole('button', { name: 'Supervised' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Assisted' }));

    expect(onChange).toHaveBeenCalledWith('assisted');
  });

  it('renders a single allowed level as a fixed value instead of a slider', () => {
    const onChange = jest.fn();
    render(<AutonomySlider current="manual" levels={['manual']} onChange={onChange} />);

    expect(screen.queryByTestId('alertZeroAutonomySlider')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroAutonomyFixed')).toHaveTextContent('Manual');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('persists once when a drag crosses an intermediate tick', () => {
    const { onChange, slider } = renderSlider();

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '1' } });
    fireEvent.change(slider, { target: { value: '2' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('alertZeroAutonomyDescription')).toHaveTextContent(
      'This Worker acts within its allow-list'
    );

    fireEvent.pointerUp(window);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('supervised');
  });

  it('persists immediately when a tick is clicked', () => {
    const { onChange } = renderSlider();

    fireEvent.click(screen.getByRole('button', { name: 'Supervised' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('supervised');
  });

  it('persists immediately for a keyboard step', () => {
    const { onChange, slider } = renderSlider();

    fireEvent.change(slider, { target: { value: '1' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('assisted');
  });

  it('does not persist when the pointer is released on the current level', () => {
    const { onChange, slider } = renderSlider();

    fireEvent.pointerDown(slider);
    fireEvent.pointerUp(window);

    expect(onChange).not.toHaveBeenCalled();
  });
});
