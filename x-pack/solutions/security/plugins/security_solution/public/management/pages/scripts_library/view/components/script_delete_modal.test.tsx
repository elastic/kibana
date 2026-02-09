/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../common/mock/endpoint';
import { useToasts } from '../../../../../common/lib/kibana';
import { EndpointScriptDeleteModal } from './script_delete_modal';
import { useDeleteEndpointScript } from '../../../../hooks/script_library';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../hooks/script_library/use_delete_script_by_id');

const useToastsMock = useToasts as jest.Mock;

describe('EndpointScriptDeleteModal', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let defaultProps: React.ComponentProps<typeof EndpointScriptDeleteModal>;
  const deleteScriptMutation = jest.fn();
  const onSuccessMock = jest.fn();
  const onCancelMock = jest.fn();
  const addSuccessToast = jest.fn();
  const addErrorToast = jest.fn();

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    jest.clearAllMocks();

    (useToastsMock as jest.Mock).mockReturnValue({
      addDanger: jest.fn(),
      addSuccess: addSuccessToast,
      addError: addErrorToast,
    });

    (useDeleteEndpointScript as jest.Mock).mockImplementation(({ onSuccess, onError }) => ({
      mutateAsync: jest.fn(async (params) => {
        try {
          const result = await deleteScriptMutation(params);
          onSuccess(result);
        } catch (error) {
          onError(error);
        }
      }),
      isLoading: false,
    }));

    defaultProps = {
      scriptId: 'script-1',
      scriptName: 'Test Script',
      onCancel: onCancelMock,
      onSuccess: onSuccessMock,
      'data-test-subj': 'test',
    };

    render = (props?: React.ComponentProps<typeof EndpointScriptDeleteModal>) => {
      renderResult = mockedContext.render(
        <EndpointScriptDeleteModal {...(props ?? defaultProps)} />
      );
      return renderResult;
    };
  });

  it('should render correctly', () => {
    render();
    const { getByTestId } = renderResult;

    const header = getByTestId('test-header');
    expect(header.textContent).toEqual('Delete script?');

    const body = getByTestId('test-body');
    expect(body.textContent).toEqual(
      'Do you really want to delete "Test Script"? This action cannot be undone. The script and all its metadata will be permanently removed from the library.'
    );

    const cancelButton = getByTestId('test-cancel-button');
    expect(cancelButton.textContent).toEqual('Cancel');
    const deleteButton = getByTestId('test-delete-button');
    expect(deleteButton.textContent).toEqual('Delete');
  });

  it('should cancel deletion', () => {
    render();
    const { getByTestId } = renderResult;

    act(() => {
      fireEvent.click(getByTestId('test-cancel-button'));
    });

    expect(onCancelMock).toHaveBeenCalled();
  });

  it('should call onSuccess callback and show success toast on successful deletion', async () => {
    deleteScriptMutation.mockResolvedValue(null);
    render();
    const { getByTestId } = renderResult;

    await act(async () => {
      fireEvent.click(getByTestId('test-delete-button'));
    });

    await waitFor(() => {
      expect(deleteScriptMutation).toHaveBeenCalledWith({ script_id: 'script-1' });
      expect(addSuccessToast).toHaveBeenCalledWith('Script deleted successfully');
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  it('should call onError callback and show error toast on failed deletion', async () => {
    const error = { message: 'failed to delete!', response: { status: 500 } };
    deleteScriptMutation.mockRejectedValue(error);

    render();
    const { getByTestId } = renderResult;

    await act(async () => {
      fireEvent.click(getByTestId('test-delete-button'));
    });

    await waitFor(() => {
      expect(deleteScriptMutation).toHaveBeenCalledWith({ script_id: 'script-1' });
      expect(addErrorToast).toHaveBeenCalledWith(error, {
        title: 'Failed to delete script',
        toastMessage: 'failed to delete!',
      });
    });
  });
});
