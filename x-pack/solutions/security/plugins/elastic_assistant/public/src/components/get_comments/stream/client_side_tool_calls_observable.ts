/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, from, of, mergeMap, catchError, map } from 'rxjs';
import type { HttpSetup } from '@kbn/core/public';

interface ClientSideToolCall {
  name: string;
  args?: unknown;
  id?: string;
}

interface ClientSideToolCallObservableProps {
  http: HttpSetup;
  connectorId: string;
}

interface ToolCallResult {
  toolCall: ClientSideToolCall;
  metadata?: unknown;
}

/**
 * Creates an Observable that processes a single client-side tool call.
 * When a tool call has name 'add_to_dashboard', it makes an API request to get metadata.
 *
 * @param clientSideToolCall - Single tool call to process
 * @param http - HTTP client for making API requests
 * @param connectorId - The connector ID for the API request
 * @returns Observable that processes the tool call
 */
export const createClientSideToolCallObservable = ({
  clientSideToolCall: payload,
  http,
  connectorId,
}: {
  clientSideToolCall: ClientSideToolCall;
  http: HttpSetup;
  connectorId: string;
}): Observable<ToolCallResult> => {
  const clientSideToolCall = payload?.toolCalls?.[0];

  if (!clientSideToolCall) {
    return of();
  }

  return of(clientSideToolCall).pipe(
    mergeMap((toolCall) => {
      // Process the tool call
      if (toolCall.name === 'add_to_dashboard' && toolCall.id) {
        // Make API request to get metadata
        return from(
          http.fetch(`/internal/elastic_assistant/actions/connector/${connectorId}/metadata`, {
            method: 'GET',
            query: { toolExecutionId: toolCall.id },
            version: '1',
          })
        ).pipe(
          map((metadata) => ({ toolCall, metadata })),
          catchError((error) => {
            // Error handling for metadata fetch
            return of({ toolCall, metadata: undefined });
          })
        );
      }

      // For other tool calls, just return the tool call without metadata
      return of({ toolCall, metadata: undefined });
    })
  );
};
