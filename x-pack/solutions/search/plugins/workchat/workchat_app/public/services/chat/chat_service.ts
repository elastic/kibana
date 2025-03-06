/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer } from 'rxjs';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { HttpSetup } from '@kbn/core/public';
import { ChatEvent } from '../../../common/chat_events';

interface ConverseParams {
  conversationId?: string;
  agentId: string;
  nextMessage: string;
}

export class ChatService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async converse({ nextMessage, conversationId, agentId }: ConverseParams) {
    return (
      defer(() => {
        return this.http.post('/internal/workchat/chat', {
          asResponse: true,
          rawResponse: true,
          body: JSON.stringify({ nextMessage, conversationId, agentId }),
        });
      })
        // @ts-ignore SseEvent mixin issue
        .pipe(httpResponseIntoObservable<ChatEvent>())
    );
  }
}
