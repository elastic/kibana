/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WATCH_AUTONOMY_LEVELS, type WatchAutonomyLevel } from '@kbn/alertzero-common';
import { AutonomySlider } from './autonomy_slider';

/** Stands in for the Watch page: holds the draft value and echoes every change back down. */
const ControlledSlider: React.FC<{ onChange: jest.Mock }> = ({ onChange }) => {
  const [current, setCurrent] = useState<WatchAutonomyLevel>('manual');
  return (
    <AutonomySlider
      current={current}
      levels={WATCH_AUTONOMY_LEVELS}
      onChange={(level) => {
        onChange(level);
        setCurrent(level);
      }}
    />
  );
};

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

  it("reports each step to the parent and renders the parent's value", () => {
    const onChange = jest.fn();
    render(<ControlledSlider onChange={onChange} />);
    const slider = screen.getByTestId('alertZeroAutonomySlider');

    fireEvent.change(slider, { target: { value: '1' } });
    fireEvent.change(slider, { target: { value: '2' } });

    expect(onChange.mock.calls).toEqual([['assisted'], ['supervised']]);
    expect(slider).toHaveValue('2');
    expect(screen.getByTestId('alertZeroAutonomyDescription')).toHaveTextContent(
      'This Worker acts within its allow-list'
    );
  });

  it('does not report an unchanged level', () => {
    const { onChange, slider } = renderSlider(jest.fn(), 'assisted');

    fireEvent.change(slider, { target: { value: '1' } });

    expect(onChange).not.toHaveBeenCalled();
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
});
