/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { ImportDataModalComponent } from '.';

vi.mock('../../lib/kibana');

vi.mock('../../lib/kibana/kibana_react', () => {
  const mocked = {
    useKibana: vi.fn().mockReturnValue({
      services: { http: { basePath: { prepend: vi.fn() } } },
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../hooks/use_app_toasts', () => {
  const mocked = {
    useAppToasts: vi.fn().mockReturnValue({
      addError: vi.fn(),
      addSuccess: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

describe('ImportDataModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders correctly against snapshot', () => {
    const { queryByText } = render(
      <ImportDataModalComponent
        isModalVisible={true}
        closeModal={vi.fn()}
        title="Import Modal Title"
        description="Import Modal Description"
        filePickerPrompt="Please select a file"
        submitBtnText="Import Button"
        errorMessage={vi.fn()}
        importData={vi.fn()}
        onImportComplete={vi.fn()}
      />
    );

    expect(queryByText('Import Modal Title')).toBeVisible();
    expect(queryByText('Import Modal Description')).toBeVisible();
    expect(queryByText('Please select a file')).toBeVisible();
    expect(queryByText('Import Button')).toBeVisible();
  });

  test('should import file and invoke a callback on completion', async () => {
    const importData = vi.fn().mockReturnValue({ success: true, errors: [] });
    const importComplete = vi.fn();

    const { queryByTestId } = render(
      <ImportDataModalComponent
        isModalVisible={true}
        closeModal={vi.fn()}
        title="Import Modal Title"
        description="Import Modal Description"
        filePickerPrompt="Please select a file"
        submitBtnText="Import Button"
        errorMessage={vi.fn()}
        importData={importData}
        onImportComplete={importComplete}
      />
    );

    await waitFor(() => {
      fireEvent.change(queryByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [new File(['file'], 'image1.png', { type: 'image/png' })] },
      });
    });

    await waitFor(() => {
      fireEvent.click(queryByTestId('import-data-modal-button') as HTMLButtonElement);
    });

    expect(importData).toHaveBeenCalled();
    expect(importComplete).toHaveBeenCalled();
  });
});
