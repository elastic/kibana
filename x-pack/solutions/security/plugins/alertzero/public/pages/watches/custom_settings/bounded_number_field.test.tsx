/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BoundedNumberField } from './bounded_number_field';

const renderField = (value = 21) => {
  const onChange = jest.fn();
  render(
    <BoundedNumberField
      value={value}
      min={1}
      max={30}
      ariaLabel="Analysis window in days"
      testSubj="field"
      onChange={onChange}
    />
  );
  return { onChange, input: screen.getByTestId('field') };
};

/** Types `text` the way a person does: one change event per keystroke, starting from empty. */
const typeSequence = (input: HTMLElement, text: string) => {
  fireEvent.change(input, { target: { value: '' } });
  for (let end = 1; end <= text.length; end++) {
    fireEvent.change(input, { target: { value: text.slice(0, end) } });
  }
};

describe('BoundedNumberField', () => {
  it('publishes nothing while typing and commits the final valid value on blur', () => {
    const { onChange, input } = renderField();

    typeSequence(input, '25');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(25);
  });

  // "3" is valid on its own, so a per-keystroke publish would have leaked it and left the
  // saved 21 unrecoverable on revert.
  it('does not leak a valid prefix of an out-of-range value and reverts to the saved value', () => {
    const { onChange, input } = renderField(21);

    typeSequence(input, '31');
    expect(input).toHaveValue(31);

    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(21);
  });

  it('reverts an empty or non-integer draft on blur', () => {
    const { onChange, input } = renderField();

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(21);

    fireEvent.change(input, { target: { value: '7.5' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(21);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits on Enter and does not publish the same value twice on the following blur', () => {
    const onChange = jest.fn();
    // A real parent writes the committed value back into `value`; a bare mock would not.
    const Harness = () => {
      const [value, setValue] = useState(21);
      return (
        <BoundedNumberField
          value={value}
          min={1}
          max={30}
          ariaLabel="Analysis window in days"
          testSubj="field"
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    };
    render(<Harness />);
    const input = screen.getByTestId('field');

    typeSequence(input, '12');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(12);

    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not publish when the committed value equals the saved one', () => {
    const { onChange, input } = renderField(21);

    typeSequence(input, '21');
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('re-syncs the input when the saved value changes from outside', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <BoundedNumberField
        value={21}
        min={1}
        max={30}
        ariaLabel="Analysis window in days"
        testSubj="field"
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByTestId('field'), { target: { value: '9' } });

    rerender(
      <BoundedNumberField
        value={7}
        min={1}
        max={30}
        ariaLabel="Analysis window in days"
        testSubj="field"
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('field')).toHaveValue(7);
  });
});
