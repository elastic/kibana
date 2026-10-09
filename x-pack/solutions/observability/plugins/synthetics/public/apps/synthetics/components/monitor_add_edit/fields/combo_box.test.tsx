/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import { FormattedComboBox } from './combo_box';

describe('<FormattedComboBox />', () => {
  const onChange = jest.fn();
  const selectedOptions: string[] = [];

  it('renders ComboBox', () => {
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={selectedOptions} onChange={onChange} />
    );

    expect(getByTestId('syntheticsFleetComboBox')).toBeInTheDocument();
  });

  it('calls onBlur', () => {
    const onBlur = jest.fn();
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={selectedOptions} onChange={onChange} onBlur={onBlur} />
    );

    const combobox = getByTestId('syntheticsFleetComboBox');
    fireEvent.focus(combobox);
    fireEvent.blur(combobox);

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('splits a pasted comma-separated value into multiple tags', () => {
    const onChangeMock = jest.fn();
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={[]} onChange={onChangeMock} />
    );

    const input = getByTestId('comboBoxSearchInput');
    fireEvent.change(input, { target: { value: 'tag1, tag2 , tag3' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChangeMock).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
  });

  it('trims and ignores empty and duplicate tags', () => {
    const onChangeMock = jest.fn();
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={['tag1']} onChange={onChangeMock} />
    );

    const input = getByTestId('comboBoxSearchInput');
    fireEvent.change(input, { target: { value: 'tag1, , tag2' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChangeMock).toHaveBeenCalledWith(['tag1', 'tag2']);
  });

  it('splits a pasted newline-separated value into multiple tags', () => {
    const onChangeMock = jest.fn();
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={[]} onChange={onChangeMock} />
    );

    const input = getByTestId('comboBoxSearchInput');
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'tag1\ntag2\ntag3' },
    });

    expect(onChangeMock).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
  });

  it('does not render the copy button unless enableCopy is set', () => {
    const { queryByTestId } = render(
      <FormattedComboBox selectedOptions={['tag1']} onChange={onChange} />
    );

    expect(queryByTestId('syntheticsFleetComboBoxCopyButton')).not.toBeInTheDocument();
  });

  it('renders an enabled copy button when enableCopy is set and tags exist', () => {
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={['tag1', 'tag2']} onChange={onChange} enableCopy />
    );

    expect(getByTestId('syntheticsFleetComboBoxCopyButton')).toBeEnabled();
  });

  it('disables the copy button when there are no tags to copy', () => {
    const { getByTestId } = render(
      <FormattedComboBox selectedOptions={[]} onChange={onChange} enableCopy />
    );

    expect(getByTestId('syntheticsFleetComboBoxCopyButton')).toBeDisabled();
  });
});
