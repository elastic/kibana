/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { WatchlistCsvUpload } from './watchlist_csv_upload';
import { TestProviders } from '../../../../common/mock';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiFilePicker: (props: {
      'data-test-subj'?: string;
      onChange: (files: FileList | null) => void;
    }) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockFilePicker'}
        type="file"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onChange(e.target.files)}
      />
    ),
  };
});

const mockUploadWatchlistCsv = jest.fn();

jest.mock('../../../../entity_analytics/api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    uploadWatchlistCsv: mockUploadWatchlistCsv,
  }),
}));

const renderComponent = (watchlistId = 'test-watchlist-id') =>
  render(<WatchlistCsvUpload watchlistId={watchlistId} />, { wrapper: TestProviders });

describe('WatchlistCsvUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should render the file picker', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('watchlist-csv-file-picker')).toBeInTheDocument();
    });

    it('should render the format requirements panel', () => {
      const { getByText } = renderComponent();

      expect(getByText('Supported file formats and size')).toBeInTheDocument();
      expect(getByText('Required file structure')).toBeInTheDocument();
      expect(getByText('Example')).toBeInTheDocument();
    });

    it('should not render the upload button initially', () => {
      const { queryByTestId } = renderComponent();

      expect(queryByTestId('watchlist-csv-upload-button')).not.toBeInTheDocument();
    });
  });

  describe('file validation', () => {
    it('should show error for unsupported file type', async () => {
      const { getByTestId, getByText } = renderComponent();

      const file = new File(['content'], 'test.json', { type: 'application/json' });
      const input = getByTestId('watchlist-csv-file-picker');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(getByText(/Invalid file format/)).toBeInTheDocument();
      });
    });

    it('should show error for empty file', async () => {
      const { getByTestId, getByText } = renderComponent();

      const file = new File([], 'empty.csv', { type: 'text/csv' });
      const input = getByTestId('watchlist-csv-file-picker');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(getByText('The selected file is empty.')).toBeInTheDocument();
      });
    });

    it('should show file info and upload button for a valid file', async () => {
      const { getByTestId, getByText } = renderComponent();

      const csvContent = 'type,user.name\nuser,john.doe\nuser,jane.doe';
      const file = new File([csvContent], 'users.csv', { type: 'text/csv' });
      const input = getByTestId('watchlist-csv-file-picker');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(getByText(/2 rows detected/)).toBeInTheDocument();
        expect(getByText(/type, user.name/)).toBeInTheDocument();
        expect(getByTestId('watchlist-csv-upload-button')).toBeInTheDocument();
      });
    });

    it('should show error when CSV is missing the type header', async () => {
      const { getByTestId, getByText } = renderComponent();

      const csvContent = 'user.name,host.hostname\njohn,server1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = getByTestId('watchlist-csv-file-picker');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(getByText(/missing required column headers/)).toBeInTheDocument();
      });
    });

    it('should show error when CSV has only the type column and no identity columns', async () => {
      const { getByTestId, getByText } = renderComponent();

      const csvContent = 'type\nuser';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const input = getByTestId('watchlist-csv-file-picker');
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(getByText(/at least one identity column/)).toBeInTheDocument();
      });
    });
  });

  describe('upload', () => {
    const validCsv = 'type,user.name\nuser,john.doe';

    it('should call uploadWatchlistCsv on upload', async () => {
      mockUploadWatchlistCsv.mockResolvedValue({
        successful: 1,
        failed: 0,
        total: 1,
        unmatched: 0,
        items: [{ status: 'success', matchedEntities: 1 }],
      });

      const { getByTestId } = renderComponent();

      const file = new File([validCsv], 'users.csv', { type: 'text/csv' });
      fireEvent.change(getByTestId('watchlist-csv-file-picker'), {
        target: { files: [file] },
      });

      await waitFor(() => {
        expect(getByTestId('watchlist-csv-upload-button')).toBeInTheDocument();
      });

      fireEvent.click(getByTestId('watchlist-csv-upload-button'));

      await waitFor(() => {
        expect(mockUploadWatchlistCsv).toHaveBeenCalledWith('test-watchlist-id', expect.any(File));
      });
    });

    it('should show success callout when all rows match', async () => {
      mockUploadWatchlistCsv.mockResolvedValue({
        successful: 2,
        failed: 0,
        total: 2,
        unmatched: 0,
        items: [
          { status: 'success', matchedEntities: 1 },
          { status: 'success', matchedEntities: 1 },
        ],
      });

      const { getByTestId, getByText } = renderComponent();

      const file = new File([validCsv], 'users.csv', { type: 'text/csv' });
      fireEvent.change(getByTestId('watchlist-csv-file-picker'), {
        target: { files: [file] },
      });

      await waitFor(() => {
        expect(getByTestId('watchlist-csv-upload-button')).toBeInTheDocument();
      });

      fireEvent.click(getByTestId('watchlist-csv-upload-button'));

      await waitFor(() => {
        expect(getByText(/2 entities added to the watchlist/)).toBeInTheDocument();
      });
    });

    it('should show warning callout for partial success with unmatched rows', async () => {
      mockUploadWatchlistCsv.mockResolvedValue({
        successful: 1,
        failed: 0,
        total: 3,
        unmatched: 2,
        items: [
          { status: 'success', matchedEntities: 1 },
          { status: 'unmatched', matchedEntities: 0 },
          { status: 'unmatched', matchedEntities: 0 },
        ],
      });

      const { getByTestId, getByText } = renderComponent();

      const file = new File([validCsv], 'users.csv', { type: 'text/csv' });
      fireEvent.change(getByTestId('watchlist-csv-file-picker'), {
        target: { files: [file] },
      });

      await waitFor(() => {
        expect(getByTestId('watchlist-csv-upload-button')).toBeInTheDocument();
      });

      fireEvent.click(getByTestId('watchlist-csv-upload-button'));

      await waitFor(() => {
        expect(getByText(/1 of 3 rows matched/)).toBeInTheDocument();
        expect(getByText(/2 rows had no matching entities/)).toBeInTheDocument();
      });
    });

    it('should show danger callout when all rows fail', async () => {
      mockUploadWatchlistCsv.mockResolvedValue({
        successful: 0,
        failed: 2,
        total: 2,
        unmatched: 0,
        items: [
          { status: 'failure', matchedEntities: 0, error: 'invalid type' },
          { status: 'failure', matchedEntities: 0, error: 'invalid type' },
        ],
      });

      const { getByTestId, getByText } = renderComponent();

      const file = new File([validCsv], 'users.csv', { type: 'text/csv' });
      fireEvent.change(getByTestId('watchlist-csv-file-picker'), {
        target: { files: [file] },
      });

      await waitFor(() => {
        expect(getByTestId('watchlist-csv-upload-button')).toBeInTheDocument();
      });

      fireEvent.click(getByTestId('watchlist-csv-upload-button'));

      await waitFor(() => {
        expect(getByText(/No entities were added to the watchlist/)).toBeInTheDocument();
      });
    });

    it('should show error when upload fails with a network error', async () => {
      mockUploadWatchlistCsv.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = renderComponent();

      const file = new File([validCsv], 'users.csv', { type: 'text/csv' });
      fireEvent.change(getByTestId('watchlist-csv-file-picker'), {
        target: { files: [file] },
      });

      await waitFor(() => {
        expect(getByTestId('watchlist-csv-upload-button')).toBeInTheDocument();
      });

      fireEvent.click(getByTestId('watchlist-csv-upload-button'));

      await waitFor(() => {
        expect(getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should reset to file picker when "Upload another file" is clicked', async () => {
      mockUploadWatchlistCsv.mockResolvedValue({
        successful: 1,
        failed: 0,
        total: 1,
        unmatched: 0,
        items: [{ status: 'success', matchedEntities: 1 }],
      });

      const { getByTestId } = renderComponent();

      const file = new File([validCsv], 'users.csv', { type: 'text/csv' });
      fireEvent.change(getByTestId('watchlist-csv-file-picker'), {
        target: { files: [file] },
      });

      await waitFor(() => {
        expect(getByTestId('watchlist-csv-upload-button')).toBeInTheDocument();
      });

      fireEvent.click(getByTestId('watchlist-csv-upload-button'));

      await waitFor(() => {
        expect(getByTestId('watchlist-csv-upload-another')).toBeInTheDocument();
      });

      fireEvent.click(getByTestId('watchlist-csv-upload-another'));

      await waitFor(() => {
        expect(getByTestId('watchlist-csv-file-picker')).toBeInTheDocument();
      });
    });
  });
});
