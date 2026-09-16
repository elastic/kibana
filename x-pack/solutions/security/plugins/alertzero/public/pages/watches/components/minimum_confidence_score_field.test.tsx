/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MinimumConfidenceScoreField } from './minimum_confidence_score_field';

const renderField = (current = 0.85, onChange: jest.Mock = jest.fn()) => {
  const { rerender } = render(
    <MinimumConfidenceScoreField current={current} onChange={onChange} />
  );
  return {
    onChange,
    rerender,
    input: () => screen.getByTestId('alertZeroMinimumConfidenceScoreInput') as HTMLInputElement,
  };
};

describe('MinimumConfidenceScoreField', () => {
  it('displays the value as a 0–100 percentage integer', () => {
    const { input } = renderField(0.85);
    expect(input().value).toBe('85');
  });

  it('displays 0 for 0.0 and 100 for 1.0', () => {
    const { input, rerender } = renderField(0);
    expect(input().value).toBe('0');

    rerender(<MinimumConfidenceScoreField current={1} onChange={jest.fn()} />);
    expect(input().value).toBe('100');
  });

  it('persists once on blur, not per keystroke', () => {
    const { onChange, input } = renderField(0.85);

    fireEvent.change(input(), { target: { value: '9' } });
    fireEvent.change(input(), { target: { value: '90' } });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(input());

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(0.9);
  });

  it('does not persist when blurred on the unchanged value', () => {
    const { onChange, input } = renderField(0.85);

    fireEvent.blur(input());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores out-of-range inputs (> 100)', () => {
    const { onChange, input } = renderField(0.85);

    fireEvent.change(input(), { target: { value: '101' } });
    fireEvent.blur(input());

    // Value stays at 85 (the original); the invalid keystroke was discarded.
    expect(input().value).toBe('85');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores out-of-range inputs (< 0)', () => {
    const { onChange, input } = renderField(0.5);

    fireEvent.change(input(), { target: { value: '-1' } });
    fireEvent.blur(input());

    expect(input().value).toBe('50');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('re-syncs when the server echoes a different value (optimistic rollback)', () => {
    const { rerender, input } = renderField(0.85);

    rerender(<MinimumConfidenceScoreField current={0.7} onChange={jest.fn()} />);

    expect(input().value).toBe('70');
  });

  it('does not fire onChange again after a server echo of the same value', () => {
    const { onChange, rerender, input } = renderField(0.85);

    fireEvent.change(input(), { target: { value: '90' } });
    fireEvent.blur(input());

    expect(onChange).toHaveBeenCalledTimes(1);

    // Server echoes 0.9 back.
    rerender(<MinimumConfidenceScoreField current={0.9} onChange={onChange} />);

    // No second persist triggered by the echo.
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
