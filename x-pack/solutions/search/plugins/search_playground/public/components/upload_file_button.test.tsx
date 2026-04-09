/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UploadFileButton } from './upload_file_button';
import { useKibana } from '../hooks/use_kibana';
import { useSourceIndicesFields } from '../hooks/use_source_indices_field';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

// Mock hooks
jest.mock('../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../hooks/use_source_indices_field', () => ({
  useSourceIndicesFields: jest.fn(),
}));

// Wrapper for rendering with IntlProvider
const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <>
      <IntlProvider locale="en">{children}</IntlProvider>
    </>
  );
};

describe('UploadFileButton', () => {
  const mockUiActions = {
    executeTriggerActions: jest.fn(),
  };

  const mockSetSelectedIndices = jest.fn();

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiActions: mockUiActions,
      },
    });

    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      setIndices: mockSetSelectedIndices,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders EuiButtonEmpty when isSetup is true', () => {
    render(<UploadFileButton isSetup={true} />, { wrapper: Wrapper });

    // Check if EuiButtonEmpty is rendered
    const button = screen.getByTestId('uploadFileButtonEmpty');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Upload a file');
  });

  it('calls showFileUploadFlyout when EuiButtonEmpty is clicked', () => {
    render(<UploadFileButton isSetup={true} />, { wrapper: Wrapper });

    // Click the button
    const button = screen.getByTestId('uploadFileButtonEmpty');
    fireEvent.click(button);

    // Check if the flyout trigger was executed
    expect(mockUiActions.executeTriggerActions).toHaveBeenCalledWith(
      'OPEN_FILE_UPLOAD_LITE_TRIGGER',
      expect.anything()
    );
  });

  it('renders EuiButton when isSetup is false', () => {
    render(<UploadFileButton isSetup={false} />, { wrapper: Wrapper });

    // Check if EuiButton is rendered
    const button = screen.getByTestId('uploadFileButton');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Upload file');
  });

  it('calls showFileUploadFlyout when EuiButton is clicked', () => {
    render(<UploadFileButton isSetup={false} />, { wrapper: Wrapper });

    // Click the button
    const button = screen.getByTestId('uploadFileButton');
    fireEvent.click(button);

    // Check if the flyout trigger was executed
    expect(mockUiActions.executeTriggerActions).toHaveBeenCalledWith(
      'OPEN_FILE_UPLOAD_LITE_TRIGGER',
      expect.anything()
    );
  });
});
