/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AutonomySlider, autonomyLevelFromSliderIndex } from './autonomy_slider';

describe('AutonomySlider', () => {
  it.each([
    [0, 'manual'],
    [1, 'assisted'],
    [2, 'supervised'],
  ] as const)('maps slider index %i to %s', (sliderIndex, autonomyLevel) => {
    const onChange = jest.fn();
    const initialLevel = sliderIndex === 0 ? 'supervised' : 'manual';
    render(<AutonomySlider value={initialLevel} onChange={onChange} />);

    fireEvent.change(screen.getByRole('slider'), { target: { value: sliderIndex } });

    expect(onChange).toHaveBeenCalledWith(autonomyLevel);
  });

  it('does not escalate when the slider emits an unexpected value', () => {
    expect(autonomyLevelFromSliderIndex(99)).toBeUndefined();
  });
});
