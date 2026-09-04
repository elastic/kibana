/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AutonomySlider } from './autonomy_slider';

const renderSlider = (
  onChange: jest.Mock = jest.fn(),
  current: 'manual' | 'assisted' | 'supervised' = 'manual'
) => {
  render(<AutonomySlider current={current} onChange={onChange} />);
  return { onChange, slider: screen.getByTestId('pndAutonomySlider') };
};

describe('AutonomySlider', () => {
  it('persists once when a drag crosses an intermediate tick', () => {
    const { onChange, slider } = renderSlider();

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '1' } });
    fireEvent.change(slider, { target: { value: '2' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('pndAutonomyDescription')).toHaveTextContent(
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
