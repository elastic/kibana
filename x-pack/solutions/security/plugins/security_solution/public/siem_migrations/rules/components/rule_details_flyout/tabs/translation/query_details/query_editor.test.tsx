/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryEditor } from './query_editor';
import { TestProviders } from '../../../../../../../common/mock';

describe('QueryEditor', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  const setup = () => {
    return render(
      <TestProviders>
        <QueryEditor
          query="initial query"
          ruleName="initial rule name"
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      </TestProviders>
    );
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the initial rule name', () => {
    const { getByTestId } = setup();
    expect(getByTestId('ruleMigrationTranslationRuleName')).toHaveValue('initial rule name');
  });

  it('renders the initial rule query', () => {
    const { getByTestId } = setup();
    expect(getByTestId('ruleEsqlQueryBar')).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const { getByText } = setup();
    fireEvent.click(getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with the updated data when the save button is clicked', async () => {
    const { getByTestId } = setup();
    const ruleNameInput = getByTestId('ruleMigrationTranslationRuleName');
    const saveButton = getByTestId('saveTranslatedRuleBtn');

    fireEvent.change(ruleNameInput, { target: { value: 'updated rule name' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('updated rule name', 'initial query');
    });
  });
});
