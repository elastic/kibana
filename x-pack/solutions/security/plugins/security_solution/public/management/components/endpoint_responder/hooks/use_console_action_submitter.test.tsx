/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UseConsoleActionSubmitterOptions,
  ConsoleActionSubmitter,
  CommandResponseActionApiState,
} from './use_console_action_submitter';
import { useConsoleActionSubmitter } from './use_console_action_submitter';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import React, { useState } from 'react';
import type { CommandExecutionResultProps } from '../../console';
import type { DeferredInterface } from '../../../mocks/utils';
import { getDeferred } from '../../../mocks/utils';
import type { ActionDetails } from '../../../../../common/endpoint/types';
import { act, waitFor } from '@testing-library/react';
import { responseActionsHttpMocks } from '../../../mocks/response_actions_http_mocks';

describe('When using `useConsoleActionSubmitter()` hook', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderArgs: UseConsoleActionSubmitterOptions;
  let updateHookRenderArgs: () => void;
  let hookRenderResultStorage: jest.Mock<(args: ConsoleActionSubmitter) => void>;
  let releaseSuccessActionRequestApiResponse: DeferredInterface['resolve'];
  let releaseFailedActionRequestApiResponse: DeferredInterface['reject'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let actionGenerator: EndpointActionGenerator;
  let createdActionDetails: ActionDetails;

  const ActionSubmitterTestComponent = () => {
    const [hookOptions, setHookOptions] = useState(renderArgs);

    updateHookRenderArgs = () => {
      new Promise((r) => {
        setTimeout(r, 1);
      }).then(() => {
        setHookOptions({
          ...renderArgs,
        });
      });
    };

    const { result, actionDetails } = useConsoleActionSubmitter(hookOptions);

    hookRenderResultStorage({ result, actionDetails });

    return <div data-test-subj="testContainer">{result}</div>;
  };

  const getOutputTextContent = (): string => {
    return renderResult.getByTestId('testContainer').textContent ?? '';
  };

  beforeEach(() => {
    const { render: renderComponent, coreStart } = createAppRootMockRenderer();
    const deferred = getDeferred<ActionDetails>();

    actionGenerator = new EndpointActionGenerator('test');
    createdActionDetails = actionGenerator.generateActionDetails({ id: '123' });
    apiMocks = responseActionsHttpMocks(coreStart.http);

    hookRenderResultStorage = jest.fn();
    releaseSuccessActionRequestApiResponse = () => deferred.resolve(createdActionDetails);
    releaseFailedActionRequestApiResponse = deferred.reject;

    let status: UseConsoleActionSubmitterOptions['status'] = 'pending';
    let commandStore: CommandResponseActionApiState = {};

    renderArgs = {
      dataTestSubj: 'test',
      actionRequestBody: {
        endpoint_ids: ['123'],
      },
      actionCreator: {
        mutateAsync: jest.fn(async () => {
          return {
            data: await deferred.promise,
          };
        }),
      } as unknown as UseConsoleActionSubmitterOptions['actionCreator'],
      get status() {
        return status;
      },
      setStatus: jest.fn((newStatus) => {
        status = newStatus;
        updateHookRenderArgs();
      }),
      get store() {
        return commandStore;
      },
      setStore: jest.fn((newStoreOrCallback: object | ((prevStore: object) => object)) => {
        if (typeof newStoreOrCallback === 'function') {
          commandStore = newStoreOrCallback(commandStore);
        } else {
          commandStore = newStoreOrCallback;
        }

        updateHookRenderArgs();
      }),
      ResultComponent: jest.fn(
        ({ children, showAs, 'data-test-subj': dataTestSubj }: CommandExecutionResultProps) => {
          return (
            <div data-show-as={showAs} data-test-subj={dataTestSubj}>
              {children}
            </div>
          );
        }
      ),
    };

    render = () => {
      renderResult = renderComponent(<ActionSubmitterTestComponent />);
      return renderResult;
    };
  });

  afterEach(() => {
    renderResult.unmount();
  });

  it('should return expected interface while its still pending', () => {
    render();

    expect(hookRenderResultStorage).toHaveBeenLastCalledWith({
      result: expect.anything(),
      actionDetails: undefined,
    });

    expect(renderResult.getByTestId('test-pending')).not.toBeNull();
  });

  it('should update command state when request is sent', () => {
    render();

    expect(renderArgs.store?.actionApiState?.request.sent).toBe(true);
    expect(renderArgs.store?.actionApiState?.request.actionId).toBe(undefined);
  });

  it('should set status to `creating` and show the creating message while the action request is being created', async () => {
    render();

    await waitFor(() => {
      expect(renderArgs.setStatus).toHaveBeenCalledWith('creating');
    });

    expect(renderResult.getByTestId('test-creating')).not.toBeNull();
    expect(getOutputTextContent()).toEqual(
      'Creating action (do not close the console until this step is completed)...'
    );
  });

  it('should transition status from `creating` to `pending` once the action request has been created', async () => {
    render();

    await waitFor(() => {
      expect(renderArgs.setStatus).toHaveBeenCalledWith('creating');
    });

    releaseSuccessActionRequestApiResponse();

    await waitFor(() => {
      expect(renderArgs.setStatus).toHaveBeenCalledWith('pending');
    });
  });

  it('should set status to `error` if creating the action request fails', async () => {
    render();
    const error = new Error('oh oh. request failed');

    await waitFor(() => {
      expect(renderArgs.setStatus).toHaveBeenCalledWith('creating');
    });

    act(() => {
      releaseFailedActionRequestApiResponse(error);
    });

    await waitFor(() => {
      expect(renderArgs.setStatus).toHaveBeenCalledWith('error');
    });
  });

  it('should store the action id when action request api is successful', async () => {
    render();

    releaseSuccessActionRequestApiResponse();

    await waitFor(() => {
      expect(renderArgs.store?.actionApiState?.request.actionId).toBe('123');
    });
  });

  it('should store the action details returned by the action request api', async () => {
    render();

    releaseSuccessActionRequestApiResponse();

    await waitFor(() => {
      expect(renderArgs.store?.actionApiState?.actionDetails).toEqual(createdActionDetails);
    });
  });

  it('should store action request api error', async () => {
    render();
    const error = new Error('oh oh. request failed');

    act(() => {
      releaseFailedActionRequestApiResponse(error);
    });

    await waitFor(() => {
      expect(renderArgs.store?.actionApiState?.request.actionId).toBe(undefined);
      expect(renderArgs.store?.actionApiState?.request.error).toBe(error);
    });

    await waitFor(() => {
      expect(getOutputTextContent()).toEqual(
        'The following error was encountered:oh oh. request failed'
      );
    });
  });

  it('should still store the action id if component is unmounted while action request API is in flight', async () => {
    render();
    renderResult.unmount();

    expect(renderArgs.store.actionApiState?.request.sent).toBe(true);

    const requestState = renderArgs.store.actionApiState?.request;
    releaseSuccessActionRequestApiResponse();

    await waitFor(() => {
      // this check just ensure that we mutated the state when the api returned success instead of
      // dispatching a `setStore()`.
      expect(renderArgs.store.actionApiState?.request === requestState).toBe(true);

      expect(renderArgs.store.actionApiState?.request.actionId).toEqual('123');
    });
  });

  it('should call action details api once we have an action id', async () => {
    render();

    expect(apiMocks.responseProvider.actionDetails).not.toHaveBeenCalled();

    releaseSuccessActionRequestApiResponse();

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledWith({
        path: '/api/endpoint/action/123',
        version: '2023-10-31',
      });
    });
  });

  it('should continue to show pending action results until action completes', async () => {
    const pendingActionDetails = actionGenerator.generateActionDetails({
      id: '123',
      isCompleted: false,
      wasSuccessful: false,
      agentState: { 'agent-a': { isCompleted: false, wasSuccessful: false } },
    });
    apiMocks.responseProvider.actionDetails.mockReturnValue({ data: pendingActionDetails });
    render();
    releaseSuccessActionRequestApiResponse();

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledWith({
        path: '/api/endpoint/action/123',
        version: '2023-10-31',
      });
    });

    await waitFor(() => {
      expect(renderArgs.store.actionApiState?.actionDetails).toBe(pendingActionDetails);
    });

    expect(renderArgs.status).toBe('pending');
    expect(renderResult.getByTestId('test-pending')).toHaveAttribute('data-show-as', 'pending');
    expect(renderResult.getByTestId('test-actionResult-hostStatus').textContent).toEqual(
      'isolate is pending'
    );
    expect(hookRenderResultStorage).toHaveBeenLastCalledWith({
      result: expect.anything(),
      actionDetails: pendingActionDetails,
    });
  });

  it('should store action details api error', async () => {
    const error = new Error('on oh. getting action details failed');
    apiMocks.responseProvider.actionDetails.mockImplementation(() => {
      throw error;
    });

    render();
    releaseSuccessActionRequestApiResponse();

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledWith({
        path: '/api/endpoint/action/123',
        version: '2023-10-31',
      });
    });

    await waitFor(() => {
      expect(renderArgs.store.actionApiState?.actionDetailsError).toBe(error);
    });

    expect(renderArgs.setStatus).toHaveBeenLastCalledWith('error');
    expect(renderArgs.store.actionApiState?.actionDetails).toBeUndefined();
    expect(renderResult.getByTestId('test-pending')).toHaveAttribute('data-show-as', 'pending');
    expect(renderResult.getByTestId('test-pending').textContent).toEqual(
      'Unable to check on status of submitted action:on oh. getting action details failed'
    );
    expect(renderResult.queryByTestId('test-apiFailure')).toBeNull();
  });

  it('should store action details and show success once action completes', async () => {
    const actionDetails = actionGenerator.generateActionDetails({ id: '123' });
    apiMocks.responseProvider.actionDetails.mockReturnValue({ data: actionDetails });

    render();
    releaseSuccessActionRequestApiResponse();

    await waitFor(() => {
      expect(renderArgs.store.actionApiState?.actionDetails).toBe(actionDetails);
    });

    await waitFor(() => {
      expect(renderResult.getByTestId('test-success')).toHaveAttribute('data-show-as', 'success');
    });

    expect(renderArgs.setStatus).toHaveBeenLastCalledWith('success');
    expect(renderResult.getByTestId('test-actionResult-hostStatus').textContent).toEqual(
      'isolate completed successfully'
    );
    expect(hookRenderResultStorage).toHaveBeenLastCalledWith({
      result: expect.anything(),
      actionDetails,
    });
  });

  it.each`
    title                      | overrides                                        | expectedShowAs | expectedHostStatus
    ${'failed with errors'}    | ${{ errors: ['oh no'], agentErrors: ['oh no'] }} | ${'failure'}   | ${'isolate failed'}
    ${'failed without errors'} | ${{}}                                            | ${'failure'}   | ${'isolate failed'}
    ${'was canceled'}          | ${{ wasCanceled: true }}                         | ${'canceled'}  | ${'isolate was canceled'}
  `(
    'should show failure when action completes and $title',
    async ({
      overrides: { errors, agentErrors, wasCanceled = false },
      expectedShowAs,
      expectedHostStatus,
    }) => {
      const actionDetails = actionGenerator.generateActionDetails({
        id: '123',
        wasSuccessful: false,
        wasCanceled,
        errors,
        agentState: {
          'agent-a': { wasSuccessful: false, wasCanceled, errors: agentErrors },
        },
      });
      apiMocks.responseProvider.actionDetails.mockReturnValue({ data: actionDetails });

      render();
      releaseSuccessActionRequestApiResponse();

      await waitFor(() => {
        expect(renderResult.getByTestId('test-actionFailure')).toHaveAttribute(
          'data-show-as',
          expectedShowAs
        );
      });

      expect(renderArgs.setStatus).toHaveBeenLastCalledWith('error');
      expect(renderResult.getByTestId('test-actionResult-hostStatus').textContent).toEqual(
        expectedHostStatus
      );
      expect(renderResult.queryByTestId('test-success')).toBeNull();
    }
  );
});
