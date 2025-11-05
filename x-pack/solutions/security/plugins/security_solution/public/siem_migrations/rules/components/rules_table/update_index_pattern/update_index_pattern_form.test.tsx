/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { UpdateIndexPatternForm } from './update_index_pattern_form';
import { TestProviders } from '../../../../../common/mock/test_providers';

describe('UpdateIndexPatternForm', () => {
  it('renders the form', () => {
    const { getByTestId } = render(
      <TestProviders>
        <UpdateIndexPatternForm onClose={() => {}} onSubmit={() => {}} />
      </TestProviders>
    );

    expect(getByTestId('updateIndexPatternIndexPatterns')).toBeInTheDocument();
  });

  it('disables the save button initially', () => {
    const { getByTestId } = render(
      <TestProviders>
        <UpdateIndexPatternForm onClose={() => {}} onSubmit={() => {}} />
      </TestProviders>
    );

    expect(getByTestId('indexPatternPlaceholderFormSaveBtn')).toBeDisabled();
  });

  it('calls onClose when the cancel button is clicked', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <UpdateIndexPatternForm onClose={onClose} onSubmit={() => {}} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('indexPatternPlaceholderFormCancelBtn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('enables save and calls onSubmit when an index is selected and save is clicked', async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = render(
      <TestProviders>
        <UpdateIndexPatternForm onClose={() => {}} onSubmit={onSubmit} />
      </TestProviders>
    );

    const comboBox = getByTestId('updateIndexPatternIndexPatterns');
    const input = comboBox.querySelector('input');
    if (input) {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'logs-*' } });
    }

    fireEvent.click(getByText('logs-*'));

    await waitFor(() => {
      expect(getByTestId('indexPatternPlaceholderFormSaveBtn')).not.toBeDisabled();
    });

    fireEvent.click(getByTestId('indexPatternPlaceholderFormSaveBtn'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('logs-*');
    });
  });
});
