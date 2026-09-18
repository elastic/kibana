/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { DatasetsSelector } from './datasets_selector';

describe('DatasetsSelector', () => {
  it('keeps a selected dataset visible even when it is no longer available', () => {
    renderWithKibanaRenderContext(
      <DatasetsSelector
        availableDatasets={['available.dataset']}
        selectedDatasets={['missing.dataset']}
        onChangeDatasetSelection={jest.fn()}
      />
    );

    expect(
      screen.getByTitle('Remove missing.dataset from selection in this group')
    ).toBeInTheDocument();
  });

  it('lets the user remove a selected dataset that is no longer available', async () => {
    const onChangeDatasetSelection = jest.fn();

    renderWithKibanaRenderContext(
      <DatasetsSelector
        availableDatasets={['available.dataset']}
        selectedDatasets={['missing.dataset']}
        onChangeDatasetSelection={onChangeDatasetSelection}
      />
    );

    await userEvent.click(screen.getByTitle('Remove missing.dataset from selection in this group'));

    expect(onChangeDatasetSelection).toHaveBeenCalledWith([]);
  });

  describe('when hasFailedLoading is true', () => {
    it('shows a failure message', () => {
      renderWithKibanaRenderContext(
        <DatasetsSelector
          availableDatasets={[]}
          selectedDatasets={[]}
          onChangeDatasetSelection={jest.fn()}
          hasFailedLoading
        />
      );

      expect(screen.getByText(/Failed to load datasets/i)).toBeInTheDocument();
    });

    it('names the retry control after the action only, not the error sentence', () => {
      renderWithKibanaRenderContext(
        <DatasetsSelector
          availableDatasets={[]}
          selectedDatasets={[]}
          onChangeDatasetSelection={jest.fn()}
          hasFailedLoading
          onRetry={jest.fn()}
        />
      );

      // The accessible name must describe the action; the surrounding message
      // stays outside the control so screen readers do not announce it as one.
      // EuiLink without an href renders a button, hence the button role.
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      expect(screen.getByText(/Failed to load datasets/i)).toBeInTheDocument();
    });

    it('calls onRetry when the retry link is clicked', () => {
      const onRetry = jest.fn();

      renderWithKibanaRenderContext(
        <DatasetsSelector
          availableDatasets={[]}
          selectedDatasets={[]}
          onChangeDatasetSelection={jest.fn()}
          hasFailedLoading
          onRetry={onRetry}
        />
      );

      fireEvent.click(screen.getByTestId('infraDatasetsSelectorRetryLink'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });
});
