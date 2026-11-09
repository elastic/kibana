/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssetCriticalityFileUploader } from './asset_criticality_file_uploader';
import type { OnCompleteParams } from './types';

const mockUploadAssetCriticalityFile = jest.fn();

jest.mock('../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    uploadAssetCriticalityFile: mockUploadAssetCriticalityFile,
  }),
}));

jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({ services: { telemetry: { reportEvent: jest.fn() } } }),
}));

jest.mock('./hooks', () => ({
  // Validation completes synchronously with a one-line valid file.
  useFileValidation:
    ({ onComplete }: { onComplete: (params: OnCompleteParams) => void }) =>
    () =>
      onComplete({
        validatedFile: {
          name: 'criticality.csv',
          size: 10,
          validLines: { text: 'host,web-01,high_impact', count: 1 },
          invalidLines: { text: '', count: 0, errors: [] },
        },
        processingStartTime: '2026-01-01T00:00:00.000Z',
        processingEndTime: '2026-01-01T00:00:00.001Z',
        tookMs: 1,
      }),
  useNavigationSteps: () => [],
}));

jest.mock('./components/file_picker_step', () => ({
  AssetCriticalityFilePickerStep: ({
    onFileChange,
  }: {
    onFileChange: (fileList: FileList | null) => void;
  }) => (
    <button
      type="button"
      data-test-subj="mock-pick-file"
      onClick={() =>
        onFileChange({ item: () => new File([''], 'criticality.csv') } as unknown as FileList)
      }
    />
  ),
}));

jest.mock('./components/validation_step', () => ({
  AssetCriticalityValidationStep: ({ onConfirm }: { onConfirm: () => void }) => (
    <button type="button" data-test-subj="mock-confirm-upload" onClick={onConfirm} />
  ),
}));

jest.mock('./components/result_step', () => ({
  AssetCriticalityResultStep: () => <div data-test-subj="mock-result-step" />,
}));

describe('AssetCriticalityFileUploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadAssetCriticalityFile.mockResolvedValue({ errors: [], stats: {} });
  });

  it('tags the bulk upload with the asset-criticality execution context', async () => {
    render(<AssetCriticalityFileUploader />);

    fireEvent.click(screen.getByTestId('mock-pick-file'));
    fireEvent.click(await screen.findByTestId('mock-confirm-upload'));

    await waitFor(() => expect(mockUploadAssetCriticalityFile).toHaveBeenCalledTimes(1));

    expect(mockUploadAssetCriticalityFile).toHaveBeenCalledWith(
      'host,web-01,high_impact',
      'criticality.csv',
      {
        child: {
          type: 'security_solution',
          name: 'entity_analytics:asset_criticality',
          id: 'asset_criticality_bulk_upload',
        },
      }
    );
  });
});
