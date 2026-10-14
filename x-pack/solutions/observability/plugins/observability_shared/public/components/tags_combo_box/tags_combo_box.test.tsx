/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { TagsComboBox } from './tags_combo_box';

const renderComboBox = (props: Partial<React.ComponentProps<typeof TagsComboBox>> = {}) => {
  const onChange = jest.fn();
  render(
    <EuiThemeProvider>
      <TagsComboBox
        selectedTags={[]}
        onChange={onChange}
        copyButtonDataTestSubj="tagsComboBoxCopyButton"
        {...props}
      />
    </EuiThemeProvider>
  );
  return { onChange };
};

describe('<TagsComboBox />', () => {
  it('splits a pasted comma-separated value into multiple tags', () => {
    const { onChange } = renderComboBox();

    fireEvent.paste(screen.getByTestId('comboBoxSearchInput'), {
      clipboardData: { getData: () => 'tag1, tag2 , tag3' },
    });

    expect(onChange).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
  });

  it('splits a pasted newline-separated value into multiple tags', () => {
    const { onChange } = renderComboBox();

    fireEvent.paste(screen.getByTestId('comboBoxSearchInput'), {
      clipboardData: { getData: () => 'tag1\ntag2\ntag3' },
    });

    expect(onChange).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
  });

  it('splits a typed comma list via onCreateOption and drops case-insensitive duplicates', () => {
    const { onChange } = renderComboBox({ selectedTags: ['tag1'] });

    const input = screen.getByTestId('comboBoxSearchInput');
    fireEvent.change(input, { target: { value: 'TAG1, , tag2' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['tag1', 'tag2']);
  });

  it('disables the copy button when there are no tags', () => {
    renderComboBox({ selectedTags: [] });

    expect(screen.getByTestId('tagsComboBoxCopyButton')).toBeDisabled();
  });

  it('enables the copy button when tags exist', () => {
    renderComboBox({ selectedTags: ['tag1', 'tag2'] });

    expect(screen.getByTestId('tagsComboBoxCopyButton')).toBeEnabled();
  });
});
