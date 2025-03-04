/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { i18n } from '@kbn/i18n';
import type { BaseActionRequestBody } from '../../../../../common/api/endpoint/actions/common/base';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { ActionSuccess } from '../components/action_success';
import { ActionError } from '../components/action_error';
import { FormattedError } from '../../formatted_error';
import { useGetActionDetails } from '../../../hooks/response_actions/use_get_action_details';
import { ACTION_DETAILS_REFRESH_INTERVAL } from '../lib/constants';
import type {
  ActionDetails,
  Immutable,
  ResponseActionApiResponse,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
} from '../../../../../common/endpoint/types';
import type { CommandExecutionComponentProps } from '../../console';

export interface ConsoleActionSubmitter<
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
> {
  /**
   * The ui to be returned to the console. This UI will display different states of the action,
   * including pending, error conditions and generic success messages.
   */
  result: JSX.Element;
  actionDetails: Immutable<ActionDetails<TOutputContent, TParameters>> | undefined;
}

/**
 * Command store state for response action api state.
 */
export interface CommandResponseActionApiState<
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
> {
  actionApiState?: {
    request: {
      sent: boolean;
      actionId: string | undefined;
      error: IHttpFetchError | undefined;
    };
    actionDetails: ActionDetails<TOutputContent, TParameters> | undefined;
    actionDetailsError: IHttpFetchError | undefined;
  };
}

export interface UseConsoleActionSubmitterOptions<
  TReqBody extends BaseActionRequestBody = BaseActionRequestBody,
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
> extends Pick<
    CommandExecutionComponentProps<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
      CommandResponseActionApiState<TOutputContent, TParameters>
    >,
    'ResultComponent' | 'setStore' | 'store' | 'status' | 'setStatus'
  > {
  actionCreator: UseMutationResult<ResponseActionApiResponse, IHttpFetchError, TReqBody>;
  /**
   * The API request body. If `undefined`, then API will not be called.
   */
  actionRequestBody: TReqBody | undefined;

  dataTestSubj?: string;

  /**  */
  pendingMessage?: string;

  successMessage?: string;
}

/**
 * generic hook for use with Response Action commands. It will create the action, store its ID and
 * continuously pull the Action's Details until it completes. It handles all aspects of UI display
 * for the different states of the command (pending -> success/failure)
 *
 * @param actionCreator
 * @param actionRequestBody
 * @param setStatus
 * @param status
 * @param setStore
 * @param store
 * @param ResultComponent
 * @param dataTestSubj
 * @param pendingMessage
 * @param successMessage
 */
export const useConsoleActionSubmitter = <
  TReqBody extends BaseActionRequestBody = BaseActionRequestBody,
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
>({
  actionCreator,
  actionRequestBody,
  setStatus,
  status,
  setStore,
  store,
  ResultComponent,
  dataTestSubj,
  pendingMessage,
  successMessage,
}: UseConsoleActionSubmitterOptions<TReqBody, TOutputContent, TParameters>): ConsoleActionSubmitter<
  TOutputContent,
  TParameters
