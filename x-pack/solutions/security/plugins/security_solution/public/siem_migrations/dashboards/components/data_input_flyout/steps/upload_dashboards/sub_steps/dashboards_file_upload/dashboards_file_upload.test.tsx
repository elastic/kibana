/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { DashboardsFileUpload } from './dashboards_file_upload';
import { TestProviders } from '../../../../../../../../common/mock';
import { useParseFileInput } from '../../../../../../../common/hooks/use_parse_file_input';

vi.mock('../../../../../../../common/hooks/use_parse_file_input', async () => {
  const { parseContent } = await vi.importActual(
    '../../../../../../../common/hooks/use_parse_file_input'
  );
  return {
    parseContent,
    useParseFileInput: vi.fn(),
  };
});

vi.mock('../../../../../../../common/components/migration_steps', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

describe('DashboardsFileUpload', () => {
  const mockUseParseFileInput = useParseFileInput as Mock;
  const mockParseFile = vi.fn();
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    createMigration: vi.fn(),
    isLoading: false,
    isCreated: false,
    migrationName: 'test-migration',
    apiError: undefined,
    onMigrationCreated: vi.fn(),
  };

  it('renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardsFileUpload {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('dashboardsFilePicker')).toBeInTheDocument();
    expect(getByTestId('dashboardsUploadFileButton')).toBeInTheDocument();
  });

  it('handles file selection and upload', async () => {
    const createMigration = vi.fn();
    const { getByLabelText, getByText } = render(
      <TestProviders>
        <DashboardsFileUpload {...defaultProps} createMigration={createMigration} />
      </TestProviders>
    );

    const file = new File(['{"result": {}}'], 'dashboards.json', {
      type: 'application/json',
    });
    const filePicker = getByLabelText('Upload dashboards file');

    await act(async () => {
      fireEvent.change(filePicker, { target: { files: [file] } });
    });

    expect(mockParseFile).toHaveBeenCalledWith([file]);

    await act(async () => {
      onFileParsedCallback('[{ "result": {} }]');
    });

    const uploadButton = getByText('Upload');
    expect(uploadButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(uploadButton);
    });

    expect(createMigration).toHaveBeenCalledWith('test-migration', [
      {
        result: {},
      },
    ]);
  });

  it('shows an API error', () => {
    const { getByText } = render(
      <TestProviders>
        <DashboardsFileUpload {...defaultProps} apiError="test api error" />
      </TestProviders>
    );
    expect(getByText('test api error')).toBeInTheDocument();
  });

  it('shows a file parsing error', () => {
    mockUseParseFileInput.mockReturnValue({
      parseFile: mockParseFile,
      isParsing: false,
      error: 'test file error',
    });
    const { getByText } = render(
      <TestProviders>
        <DashboardsFileUpload {...defaultProps} />
      </TestProviders>
    );
    expect(getByText('test file error')).toBeInTheDocument();
  });
});
