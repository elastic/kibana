/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import React from 'react';
import type { EndpointExceptionsFlyoutProps } from './endpoint_exceptions_flyout';
import { EndpointExceptionsFlyout } from './endpoint_exceptions_flyout';
import { cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';

import { useFetchIndex } from '../../../../../common/containers/source';
import {
  useCreateOrUpdateArtifact,
  type CreateOrUpdateArtifactsFunction,
} from '../../../../components/artifact_list_page/hooks/use_artifact_update_or_create';

import { useToasts } from '../../../../../common/lib/kibana';
import type { AddOrUpdateExceptionItemsFunc } from '../../../../../detection_engine/rule_exceptions/logic/use_close_alerts';
import { useCloseAlertsFromExceptions } from '../../../../../detection_engine/rule_exceptions/logic/use_close_alerts';
import type { AlertData } from '../../../../../detection_engine/rule_exceptions/utils/types';
import type { Rule } from '../../../../../detection_engine/rule_management/logic';
import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useAlertsPrivileges } from '../../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useGetEndpointExceptionsPerPolicyOptIn } from '../../../../hooks/artifacts/use_endpoint_per_policy_opt_in';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { licenseService } from '../../../../../common/hooks/use_license';

vi.mock('../../../../../common/lib/kibana');
vi.mock('../../../../../common/containers/source');
vi.mock('../../../../components/artifact_list_page/hooks/use_artifact_update_or_create');
vi.mock('../../../../../detection_engine/rule_exceptions/logic/use_close_alerts');
vi.mock('../../../../../detections/containers/detection_engine/alerts/use_signal_index');
vi.mock('../../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
vi.mock('../../../../hooks/artifacts/use_endpoint_per_policy_opt_in');
vi.mock('../../../../../common/components/user_privileges');
vi.mock('../../../../../common/hooks/use_license');

describe('Endpoint exceptions flyout', () => {
  vi.setConfig({ testTimeout: 10000 });

  let mockedContext: AppContextTestRender;
  let render: (
    props?: Partial<EndpointExceptionsFlyoutProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let mockOnCancel: Mock;
  let mockOnConfirm: Mock;
  let mockCreateOrUpdateArtifact: MockedFunction<CreateOrUpdateArtifactsFunction>;
  let mockCloseAlerts: MockedFunction<AddOrUpdateExceptionItemsFunc>;
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
    mockOnCancel = vi.fn();
    mockOnConfirm = vi.fn();

    (useToasts as Mock).mockReturnValue({
      addSuccess: vi.fn(),
      addError: vi.fn(),
      addWarning: vi.fn(),
      remove: vi.fn(),
    });

    mockCreateOrUpdateArtifact = vi.fn().mockImplementation((exception) => [exception]);
    (useCreateOrUpdateArtifact as Mock).mockImplementation(() => {
      return {
        isLoading: false,
        createOrUpdateArtifact: mockCreateOrUpdateArtifact,
      };
    });

    mockCloseAlerts = vi.fn();
    (useCloseAlertsFromExceptions as Mock).mockImplementation(() => [false, mockCloseAlerts]);

    (useFetchIndex as Mock).mockImplementation(() => [
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

    (useSignalIndex as Mock).mockReturnValue({
      loading: false,
      signalIndexExists: true,
      signalIndexName: 'mock-signal-index',
      signalIndexMappingOutdated: false,
      createDeSignalIndex: vi.fn(),
    });

    (useAlertsPrivileges as Mock).mockReturnValue({
      hasAlertsUpdate: true,
    });

    (useUserPrivileges as Mock).mockReturnValue({
      endpointPrivileges: { canManageGlobalArtifacts: true },
    });

    (useGetEndpointExceptionsPerPolicyOptIn as Mock).mockReturnValue({
      data: { status: true },
    });

    (licenseService as Mocked<typeof licenseService>).isPlatinumPlus.mockReturnValue(true);

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
    vi.clearAllMocks();
  });

  describe('On initial render', () => {
    it('should render correctly without alert data', () => {
      render();

      expect(renderResult.getByTestId('addEndpointExceptionFlyout')).toBeInTheDocument();
      expect(renderResult.getByTestId('add-endpoint-exception-cancel-button')).toBeInTheDocument();
      expect(renderResult.getByTestId('add-endpoint-exception-confirm-button')).toBeInTheDocument();
    });

    it('should render correctly with alert data', async () => {
      render({ alertData, isAlertDataLoading: false });

      await waitFor(() => {
        expect(renderResult.getByTestId('addEndpointExceptionFlyout')).toBeInTheDocument();
        expect(
          renderResult.getByTestId('add-endpoint-exception-cancel-button')
        ).toBeInTheDocument();
        expect(
          renderResult.getByTestId('add-endpoint-exception-confirm-button')
        ).toBeInTheDocument();
      });
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

    it('should default to global artifact when user has global artifact management privileges', async () => {
      (useUserPrivileges as Mock).mockReturnValue({
        endpointPrivileges: { canManageGlobalArtifacts: true },
      });

      render({ alertData, isAlertDataLoading: false });

      await waitFor(() => {
        const globalButton = renderResult.getByTestId(
          'endpointExceptions-form-effectedPolicies-global'
        );
        expect(globalButton).toBeEnabled();
        expect(globalButton).toHaveAttribute('aria-pressed', 'true');

        const perPolicyButton = renderResult.getByTestId(
          'endpointExceptions-form-effectedPolicies-perPolicy'
        );
        expect(perPolicyButton).toBeEnabled();
        expect(perPolicyButton).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('should default to per-policy artifact when user does not have global artifact management privileges', async () => {
      (useUserPrivileges as Mock).mockReturnValue({
        endpointPrivileges: { canManageGlobalArtifacts: false },
      });

      render({ alertData, isAlertDataLoading: false });

      await waitFor(() => {
        const globalButton = renderResult.getByTestId(
          'endpointExceptions-form-effectedPolicies-global'
        );
        expect(globalButton).not.toBeEnabled();
        expect(globalButton).toHaveAttribute('aria-pressed', 'false');

        const perPolicyButton = renderResult.getByTestId(
          'endpointExceptions-form-effectedPolicies-perPolicy'
        );
        expect(perPolicyButton).toBeEnabled();
        expect(perPolicyButton).toHaveAttribute('aria-pressed', 'true');
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

      await userEvent.clear(renderResult.getByTestId('endpointExceptions-form-name-input'));
      await userEvent.paste('Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      expect(confirmButton.hasAttribute('disabled')).toBeFalsy();
    });

    it('should disable submit button while saving artifact', async () => {
      (useCreateOrUpdateArtifact as Mock).mockImplementation(() => {
        return { isLoading: true, mutateAsync: vi.fn() };
      });

      render({ alertData, isAlertDataLoading: false });

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      expect(confirmButton.hasAttribute('disabled')).toBeTruthy();
    });

    it('should disable submit button while closing alerts', async () => {
      (useCloseAlertsFromExceptions as Mock).mockImplementation(() => [true, vi.fn()]);

      render({ alertData, isAlertDataLoading: false });
      await userEvent.clear(renderResult.getByTestId('endpointExceptions-form-name-input'));
      await userEvent.paste('Test exception');
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');

      await waitFor(() => {
        expect(confirmButton.hasAttribute('disabled')).toBeTruthy();
      });
    });

    it('should call createOrUpdateArtifact and onConfirm when exception is submitted successfully', async () => {
      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.clear(nameInput);
      await userEvent.paste('Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCreateOrUpdateArtifact).toHaveBeenCalled();
        expect(useToasts().addSuccess).toHaveBeenCalled();
        expect(mockOnConfirm).toHaveBeenCalledWith(true, false, false);
      });
    });

    it('should save endpoint exception with correct os_types based on alert data', async () => {
      alertData.host = { os: { name: 'Macos' } };

      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.clear(nameInput);
      await userEvent.paste('Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(mockCreateOrUpdateArtifact).toHaveBeenCalledWith(
        expect.objectContaining({ os_types: ['macos'] }),
        undefined
      );
    });

    it('should save endpoint exception with default os_types when no specific os is detected', async () => {
      alertData.host = { os: { name: 'Random OS' } };

      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.clear(nameInput);
      await userEvent.paste('Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(mockCreateOrUpdateArtifact).toHaveBeenCalledWith(
        expect.objectContaining({ os_types: ['windows', 'macos'] }),
        undefined
      );
    });

    it('should show error toast when submission fails', async () => {
      const mockError = new Error('Submission failed');
      mockCreateOrUpdateArtifact.mockRejectedValue(mockError);

      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.clear(nameInput);
      await userEvent.paste('Test exception');

      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCreateOrUpdateArtifact).toHaveBeenCalled();
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
        await userEvent.clear(nameInput);
        await userEvent.paste('Test exception');

        confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      });

      it('should not call `closeAlerts` when user does not select closing alerts', async () => {
        await userEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockCreateOrUpdateArtifact).toHaveBeenCalled();
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
          expect(mockCreateOrUpdateArtifact).toHaveBeenCalled();
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
          expect(mockCreateOrUpdateArtifact).toHaveBeenCalled();
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

  describe('When wildcard warning is active', () => {
    beforeEach(async () => {
      alertData.file!.path = 'lets*contain*wildcards';

      render({ alertData, isAlertDataLoading: false });

      const nameInput = renderResult.getByTestId('endpointExceptions-form-name-input');
      await userEvent.clear(nameInput);
      await userEvent.paste('Test exception');
    });

    it('pressing confirm should show confirm modal instead of saving exception', async () => {
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(renderResult.getByTestId('endpointExceptionConfirmModal')).toBeInTheDocument();
      expect(mockCreateOrUpdateArtifact).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('pressing Cancel on the modal does not save the exception', async () => {
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(renderResult.getByTestId('endpointExceptionConfirmModal')).toBeInTheDocument();

      const cancelButton = renderResult.getByTestId('endpointExceptionConfirmModal-cancelButton');
      await userEvent.click(cancelButton);

      expect(renderResult.getByTestId('addEndpointExceptionFlyout')).toBeInTheDocument();
      expect(mockCreateOrUpdateArtifact).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('pressing Submit on the modal saves the exception', async () => {
      const confirmButton = renderResult.getByTestId('add-endpoint-exception-confirm-button');
      await userEvent.click(confirmButton);

      expect(renderResult.getByTestId('endpointExceptionConfirmModal')).toBeInTheDocument();

      const submitButton = renderResult.getByTestId('endpointExceptionConfirmModal-submitButton');
      await userEvent.click(submitButton);

      expect(mockCreateOrUpdateArtifact).toHaveBeenCalled();
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });
});