> => {
  const isMounted = useIsMounted();
  const getTestId = useTestIdGenerator(dataTestSubj);
  const isPending = status === 'pending';

  const currentActionState = useMemo<
    Immutable<
      Required<CommandResponseActionApiState<TOutputContent, TParameters>>['actionApiState']
    >
  >(
    () =>
      store.actionApiState ?? {
        request: {
          sent: false,
          error: undefined,
          actionId: undefined,
        },
        actionDetails: undefined,
        actionDetailsError: undefined,
      },
    [store.actionApiState]
  );

  const { actionDetails, actionDetailsError } = currentActionState;
  const {
    actionId,
    sent: actionRequestSent,
    error: actionRequestError,
  } = currentActionState.request;

  const { data: apiActionDetailsResponse, error: apiActionDetailsError } = useGetActionDetails<
    TOutputContent,
    TParameters
  >(actionId ?? '-', {
    enabled: Boolean(actionId) && isPending,
    refetchInterval: isPending ? ACTION_DETAILS_REFRESH_INTERVAL : false,
  });

  // Create the action request if not yet done
  useEffect(() => {
    if (!actionRequestSent && actionRequestBody && isMounted()) {
      const updatedRequestState: Required<
        CommandResponseActionApiState<TOutputContent, TParameters>
      >['actionApiState']['request'] = {
        ...(
          currentActionState as Required<
            CommandResponseActionApiState<TOutputContent, TParameters>
          >['actionApiState']
        ).request,
        sent: true,
      };

      // The object defined above (`updatedRequestState`) is saved to the command state right away.
      // the creation of the Action request (below) will mutate this object to store the Action ID
      // once the API response is received. We do this to ensure that the action is not created more
      // than once if the user happens to close the console prior to the response being returned.
      // Once a response is received, we check if the component is mounted, and if so, then we send
      // another update to the command store which will cause it to re-render and start checking for
      // action completion.
      actionCreator
        .mutateAsync(actionRequestBody)
        .then((response) => {
          updatedRequestState.actionId = response.data.id;
        })
        .catch((err) => {
          updatedRequestState.error = err;
        })
        .finally(() => {
          // If the component is mounted, then set the store with the updated data (causes a rerender)
          if (isMounted()) {
            setStore((prevState) => {
              return {
                ...prevState,
                actionApiState: {
                  ...(prevState.actionApiState ?? currentActionState),
                  request: { ...updatedRequestState },
                },
              };
            });
          }
        });

      setStore((prevState) => {
        return {
          ...prevState,
          actionApiState: {
            ...(prevState.actionApiState ?? currentActionState),
            request: updatedRequestState,
          },
        };
      });
    }
  }, [
    actionCreator,
    actionRequestBody,
    actionRequestSent,
    currentActionState,
    isMounted,
    setStore,
  ]);

  // If an error was returned while attempting to create the action request,
  // then set command status to error
  useEffect(() => {
    if (actionRequestError && isPending) {
      setStatus('error');
    }
  }, [actionRequestError, isPending, setStatus]);

  // If an error was return by the Action Details API, then store it and set the status to error
  useEffect(() => {
    if (apiActionDetailsError && isPending) {
      setStatus('error');
      setStore((prevState) => {
        return {
          ...prevState,
          actionApiState: {
            ...(prevState.actionApiState ?? currentActionState),
            actionDetails: undefined,
            actionDetailsError: apiActionDetailsError,
          },
        };
      });
    }
  }, [apiActionDetailsError, currentActionState, isPending, setStatus, setStore]);

  // If the action details indicates complete, then update the action's console state and set the status to success
  useEffect(() => {
    if (apiActionDetailsResponse?.data.isCompleted && isPending) {
      setStatus(apiActionDetailsResponse?.data.wasSuccessful ? 'success' : 'error');
      setStore((prevState) => {
        return {
          ...prevState,
          actionApiState: {
            ...(prevState.actionApiState ?? currentActionState),
            actionDetails: apiActionDetailsResponse.data,
          },
          // Unclear why I needed to cast this here. For some reason the `ActionDetails['outputs']` is
          // reporting a type error for the `content` property, although the types seem to line up.
        } as typeof prevState;
      });
    }
  }, [apiActionDetailsResponse, currentActionState, isPending, setStatus, setStore]);

  // Calculate the action's UI result based on the different API responses
  const result = useMemo(() => {
    if (isPending) {
      return (
        <ResultComponent showAs="pending" data-test-subj={getTestId('pending')}>
          {pendingMessage}
        </ResultComponent>
      );
    }

    const apiError = actionRequestError || actionDetailsError;

    if (apiError) {
      return (
        <ResultComponent
          showAs="failure"
          data-test-subj={getTestId('apiFailure')}
          title={
            actionRequestError
              ? i18n.translate(
                  'xpack.securitySolution.useConsoleActionSubmitter.actionRequestFailure',
                  { defaultMessage: 'Failed to create action request.' }
                )
              : undefined
          }
        >
          <FormattedMessage
            id="xpack.securitySolution.endpointResponseActions.actionSubmitter.apiErrorDetails"
            defaultMessage="The following error was encountered:"
          />
          <FormattedError error={apiError} data-test-subj={getTestId('apiErrorDetails')} />
        </ResultComponent>
      );
    }

    if (actionDetails) {
      // Response action failures
      if (actionDetails.errors) {
        return (
          <ActionError
            ResultComponent={ResultComponent}
            action={actionDetails}
            dataTestSubj={getTestId('actionFailure')}
          />
        );
      }

      return (
        <ActionSuccess
          ResultComponent={ResultComponent}
          action={actionDetails}
          data-test-subj={getTestId('success')}
          title={successMessage}
        />
      );
    }

    return <></>;
  }, [
    isPending,
    actionRequestError,
    actionDetailsError,
    actionDetails,
    ResultComponent,
    getTestId,
    pendingMessage,
    successMessage,
  ]);

  return {
    result,
    actionDetails: currentActionState.actionDetails,
  };
};
