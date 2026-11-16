/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { TextValueInput } from './text_value_input';

const onAdd = jest.fn();

const renderInput = (isDisabled = false) =>
  render(
    <TextValueInput
      onAdd={onAdd}
      maxLength={8}
      placeholder="Text in the URL"
      isDisabled={isDisabled}
      ebtElement="test"
      data-test-subj="text"
    />,
    { wrapper: EuiProvider }
  );

const write = (text: string) =>
  fireEvent.change(screen.getByTestId('textInput'), { target: { value: text } });

beforeEach(() => jest.clearAllMocks());

describe('TextValueInput', () => {
  it('adds the trimmed text with the button, and empties the field', () => {
    renderInput();

    write('  /cart  ');
    fireEvent.click(screen.getByTestId('textAdd'));

    expect(onAdd).toHaveBeenCalledWith('/cart');
    expect(screen.getByTestId('textInput')).toHaveValue('');
  });

  it('adds the text with Enter, which submits the field', () => {
    renderInput();

    write('/cart');
    fireEvent.submit(screen.getByTestId('textInput'));

    expect(onAdd).toHaveBeenCalledWith('/cart');
  });

  it('adds nothing for text of only spaces, and the button waits for text', () => {
    renderInput();
    expect(screen.getByTestId('textAdd')).toBeDisabled();

    write('   ');
    fireEvent.submit(screen.getByTestId('textInput'));

    expect(screen.getByTestId('textAdd')).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('takes no more text than the filter accepts', () => {
    renderInput();

    expect(screen.getByTestId('textInput')).toHaveAttribute('maxlength', '8');
  });

  it('adds nothing when disabled, e.g. because the filter has all the values it takes', () => {
    renderInput(true);

    expect(screen.getByTestId('textInput')).toBeDisabled();
    expect(screen.getByTestId('textAdd')).toBeDisabled();
  });
});
