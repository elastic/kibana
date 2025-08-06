/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Subscription } from 'rxjs';
import type { HttpSetup } from '@kbn/core/public';
import { clientSideTools } from '@kbn/elastic-assistant/impl/assistant/registered_ai_client_tools';
import { getPlaceholderObservable, getStreamObservable } from './stream_observable';

interface ClientSideToolCall {
  name: string;
  args?: unknown;
  id?: string;
}

interface UseStreamProps {
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
  isError: boolean;
  content?: string;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  http?: HttpSetup;
  connectorId?: string;
}
interface UseStream {
  // The error message, if an error occurs during streaming.
  error: string | undefined;
  // Indicates whether the streaming is in progress or not
  isLoading: boolean;
  // Indicates whether the streaming is in progress and there is a pending message.
  isStreaming: boolean;
  // The pending message from the streaming data.
  pendingMessage: string;
  //  A function to mark the streaming as complete, with a parameter to indicate if the streaming was aborted.
  setComplete: (args: { complete: boolean; didAbort: boolean }) => void;
}

const fetchToolCallMetadata = async ({
  toolCallId,
  connectorId,
  http,
}: {
  toolCallId: string;
  connectorId: string;
  http: HttpSetup;
}) => {
  const response = await http.fetch(
    `/internal/elastic_assistant/actions/connector/${connectorId}/metadata`,
    {
      method: 'GET',
      query: { toolExecutionId: toolCallId },
      version: '1',
    }
  );
  return response;
};
/**
 * A hook that takes a ReadableStreamDefaultReader and returns an object with properties and functions
 * that can be used to handle streaming data from a readable stream
 * @param content - the content of the message. If provided, the function will not use the reader to stream data.
 * @param refetchCurrentConversation - refetch the current conversation
 * @param isError - indicates whether the reader response is an error message or not
 * @param reader - The readable stream reader used to stream data. If provided, the function will use this reader to stream data.
 * @param http - HTTP client for making API requests
 * @param connectorId - The connector ID for API requests
 */
export const useStream = ({
  content,
  isError,
  reader,
  refetchCurrentConversation,
  http,
  connectorId,
}: UseStreamProps): UseStream => {
  const [pendingMessage, setPendingMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [subscription, setSubscription] = useState<Subscription | undefined>();
  const [toolCallsSubscription, setToolCallsSubscription] = useState<Subscription | undefined>();
  const [clientSideToolCalls, setClientSideToolCalls] = useState<ClientSideToolCall | undefined>();
  const [pendingToolCalls, setPendingToolCalls] = useState<ClientSideToolCall[]>([]);
  const [toolCallsToProcess, setToolCallsToProcess] = useState<ClientSideToolCall[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function processToolCalls() {
      // Find tools with postAction
      for (const toolCall of toolCallsToProcess) {
        const toolDetails = clientSideTools.find((tool) => tool.name === toolCall.name);
        if (toolDetails) return;

        if (toolDetails.getPostToolClientActions) {
          const metadata = await fetchToolCallMetadata({
            toolCallId: toolCall.id,
            connectorId,
            http,
          });

          const args = metadata.result;
          // const postToolClientActions = await toolDetails.getPostToolClientActions({dashboardApi: dashboard});

          // for (const action of postToolClientActions) {
          //   await action({ args, signal: controller.signal });
          // }
        }
      }
    }

    processToolCalls();
  }, [toolCallsToProcess, connectorId, http]);

  const observer$ = useMemo(
    () =>
      content == null && reader != null
        ? getStreamObservable({ reader, setLoading, isError })
        : getPlaceholderObservable(),
    [content, isError, reader]
  );

  const onCompleteStream = useCallback(
    (didAbort: boolean) => {
      subscription?.unsubscribe();
      toolCallsSubscription?.unsubscribe();
      setLoading(false);
      // Process pending tool calls when stream completes
      if (pendingToolCalls.length > 0) {
        setToolCallsToProcess(pendingToolCalls);
      }

      if (!didAbort) {
        refetchCurrentConversation({ isStreamRefetch: true });
      }
    },
    [refetchCurrentConversation, subscription, toolCallsSubscription, pendingToolCalls]
  );

  const [complete, setComplete] = useState<{ complete: boolean; didAbort: boolean }>({
    complete: false,
    didAbort: false,
  });

  useEffect(() => {
    if (complete.complete) {
      onCompleteStream(complete.didAbort);
      setComplete({ complete: false, didAbort: false });
    }
  }, [complete, onCompleteStream]);

  useEffect(() => {
    const newSubscription = observer$.subscribe({
      next: ({ message, loading: isLoading, clientSideToolCalls: incomingToolCalls }) => {
        setLoading(isLoading);
        setPendingMessage(message);

        if (incomingToolCalls && incomingToolCalls.length > 0) {
          setPendingToolCalls(incomingToolCalls.map((toolCall) => toolCall.toolCalls[0]));
        }
      },
      complete: () => {
        setComplete({ complete: true, didAbort: false });
      },
      error: (err) => {
        if (err.name === 'AbortError') {
          // the fetch was canceled, we don't need to do anything about it
        } else {
          setError(err.message);
        }
      },
    });
    setSubscription(newSubscription);
  }, [observer$]);

  return {
    error,
    isLoading: loading,
    isStreaming: loading && pendingMessage != null,
    pendingMessage: pendingMessage ?? '',
    setComplete,
  };
};
