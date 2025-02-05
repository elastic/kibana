/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ControlledComboboxInput, ControlledDefaultInput } from '.';
import {
  convertComboboxValuesToStringArray,
  convertValuesToComboboxValueArray,
} from './controlled_combobox_input';
import { getDefaultValue } from './controlled_default_input';

const onChangeCallbackMock = jest.fn();

const renderControlledComboboxInput = (badOverrideValue?: string) =>
  render(
    <ControlledComboboxInput
      value={badOverrideValue || ['test']}
      onChangeCallback={onChangeCallbackMock}
    />
  );

const renderControlledDefaultInput = (badOverrideValue?: string[]) =>
  render(
    <ControlledDefaultInput
      value={badOverrideValue || 'test'}
      onChangeCallback={onChangeCallbackMock}
    />
  );

describe('ControlledComboboxInput', () => {
  afterEach(jest.clearAllMocks);

  it('renders the current value', () => {
    renderControlledComboboxInput();
    expect(screen.getByText('test'));
  });

  it('calls onChangeCallback, and disabledButtonCallback when value is removed', async () => {
    renderControlledComboboxInput();
    const removeButton = screen.getByTestId('is-one-of-combobox-input').querySelector('button');

    await userEvent.click(removeButton as HTMLButtonElement);
    expect(onChangeCallbackMock).toHaveBeenLastCalledWith([]);
  });

  it('handles non arrays by defaulting to an empty state', () => {
    renderControlledComboboxInput('nonArray');

    expect(onChangeCallbackMock).toHaveBeenLastCalledWith([]);
  });
});

describe('ControlledDefaultInput', () => {
  afterEach(jest.clearAllMocks);

  it('renders the current value', () => {
    renderControlledDefaultInput();
    expect(screen.getByDisplayValue('test'));
  });

  it('calls onChangeCallback, and disabledButtonCallback when value is changed', async () => {
    renderControlledDefaultInput([]);
    const inputBox = screen.getByPlaceholderText('value');

    await userEvent.type(inputBox, 'new value');

    expect(onChangeCallbackMock).toHaveBeenLastCalledWith('new value');
  });

  it('handles arrays by defaulting to the first value', () => {
    renderControlledDefaultInput(['testing']);

    expect(onChangeCallbackMock).toHaveBeenLastCalledWith('testing');
  });

  describe('getDefaultValue', () => {
    it('Returns a provided value if the value is a string', () => {
      expect(getDefaultValue('test')).toBe('test');
    });

    it('Returns a provided value if the value is a number', () => {
      expect(getDefaultValue(0)).toBe(0);
    });

    it('Returns the first value of a string array', () => {
      expect(getDefaultValue(['a', 'b'])).toBe('a');
    });

    it('Returns the first value of a number array', () => {
      expect(getDefaultValue([0, 1])).toBe(0);
    });

    it('Returns an empty string if given an empty array', () => {
      expect(getDefaultValue([])).toBe('');
    });
  });

  describe('convertValuesToComboboxValueArray', () => {
    it('returns an empty array if not provided correct input', () => {
      expect(convertValuesToComboboxValueArray('test')).toEqual([]);
      expect(convertValuesToComboboxValueArray(1)).toEqual([]);
    });

    it('returns an empty array if provided non array input', () => {
      expect(convertValuesToComboboxValueArray('test')).toEqual([]);
      expect(convertValuesToComboboxValueArray(1)).toEqual([]);
    });

    it('Returns a comboboxoption array when provided the correct input', () => {
      expect(convertValuesToComboboxValueArray(['a', 'b'])).toEqual([
        { label: 'a' },
        { label: 'b' },
      ]);
      expect(convertValuesToComboboxValueArray([1, 2])).toEqual([{ label: '1' }, { label: '2' }]);
    });
  });

  describe('convertComboboxValuesToStringArray', () => {
    it('correctly converts combobox values to a string array ', () => {
      expect(convertComboboxValuesToStringArray([])).toEqual([]);
      expect(convertComboboxValuesToStringArray([{ label: '1' }, { label: '2' }])).toEqual([
        '1',
        '2',
      ]);
    });
  });
});
