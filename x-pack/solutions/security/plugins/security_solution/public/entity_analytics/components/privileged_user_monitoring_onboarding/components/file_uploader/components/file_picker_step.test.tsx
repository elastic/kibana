/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { PrivilegedUserMonitoringFilePickerStep } from './file_picker_step';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';

describe('PrivilegedUserMonitoringFilePickerStep', () => {
  const mockOnFileChange = jest.fn();
  const mockErrorMessage = 'Sample error message';
  const mockIsLoading = false;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without errors', () => {
    const { queryByTestId } = render(
      <PrivilegedUserMonitoringFilePickerStep
        onFileChange={mockOnFileChange}
        errorMessage={mockErrorMessage}
        isLoading={mockIsLoading}
      />,
      { wrapper: TestProviders }
    );

    expect(queryByTestId('privileged-user-monitoring-file-picker')).toBeInTheDocument();
  });

  it('should call onFileChange when file is selected', () => {
    const { getByTestId } = render(
      <PrivilegedUserMonitoringFilePickerStep
        onFileChange={mockOnFileChange}
        errorMessage={mockErrorMessage}
        isLoading={mockIsLoading}
      />,
      { wrapper: TestProviders }
    );

    const file = new File(['sample file content'], 'sample.csv', { type: 'text/csv' });
    fireEvent.change(getByTestId('privileged-user-monitoring-file-picker'), {
      target: { files: [file] },
    });

    expect(mockOnFileChange).toHaveBeenCalledWith([file]);
  });

  it('should display error message when errorMessage prop is provided', () => {
    const { getByText } = render(
      <PrivilegedUserMonitoringFilePickerStep
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
      <PrivilegedUserMonitoringFilePickerStep
        onFileChange={mockOnFileChange}
        errorMessage={mockErrorMessage}
        isLoading={true}
      />,
      { wrapper: TestProviders }
    );

    expect(container.querySelector('.euiProgress')).not.toBeNull();
  });
});
