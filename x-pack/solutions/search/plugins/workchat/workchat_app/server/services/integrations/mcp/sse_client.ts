/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventSource, type ErrorEvent, type EventSourceInit } from 'eventsource';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport';
import { JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types';

/*
 * Taken from https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/client/sse.ts
 *
 * TODO: remove this once figured out how to import the auth package
 */

export class SseError extends Error {
  constructor(
    public readonly code: number | undefined,
    message: string | undefined,
    public readonly event: ErrorEvent
  ) {
    super(`SSE error: ${message}`);
  }
}

/**
 * Configuration options for the `SSEClientTransport`.
 */
export interface SSEClientTransportOptions {
  /**
   * Customizes the initial SSE request to the server (the request that begins the stream).
   *
   * NOTE: Setting this property will prevent an `Authorization` header from
   * being automatically attached to the SSE request, if an `authProvider` is
   * also given. This can be worked around by setting the `Authorization` header
   * manually.
   */
  eventSourceInit?: EventSourceInit;

  /**
   * Customizes recurring POST requests to the server.
   */
  requestInit?: RequestInit;
}

/**
 * Client transport for SSE: this will connect to a server using Server-Sent Events for receiving
 * messages and make separate POST requests for sending messages.
 */
export class SSEClientTransport implements Transport {
  private _eventSource?: EventSource;
  private _endpoint?: URL;
  private _abortController?: AbortController;
  private _url: URL;
  private _eventSourceInit?: EventSourceInit;
  private _requestInit?: RequestInit;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(url: URL, opts?: SSEClientTransportOptions) {
    this._url = url;
    this._eventSourceInit = opts?.eventSourceInit;
    this._requestInit = opts?.requestInit;
  }

  private async _commonHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {};

    return headers;
  }

  private _startOrAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._eventSource = new EventSource(
        this._url.href,
        this._eventSourceInit ?? {
          fetch: (url, init) =>
            this._commonHeaders().then((headers) =>
              fetch(url, {
                ...init,
                headers: {
                  ...headers,
                  Accept: 'text/event-stream',
                },
              })
            ),
        }
      );
      this._abortController = new AbortController();

      this._eventSource.onerror = (event) => {
        const error = new SseError(event.code, event.message, event);
        reject(error);
        this.onerror?.(error);
      };

      this._eventSource.onopen = () => {
        // The connection is open, but we need to wait for the endpoint to be received.
      };

      this._eventSource.addEventListener('endpoint', (event: Event) => {
        const messageEvent = event as MessageEvent;

        try {
          this._endpoint = new URL(messageEvent.data, this._url);
          if (this._endpoint.origin !== this._url.origin) {
            throw new Error(
              `Endpoint origin does not match connection origin: ${this._endpoint.origin}`
            );
          }
        } catch (error) {
          reject(error);
          this.onerror?.(error as Error);

          void this.close();
          return;
        }

        resolve();
      });

      this._eventSource.onmessage = (event: Event) => {
        const messageEvent = event as MessageEvent;
        let message: JSONRPCMessage;
        try {
          message = JSONRPCMessageSchema.parse(JSON.parse(messageEvent.data));
        } catch (error) {
          this.onerror?.(error as Error);
          return;
        }

        this.onmessage?.(message);
      };
    });
  }

  async start() {
    if (this._eventSource) {
      throw new Error(
        'SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.'
      );
    }

    return await this._startOrAuth();
  }

  async close(): Promise<void> {
    this._abortController?.abort();
    this._eventSource?.close();
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._endpoint) {
      throw new Error('Not connected');
    }

    try {
      const commonHeaders = await this._commonHeaders();
      const headers = new Headers({ ...commonHeaders, ...this._requestInit?.headers });
      headers.set('content-type', 'application/json');
      const init = {
        ...this._requestInit,
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: this._abortController?.signal,
      };

      const response = await fetch(this._endpoint, init);
      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(`Error POSTing to endpoint (HTTP ${response.status}): ${text}`);
      }
    } catch (error) {
      this.onerror?.(error as Error);
      throw error;
    }
  }
}
