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
  let deleteScriptMutation: jest.Mock;
  let onSuccessMock: jest.Mock;
  let onCancelMock: jest.Mock;
  let addSuccessToast: jest.Mock;
  let addErrorToast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedContext = createAppRootMockRenderer();
    deleteScriptMutation = jest.fn();
    onSuccessMock = jest.fn();
    onCancelMock = jest.fn();
    addSuccessToast = jest.fn();
    addErrorToast = jest.fn();

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

    expect(getByTestId('test-header')).toHaveTextContent('Delete script?');
    expect(getByTestId('test-body')).toHaveTextContent(
      'Do you really want to delete "Test Script"? This action cannot be undone. The script and all its metadata will be permanently removed from the library.'
    );

    expect(getByTestId('test-cancel-button').textContent).toEqual('Cancel');
    expect(getByTestId('test-delete-button').textContent).toEqual('Delete');
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
