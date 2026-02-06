/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MacrosFileUpload } from './macros_file_upload';
import { TestProviders } from '../../../../../../../../common/mock';
import { useParseFileInput } from '../../../../../../../common/hooks/use_parse_file_input';

jest.mock('../../../../../../../common/hooks/use_parse_file_input', () => {
  const { parseContent } = jest.requireActual(
    '../../../../../../../common/hooks/use_parse_file_input'
  );
  return {
    parseContent,
    useParseFileInput: jest.fn(),
  };
});

jest.mock('../../../../../../../common/components/migration_steps', () => ({
  UploadFileButton: ({
    onClick,
    isLoading,
    disabled,
  }: {
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={isLoading || disabled}>
      {'Upload'}
    </button>
  ),
}));

describe('MacrosFileUpload', () => {
  const mockUseParseFileInput = useParseFileInput as jest.Mock;
  const mockParseFile = jest.fn();
  let onFileParsedCallback: (content: string) => void;

  beforeEach(() => {
    mockUseParseFileInput.mockImplementation((onFileParsed: typeof onFileParsedCallback) => {
      onFileParsedCallback = onFileParsed;
      return {
        parseFile: mockParseFile,
        isParsing: false,
        error: null,
      };
    });
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MacrosFileUpload createResources={jest.fn()} />
      </TestProviders>
    );
    expect(getByTestId('macrosFilePicker')).toBeInTheDocument();
    expect(getByTestId('macrosUploadFileButton')).toBeInTheDocument();
  });

  it('handles file selection and upload', async () => {
    const createResources = jest.fn();
    const { getByLabelText, getByText } = render(
      <TestProviders>
        <MacrosFileUpload createResources={createResources} />
      </TestProviders>
    );

    const file = new File(['{"title": "test", "definition": "test"}'], 'macros.json', {
      type: 'application/json',
    });
    const filePicker = getByLabelText('Upload macros file');

    await act(async () => {
      fireEvent.change(filePicker, { target: { files: [file] } });
    });

    expect(mockParseFile).toHaveBeenCalledWith([file]);

    await act(async () => {
      onFileParsedCallback('[{ "result": { "title": "test", "definition": "test" } }]');
    });

    const uploadButton = getByText('Upload');
    expect(uploadButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(uploadButton);
    });

    expect(createResources).toHaveBeenCalledWith([
      {
        type: 'macro',
        name: 'test',
        content: 'test',
      },
    ]);
  });

  it('shows an API error', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MacrosFileUpload createResources={jest.fn()} apiError="test api error" />
      </TestProviders>
    );
    expect(getByTestId('macrosFileUploadError')).toBeInTheDocument();
    expect(getByTestId('macrosFileUploadError')).toHaveTextContent('test api error');
  });

  it('shows a file parsing error', () => {
    mockUseParseFileInput.mockReturnValue({
      parseFile: mockParseFile,
      isParsing: false,
      error: 'test file error',
    });
    const { getByTestId } = render(
      <TestProviders>
        <MacrosFileUpload createResources={jest.fn()} />
      </TestProviders>
    );
    expect(getByTestId('macrosFileUploadError')).toBeInTheDocument();
    expect(getByTestId('macrosFileUploadError')).toHaveTextContent('test file error');
  });
});
