/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor, act } from '@testing-library/react';

import { RuleImportModal } from './rule_import_modal';
import { ReactQueryClientProvider } from '../../../../common/containers/query_client/query_client_provider';
import { importRules } from '../../../rule_management/logic';
import { mockImportResponse } from './test_utils';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: { http: { basePath: { prepend: jest.fn() } } },
  }),
}));

jest.mock('../../../rule_management/logic', () => ({
  importRules: jest.fn(),
}));

const hideImportModal = jest.fn();
const file = new File(['file'], 'rules.json', { type: 'application/x-ndjson' });

const mockedImportRules = importRules as jest.Mock;

describe('RuleImportModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should uncheck the selected checkboxes after importing new file', async () => {
    const { getByTestId } = render(
      <ReactQueryClientProvider>
        <RuleImportModal isImportModalVisible={true} hideImportModal={hideImportModal} />
      </ReactQueryClientProvider>
    );
    const overwriteCheckbox: HTMLInputElement = getByTestId(
      'importDataModalCheckboxLabel'
    ) as HTMLInputElement;
    const exceptionCheckbox: HTMLInputElement = getByTestId(
      'importDataModalExceptionsCheckboxLabel'
    ) as HTMLInputElement;
    const connectorsCheckbox: HTMLInputElement = getByTestId(
      'importDataModalActionConnectorsCheckbox'
    ) as HTMLInputElement;

    await act(() => fireEvent.click(overwriteCheckbox));
    await act(() => fireEvent.click(exceptionCheckbox));
    await act(() => fireEvent.click(connectorsCheckbox));

    await waitFor(() =>
      fireEvent.change(getByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      })
    );
    expect(overwriteCheckbox.checked).toBeTruthy();
    expect(exceptionCheckbox.checked).toBeTruthy();
    expect(connectorsCheckbox.checked).toBeTruthy();

    await waitFor(() => {
      fireEvent.click(getByTestId('import-data-modal-button') as HTMLButtonElement);
    });
    expect(hideImportModal).toHaveBeenCalled();

    expect(overwriteCheckbox.checked).toBeFalsy();
    expect(exceptionCheckbox.checked).toBeFalsy();
    expect(connectorsCheckbox.checked).toBeFalsy();
  });

  test('should uncheck the selected checkboxes after closing the Flyout', async () => {
    const { getByTestId, getAllByRole } = render(
      <ReactQueryClientProvider>
        <RuleImportModal isImportModalVisible={true} hideImportModal={hideImportModal} />
      </ReactQueryClientProvider>
    );

    const closeButton = getAllByRole('button')[0];

    const overwriteCheckbox: HTMLInputElement = getByTestId(
      'importDataModalCheckboxLabel'
    ) as HTMLInputElement;
    const exceptionCheckbox: HTMLInputElement = getByTestId(
      'importDataModalExceptionsCheckboxLabel'
    ) as HTMLInputElement;
    const connectorsCheckbox: HTMLInputElement = getByTestId(
      'importDataModalActionConnectorsCheckbox'
    ) as HTMLInputElement;

    await act(() => fireEvent.click(overwriteCheckbox));
    await act(() => fireEvent.click(exceptionCheckbox));
    await act(() => fireEvent.click(connectorsCheckbox));

    await waitFor(() =>
      fireEvent.change(getByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      })
    );
    expect(overwriteCheckbox.checked).toBeTruthy();
    expect(exceptionCheckbox.checked).toBeTruthy();

    await waitFor(() => {
      fireEvent.click(closeButton as HTMLButtonElement);
    });
    expect(hideImportModal).toHaveBeenCalled();

    expect(overwriteCheckbox.checked).toBeFalsy();
    expect(exceptionCheckbox.checked).toBeFalsy();
    expect(connectorsCheckbox.checked).toBeFalsy();
  });

  test('should import file with warnings', async () => {
    mockedImportRules.mockReturnValue(
      mockImportResponse({
        action_connectors_success_count: 1,
        action_connectors_warnings: [
          {
            message: '1 connector has sensitive information that requires updates.',
            actionPath: 'path',
            buttonLabel: 'buttonLabel',
            type: 'warning',
          },
        ],
      })
    );

    const { getByTestId } = render(
      <ReactQueryClientProvider>
        <RuleImportModal isImportModalVisible={true} hideImportModal={hideImportModal} />
      </ReactQueryClientProvider>
    );

    await waitFor(() => {
      fireEvent.change(getByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      });
    });

    await waitFor(() => {
      fireEvent.click(getByTestId('import-data-modal-button') as HTMLButtonElement);
    });

    expect(getByTestId('actionConnectorsWarningsCallOut')).toBeInTheDocument();
    expect(hideImportModal).not.toHaveBeenCalled();
  });

  test('should import file with warnings but no action_connectors_success_count', async () => {
    mockedImportRules.mockReturnValue(
      mockImportResponse({
        action_connectors_success_count: 0,
        action_connectors_warnings: [
          {
            message: '1 connector has sensitive information that requires updates.',
            actionPath: 'path',
            buttonLabel: 'buttonLabel',
            type: 'warning',
          },
        ],
      })
    );

    const { getByTestId, queryByTestId } = render(
      <ReactQueryClientProvider>
        <RuleImportModal isImportModalVisible={true} hideImportModal={hideImportModal} />
      </ReactQueryClientProvider>
    );

    await waitFor(() => {
      fireEvent.change(getByTestId('rule-file-picker') as HTMLInputElement, {
        target: { files: [file] },
      });
    });

    await waitFor(() => {
      fireEvent.click(getByTestId('import-data-modal-button') as HTMLButtonElement);
    });

    expect(queryByTestId('actionConnectorsWarningsCallOut')).not.toBeInTheDocument();
    expect(hideImportModal).not.toHaveBeenCalled();
  });
});
