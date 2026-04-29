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
        isEntityStoreV2Enabled={false}
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
        isEntityStoreV2Enabled={false}
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
        isEntityStoreV2Enabled={false}
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
        isEntityStoreV2Enabled={false}
      />,
      { wrapper: TestProviders }
    );

    expect(container.querySelector('.euiProgress')).not.toBeNull();
  });

  describe('when isEntityStoreV2Enabled is true', () => {
    const renderV2 = () =>
      render(
        <AssetCriticalityFilePickerStep
          onFileChange={mockOnFileChange}
          isLoading={mockIsLoading}
          isEntityStoreV2Enabled={true}
        />,
        { wrapper: TestProviders }
      );

    it('should display the header row description', () => {
      const { getByText } = renderV2();

      expect(
        getByText(/The first row of the file must contain a header/, { exact: false })
      ).toBeInTheDocument();
    });

    it('should display the V2 entity type description with "type" column requirement', () => {
      const { getByText } = renderV2();

      expect(
        getByText(/The header for this column must be "type"/, { exact: false })
      ).toBeInTheDocument();
    });

    it('should display the V2 identifier fields description', () => {
      const { getByText } = renderV2();

      expect(
        getByText(/Entities that match ALL of the identifiers specified in a row will be updated/, {
          exact: false,
        })
      ).toBeInTheDocument();
    });

    it('should display the V2 criticality level description with "criticality_level" column requirement', () => {
      const { getByText } = renderV2();

      expect(
        getByText(/The header for this column must be "criticality_level"/, { exact: false })
      ).toBeInTheDocument();
    });

    it('should display the V2 sample CSV with a header row', () => {
      const { getByText } = renderV2();

      expect(
        getByText(
          /type,user\.email,user\.name,user\.full_name,host\.name,host\.domain,service\.name,criticality_level/,
          { exact: false }
        )
      ).toBeInTheDocument();
    });
  });

  describe('when isEntityStoreV2Enabled is false', () => {
    it('should not display the header row description', () => {
      const { queryByText } = render(
        <AssetCriticalityFilePickerStep
          onFileChange={mockOnFileChange}
          isLoading={mockIsLoading}
          isEntityStoreV2Enabled={false}
        />,
        { wrapper: TestProviders }
      );

      expect(
        queryByText(/The first row of the file must contain a header/, { exact: false })
      ).not.toBeInTheDocument();
    });

    it('should not display the V2 identifier fields description', () => {
      const { queryByText } = render(
        <AssetCriticalityFilePickerStep
          onFileChange={mockOnFileChange}
          isLoading={mockIsLoading}
          isEntityStoreV2Enabled={false}
        />,
        { wrapper: TestProviders }
      );

      expect(
        queryByText(
          /Entities that match ALL of the identifiers specified in a row will be updated/,
          { exact: false }
        )
      ).not.toBeInTheDocument();
    });
  });
});
