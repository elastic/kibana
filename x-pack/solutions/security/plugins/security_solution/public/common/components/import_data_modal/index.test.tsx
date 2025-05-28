/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { ImportDataModalComponent } from '.';

jest.mock('../../lib/kibana');

jest.mock('../../lib/kibana/kibana_react', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: { http: { basePath: { prepend: jest.fn() } } },
  }),
}));
jest.mock('../../hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
  }),
}));

describe('ImportDataModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly against snapshot', () => {
    const { queryByText } = render(
      <ImportDataModalComponent
        isModalVisible={true}
        closeModal={jest.fn()}
        title="Import Modal Title"
        description="Import Modal Description"
        filePickerPrompt="Please select a file"
        submitBtnText="Import Button"
        errorMessage={jest.fn()}
        importData={jest.fn()}
        onImportComplete={jest.fn()}
      />
    );

    expect(queryByText('Import Modal Title')).toBeVisible();
    expect(queryByText('Import Modal Description')).toBeVisible();
    expect(queryByText('Please select a file')).toBeVisible();
    expect(queryByText('Import Button')).toBeVisible();
  });

  test('should import file and invoke a callback on completion', async () => {
    const importData = jest.fn().mockReturnValue({ success: true, errors: [] });
    const importComplete = jest.fn();

    const { queryByTestId } = render(
      <ImportDataModalComponent
        isModalVisible={true}
        closeModal={jest.fn()}
        title="Import Modal Title"
        description="Import Modal Description"
        filePickerPrompt="Please select a file"
        submitBtnText="Import Button"
        errorMessage={jest.fn()}
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
