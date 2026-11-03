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

/** Like a real parent: every published value is written back into `value`. */
const renderControlledField = (initialValue = 21) => {
  const onChange = jest.fn();
  const Harness = () => {
    const [value, setValue] = useState(initialValue);
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
  it('publishes each valid keystroke and keeps the final value on blur', () => {
    const { onChange, input } = renderControlledField();

    typeSequence(input, '25');

    // The emptied field is not valid and publishes nothing; "2" and "25" are.
    expect(onChange.mock.calls).toEqual([[2], [25]]);

    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(input).toHaveValue(25);
  });

  // "3" is valid on its own, so it is published while typing; abandoning the out-of-range "31"
  // must hand back the pre-edit 21 rather than leave that prefix behind.
  it('falls back to the pre-edit value when an out-of-range entry is abandoned', () => {
    const { onChange, input } = renderControlledField(21);

    fireEvent.focus(input);
    typeSequence(input, '31');
    expect(onChange.mock.calls).toEqual([[3]]);
    expect(input).toHaveValue(31);

    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(21);
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

  it('does not publish the same value again on Enter or the following blur', () => {
    const { onChange, input } = renderControlledField();

    typeSequence(input, '12');
    expect(onChange.mock.calls).toEqual([[1], [12]]);

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(input).toHaveValue(12);
  });

  it('does not publish when the entered value equals the saved one', () => {
    const { onChange, input } = renderField(21);

    // A paste of the saved value is a single change event.
    fireEvent.change(input, { target: { value: '21' } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('restores the pre-edit value when Enter is pressed on an invalid entry', () => {
    const { onChange, input } = renderControlledField(21);

    fireEvent.focus(input);
    typeSequence(input, '31');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange.mock.calls).toEqual([[3], [21]]);
    expect(input).toHaveValue(21);
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

  it('falls back to a value updated from outside while focused, not to the value at focus', () => {
    const onChange = jest.fn();
    const field = (value: number) => (
      <BoundedNumberField
        value={value}
        min={1}
        max={30}
        ariaLabel="Analysis window in days"
        testSubj="field"
        onChange={onChange}
      />
    );
    const { rerender } = render(field(21));
    const input = screen.getByTestId('field');

    fireEvent.focus(input);
    // A reload brings in a newer saved value while the field keeps focus.
    rerender(field(14));
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input).toHaveValue(14);
    expect(onChange).not.toHaveBeenCalled();
  });
});
