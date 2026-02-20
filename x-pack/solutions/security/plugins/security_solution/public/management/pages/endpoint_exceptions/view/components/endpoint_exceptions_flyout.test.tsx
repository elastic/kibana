/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EndpointExceptionsFlyoutProps } from './endpoint_exceptions_flyout';
import { EndpointExceptionsFlyout } from './endpoint_exceptions_flyout';
import { act, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';

import { useFetchIndex } from '../../../../../common/containers/source';
import { useCreateArtifact } from '../../../../hooks/artifacts/use_create_artifact';

import { useToasts } from '../../../../../common/lib/kibana';
import type { AddOrUpdateExceptionItemsFunc } from '../../../../../detection_engine/rule_exceptions/logic/use_close_alerts';
import { useCloseAlertsFromExceptions } from '../../../../../detection_engine/rule_exceptions/logic/use_close_alerts';
import type { AlertData } from '../../../../../detection_engine/rule_exceptions/utils/types';
import type { Rule } from '../../../../../detection_engine/rule_management/logic';
import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/containers/source');
jest.mock('../../../../hooks/artifacts/use_create_artifact');
jest.mock('../../../../../detection_engine/rule_exceptions/logic/use_close_alerts');
jest.mock('../../../../../detections/containers/detection_engine/alerts/use_signal_index');

describe('Endpoint exceptions flyout', () => {
  let mockedContext: AppContextTestRender;
  let render: (
    props?: Partial<EndpointExceptionsFlyoutProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockOnCancel: jest.Mock;
  let mockOnConfirm: jest.Mock;
  let mockMutateAsync: jest.Mock;
  let mockCloseAlerts: jest.MockedFunction<AddOrUpdateExceptionItemsFunc>;
  let alertData: AlertData;

  beforeEach(async () => {
    alertData = {
      _id: 'test-alert-id',
      _index: 'test-index',
      agent: {
        type: 'endpoint',
      },
      file: {
        path: '/path/to/file',
      },
    } as AlertData;

    mockedContext = createAppRootMockRenderer();
    mockOnCancel = jest.fn();
    mockOnConfirm = jest.fn();

    (useToasts as jest.Mock).mockReturnValue({
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    });

    mockMutateAsync = jest.fn().mockImplementation((exception) => exception);
    (useCreateArtifact as jest.Mock).mockImplementation(() => {
      return {
        isLoading: false,
        mutateAsync: mockMutateAsync,
      };
    });

    mockCloseAlerts = jest.fn();
    (useCloseAlertsFromExceptions as jest.Mock).mockImplementation(() => [false, mockCloseAlerts]);

    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: {
          fields: [
            {
              name: 'file.path.caseless',
              searchable: true,
              type: 'string',
              aggregatable: true,
              esTypes: ['keyword'],
              subType: {
                multi: {
                  parent: 'file.path',
                },
              },
            },
          ],
        },
      },
    ]);

    (useSignalIndex as jest.Mock).mockReturnValue({
      loading: false,
      signalIndexExists: true,
      signalIndexName: 'mock-signal-index',
      signalIndexMappingOutdated: false,
      createDeSignalIndex: jest.fn(),
    });

    render = (props) => {
      renderResult = mockedContext.render(
        <EndpointExceptionsFlyout
          rules={null}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
          {...props}
        />
      );
      return renderResult;
    };
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('On initial render', () => {
    it('should render correctly without alert data', () => {
      render();

      expect(renderResult.getByTestId('addEndpointExceptionFlyout')).toBeInTheDocument();
      expect(renderResult.getByTestId('add-endpoint-exception-cancel-button')).toBeInTheDocument();
      expect(renderResult.getByTestId('add-endpoint-exception-confirm-button')).toBeInTheDocument();
    });

    it('should render correctly with alert data', () => {
      act(() => {
        render({ alertData, isAlertDataLoading: false });
      });

      expect(renderResult.getByTestId('addEndpointExceptionFlyout')).toBeInTheDocument();
      expect(renderResult.getByTestId('add-endpoint-exception-cancel-button')).toBeInTheDocument();
      expect(renderResult.getByTestId('add-endpoint-exception-confirm-button')).toBeInTheDocument();
    });

    it('should start with "add endpoint exception" button disabled when loading', () => {
      render({ isAlertDataLoading: true });
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      expect(confirmButton.hasAttribute('disabled')).toBeTruthy();
    });

    it('should start with "add endpoint exception" button disabled when form is not valid', () => {
      render({ isAlertDataLoading: false });
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      expect(confirmButton.hasAttribute('disabled')).toBeTruthy();
    });

    it('should pre-fill the form when alert data is provided', async () => {
      render({ alertData, isAlertDataLoading: false });

      await waitFor(() => {
        expect(renderResult.getByDisplayValue('file.path.caseless')).toBeInTheDocument();
        expect(renderResult.getByDisplayValue('is')).toBeInTheDocument();
        expect(renderResult.getByDisplayValue('/path/to/file')).toBeInTheDocument();
      });
    });

    it('should close when click on cancel button', async () => {
      render();
      const cancelButton = renderResult.getByTestId('add-endpoint-exception-cancel-button');
      expect(mockOnCancel).toHaveBeenCalledTimes(0);

      await userEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).toHaveBeenCalledWith(false);
    });

    it('should show alerts actions section', () => {
      render({ alertData, isAlertDataLoading: false });

      expect(renderResult.getByTestId('closeAlertOnAddExceptionCheckbox')).toBeTruthy();
      expect(renderResult.getByTestId('bulkCloseAlertOnAddExceptionCheckbox')).toBeTruthy();
    });
  });

  describe('When valid form state', () => {
    it('should enable "Add endpoint exception" button when form is valid', async () => {
      render({ alertData, isAlertDataLoading: false });

      await userEvent.type(
        renderResult.getByTestId('endpointExceptions-form-name-input'),
        'Test exception'
      );

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      expect(confirmButton.hasAttribute('disabled')).toBeFalsy();
    });

    it('should disable submit button while saving artifact', async () => {
      (useCreateArtifact as jest.Mock).mockImplementation(() => {
        return { isLoading: true, mutateAsync: jest.fn() };
      });

      render({ alertData, isAlertDataLoading: false });

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      expect(confirmButton.hasAttribute('disabled')).toBeTruthy();
    });

    it('should disable submit button while closing alerts', async () => {
      (useCloseAlertsFromExceptions as jest.Mock).mockImplementation(() => [true, jest.fn()]);

      render({ alertData, isAlertDataLoading: false });
      await userEvent.type(
        renderResult.getByTestId('endpointExceptions-form-name-input'),
        'Test exception'
      );
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');

      await waitFor(() => {
        expect(confirmButton.hasAttribute('disabled')).toBeTruthy();
      });
    });

    it('should call submitData and onConfirm when exception is submitted successfully', async () => {
      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.type(nameInput, 'Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
        expect(useToasts().addSuccess).toHaveBeenCalled();
        expect(mockOnConfirm).toHaveBeenCalledWith(true, false, false);
      });
    });

    it('should save endpoint exception with correct os_types based on alert data', async () => {
      alertData.host = { os: { name: 'Macos' } };

      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.type(nameInput, 'Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ os_types: ['macos'] })
      );
    });

    it('should save endpoint exception with default os_types when no specific os is detected', async () => {
      alertData.host = { os: { name: 'Random OS' } };

      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.type(nameInput, 'Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ os_types: ['windows', 'macos'] })
      );
    });

    it('should show error toast when submission fails', async () => {
      const mockError = new Error('Submission failed');
      mockMutateAsync.mockRejectedValue(mockError);

      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.type(nameInput, 'Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
        expect(useToasts().addError).toHaveBeenCalledWith(mockError, expect.any(Object));
        expect(mockOnConfirm).not.toHaveBeenCalled();
      });
    });

    describe('closing alerts', () => {
      let confirmButton: HTMLElement;

      beforeEach(async () => {
        const rules: Rule[] = [{ rule_id: 'id-1' }, { rule_id: 'id-2' }] as Rule[];

        render({ alertData, isAlertDataLoading: false, alertStatus: 'open', rules });

        const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
        await userEvent.type(nameInput, 'Test exception');

        confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      });

      it('should not call `closeAlerts` when user does not select closing alerts', async () => {
        await userEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockMutateAsync).toHaveBeenCalled();
          expect(mockOnConfirm).toHaveBeenCalledWith(
            true, // didRuleChange
            false, // didCloseAlert
            false // didBulkCloseAlerts
          );
          expect(mockCloseAlerts).not.toHaveBeenCalled();
        });
      });

      it('should call `closeAlerts` when user selects to close current alert', async () => {
        const closeSingleAlertCheckbox = renderResult.getByTestId(
          'closeAlertOnAddExceptionCheckbox'
        );
        await userEvent.click(closeSingleAlertCheckbox);
        await userEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockMutateAsync).toHaveBeenCalled();
          expect(mockOnConfirm).toHaveBeenCalledWith(
            true, // didRuleChange
            true, // didCloseAlert
            false // didBulkCloseAlerts
          );
          expect(mockCloseAlerts).toHaveBeenCalledWith(
            ['id-1', 'id-2'],
            expect.any(Array),
            'test-alert-id', // alertId is defined
            undefined // bulkCloseIndex is undefined
          );
        });
      });

      it('should call `closeAlerts` when user selects to close all similar alerts', async () => {
        const bulkSingleAlertCheckbox = renderResult.getByTestId(
          'bulkCloseAlertOnAddExceptionCheckbox'
        );
        await userEvent.click(bulkSingleAlertCheckbox);
        await userEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockMutateAsync).toHaveBeenCalled();
          expect(mockOnConfirm).toHaveBeenCalledWith(
            true, // didRuleChange
            false, // didCloseAlert
            true // didBulkCloseAlerts
          );
          expect(mockCloseAlerts).toHaveBeenCalledWith(
            ['id-1', 'id-2'],
            expect.any(Array),
            undefined, // alertId is undefined
            ['mock-signal-index'] // bulkCloseIndex is defined
          );
        });
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/253648
  describe.skip('When wildcard warning is active', () => {
    beforeEach(async () => {
      alertData.file!.path = 'lets*contain*wildcards';

      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.type(nameInput, 'Test exception');
    });

    it('pressing confirm should show confirm modal instead of saving exception', async () => {
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(renderResult.getByTestId('endpointExceptionConfirmModal')).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('pressing Cancel on the modal does not save the exception', async () => {
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(renderResult.getByTestId('endpointExceptionConfirmModal')).toBeInTheDocument();

      const cancelButton = renderResult.getByTestId('endpointExceptionConfirmModal-cancelButton');
      await userEvent.click(cancelButton);

      expect(renderResult.getByTestId('addEndpointExceptionFlyout')).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('pressing Submit on the modal saves the exception', async () => {
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(renderResult.getByTestId('endpointExceptionConfirmModal')).toBeInTheDocument();

      const submitButton = renderResult.getByTestId('endpointExceptionConfirmModal-submitButton');
      await userEvent.click(submitButton);

      expect(mockMutateAsync).toHaveBeenCalled();
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });
});
