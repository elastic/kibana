/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { AssetCriticalityFilePickerStep } from './file_picker_step';
import { TestProviders } from '../../../../common/mock';

describe('AssetCriticalityFilePickerStep', () => {
  const mockOnFileChange = jest.fn();
  const mockErrorMessage = 'Sample error message';
  const mockIsLoading = false;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without errors', () => {
    const { queryByTestId } = render(
      <AssetCriticalityFilePickerStep
        onFileChange={mockOnFileChange}
        errorMessage={mockErrorMessage}
        isLoading={mockIsLoading}
      />,
      { wrapper: TestProviders }
    );

    expect(queryByTestId('asset-criticality-file-picker')).toBeInTheDocument();
  });

  it('should call onFileChange when file is selected', () => {
    const { getByTestId } = render(
      <AssetCriticalityFilePickerStep
        onFileChange={mockOnFileChange}
        errorMessage={mockErrorMessage}
        isLoading={mockIsLoading}
      />,
      { wrapper: TestProviders }
    );

    const file = new File(['sample file content'], 'sample.csv', { type: 'text/csv' });
    fireEvent.change(getByTestId('asset-criticality-file-picker'), { target: { files: [file] } });

    expect(mockOnFileChange).toHaveBeenCalledWith([file]);
  });

  it('should display error message when errorMessage prop is provided', () => {
    const { getByText } = render(
      <AssetCriticalityFilePickerStep
        onFileChange={mockOnFileChange}
        errorMessage={mockErrorMessage}
        isLoading={mockIsLoading}
      />,
      { wrapper: TestProviders }
    );

    expect(getByText(mockErrorMessage)).toBeInTheDocument();
  });

  it('should display loading indicator when isLoading prop is true', () => {
    const { container } = render(
      <AssetCriticalityFilePickerStep
        onFileChange={mockOnFileChange}
        errorMessage={mockErrorMessage}
        isLoading={true}
      />,
      { wrapper: TestProviders }
    );

    expect(container.querySelector('.euiProgress')).not.toBeNull();
  });
});
