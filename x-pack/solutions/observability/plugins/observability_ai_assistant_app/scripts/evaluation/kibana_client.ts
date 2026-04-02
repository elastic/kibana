/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSupportedConnectorType } from '@kbn/inference-common';
import type {
  BufferFlushEvent,
  ChatCompletionChunkEvent,
  ChatCompletionErrorEvent,
  ConversationCreateEvent,
  FunctionDefinition,
  MessageAddEvent,
  StreamingChatResponseEvent,
} from '@kbn/observability-ai-assistant-plugin/common';
import {
  ChatCompletionErrorCode,
  concatenateChatCompletionChunks,
  isChatCompletionError,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common';
import type { ObservabilityAIAssistantScreenContext } from '@kbn/observability-ai-assistant-plugin/common/types';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { throwSerializedChatCompletionErrors } from '@kbn/observability-ai-assistant-plugin/common/utils/throw_serialized_chat_completion_errors';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { streamIntoObservable } from '@kbn/observability-ai-assistant-plugin/server';
import type { ToolingLog } from '@kbn/tooling-log';
import { omit, pick, remove } from 'lodash';
import pRetry from 'p-retry';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import type { OperatorFunction, Observable } from 'rxjs';
import {
  concatMap,
  defer,
  filter,
  from,
  lastValueFrom,
  of,
  retry,
  switchMap,
  timer,
  toArray,
  catchError,
  throwError,
} from 'rxjs';
import type { UrlObject } from 'url';
import { format, parse } from 'url';
import { inspect } from 'util';
import type { ObservabilityAIAssistantAPIClientRequestParamsOf } from '@kbn/observability-ai-assistant-plugin/public';
import type { EvaluationResult } from './types';

// eslint-disable-next-line spaced-comment
/// <reference types="@kbn/ambient-ftr-types"/>

type InnerMessage = Message['message'];
type StringOrMessageList = string | InnerMessage[];

interface Options {
  screenContexts?: ObservabilityAIAssistantScreenContext[];
}

interface CompleteFunctionParams {
  messages: StringOrMessageList;
  conversationId?: string;
  options?: Options;
  scope?: AssistantScope;
}

type CompleteFunction = (params: CompleteFunctionParams) => Promise<{
  conversationId?: string;
  messages: InnerMessage[];
  errors: ChatCompletionErrorEvent[];
}>;

interface FetchResponseError extends Error {
  status?: number;
  responseData?: unknown;
}

function isFetchError(error: unknown): error is FetchResponseError {
  return error instanceof Error && 'status' in error;
}

export interface ChatClient {
  chat: (message: StringOrMessageList, system: string) => Promise<InnerMessage>;
  complete: CompleteFunction;
  evaluate: (
    {}: { conversationId?: string; messages: InnerMessage[]; errors: ChatCompletionErrorEvent[] },
    criteria: string[]
  ) => Promise<EvaluationResult>;
  getResults: () => EvaluationResult[];
  onResult: (cb: (result: EvaluationResult) => void) => () => void;
  getConnectorId: () => string;
}

export class KibanaClient {
  private readonly defaultHeaders: Record<string, string>;

  constructor(
    private readonly log: ToolingLog,
    private readonly url: string,
    private readonly spaceId?: string
  ) {
    this.defaultHeaders = {
      'kbn-xsrf': 'foo',
      'x-elastic-internal-origin': 'kibana',
      'Content-Type': 'application/json',
    };
  }

  private getUrl(props: { query?: UrlObject['query']; pathname: string; ignoreSpaceId?: boolean }) {
    const parsed = parse(this.url);

    const baseUrl = parsed.pathname?.replaceAll('/', '') ?? '';

    const url = format({
      ...parsed,
      pathname: `/${[
        ...(baseUrl ? [baseUrl] : []),
        ...(props.ignoreSpaceId || !this.spaceId ? [] : ['s', this.spaceId]),
        props.pathname.startsWith('/') ? props.pathname.substring(1) : props.pathname,
      ].join('/')}`,
      query: props.query,
    });

    return url;
  }

  async callKibana<T>(
    method: string,
    props: { query?: UrlObject['query']; pathname: string; ignoreSpaceId?: boolean },
    data?: any,
    fetchParams: { headers?: Record<string, string> } = {}
  ): Promise<{ status: number; data: T; headers: Record<string, string> }> {
    const url = this.getUrl(props);
    const body =
      method.toLowerCase() === 'delete' && !data ? undefined : JSON.stringify(data || {});

    const resp = await fetch(url, {
      method,
      headers: {
        ...this.defaultHeaders,
        ...fetchParams.headers,
      },
      body,
    });

    if (!resp.ok) {
      const respBody = await resp.text().catch(() => '');
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(respBody);
      } catch {
        parsedBody = respBody;
      }

      const error: FetchResponseError = new Error(`Request failed with status ${resp.status}`);
      error.status = resp.status;
      error.responseData = parsedBody;

      const interestingPartsOfError = {
        message: error.message,
        status: error.status,
        responseData: error.responseData,
      };
      this.log.error(inspect(interestingPartsOfError, { depth: 10 }));

      throw error;
    }

    const responseHeaders: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseData = (await resp.json()) as T;
    return { status: resp.status, data: responseData, headers: responseHeaders };
  }

  async installKnowledgeBase() {
    this.log.info('Checking whether the knowledge base is installed');

    const {
      data: { ready },
    } = await this.callKibana<{ ready: boolean }>('GET', {
      pathname: '/internal/observability_ai_assistant/kb/status',
    });

    if (ready) {
      this.log.success('Knowledge base is already installed');
      return;
    }

    if (!ready) {
      this.log.info('Installing knowledge base');
    }

    await pRetry(
      async () => {
        const response = await this.callKibana<{}>('POST', {
          pathname: '/internal/observability_ai_assistant/kb/setup',
          query: {
            inference_id: '.elser-2-elasticsearch',
            wait_until_complete: true,
          },
        });
        this.log.info('Knowledge base is ready');
        return response.data;
      },
      { retries: 10 }
    );

    this.log.success('Knowledge base installed');
  }

  async createSpaceIfNeeded() {
    if (!this.spaceId) {
      return;
    }

    this.log.info(`Checking if space ${this.spaceId} exists`);

    let spaceExistsResponse: { status: number; data: { id?: string } };
    try {
      spaceExistsResponse = await this.callKibana<{ id?: string }>('GET', {
        pathname: `/api/spaces/space/${this.spaceId}`,
        ignoreSpaceId: true,
      });
    } catch (error) {
      if (isFetchError(error) && error.status === 404) {
        spaceExistsResponse = {
          status: 404,
          data: {
            id: undefined,
          },
        };
      } else {
        throw error;
      }
    }

    if (spaceExistsResponse.data.id) {
      this.log.success(`Space id ${this.spaceId} found`);
      return;
    }

    this.log.info(`Creating space ${this.spaceId}`);

    const spaceCreatedResponse = await this.callKibana<{ id: string }>(
      'POST',
      {
        pathname: '/api/spaces/space',
        ignoreSpaceId: true,
      },
      {
        id: this.spaceId,
        name: this.spaceId,
      }
    );

    if (spaceCreatedResponse.status === 200) {
      this.log.success(`Created space ${this.spaceId}`);
    } else {
      throw new Error(
        `Error creating space: ${spaceCreatedResponse.status} - ${spaceCreatedResponse.data}`
      );
    }
  }

  getMessages(message: string | Array<Message['message']>): Array<Message['message']> {
    if (typeof message === 'string') {
      return [
        {
          content: message,
          role: MessageRole.User,
        },
      ];
    }
    return message;
  }

  createChatClient({
    connectorId,
    evaluationConnectorId,
    persist,
    suite,
    scopes,
  }: {
    connectorId: string;
    evaluationConnectorId: string;
    persist: boolean;
    suite?: Mocha.Suite;
    scopes: AssistantScope[];
  }): ChatClient {
    const that = this;

    let currentTitle: string = '';
    let firstSuiteName: string = '';
    let currentScopes = scopes;

    if (suite) {
      suite.beforeEach(function () {
        const currentTest: Mocha.Test = this.currentTest;
        const titles: string[] = [];
        titles.push(this.currentTest.title);
        let parent = currentTest.parent;
        while (parent) {
          titles.push(parent.title);
          parent = parent.parent;
        }
        currentTitle = titles.reverse().join(' ');
        firstSuiteName = titles.filter((item) => item !== '')[0];
      });

      suite.afterEach(function () {
        currentTitle = '';
      });
    }

    const onResultCallbacks: Array<{
      callback: (result: EvaluationResult) => void;
      unregister: () => void;
    }> = [];

    function serializeAndHandleRetryableErrors<
      T extends StreamingChatResponseEvent
    >(): OperatorFunction<Buffer, Exclude<T, ChatCompletionErrorEvent>> {
      return (source$) => {
        const processed$ = source$.pipe(
          concatMap((buffer: Buffer) => {
            return buffer
              .toString('utf-8')
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                return JSON.parse(line) as T | BufferFlushEvent;
              });
          }),
          throwSerializedChatCompletionErrors(),
          retry({
            count: 1,
            delay: (error) => {
              if (
                isChatCompletionError(error) &&
                error.code !== ChatCompletionErrorCode.InternalError
              ) {
                that.log.info(`Not retrying error ${error.code}`);
                return throwError(() => error);
              }

              that.log.info('Caught retryable error');

              if (isFetchError(error)) {
                that.log.error(
                  inspect(
                    {
                      message: error.message,
                      status: error.status,
                    },
                    { depth: 10 }
                  )
                );
              } else {
                that.log.error(inspect(error, { depth: 5 }));
              }

              if (error.message.includes('Status code: 429')) {
                that.log.info(`429, backing off 30s`);
                return timer(30000);
              }

              that.log.info(`Retrying in 5s`);
              return timer(5000);
            },
          }),
          filter(
            (event): event is Exclude<T, ChatCompletionErrorEvent> =>
              event.type !== StreamingChatResponseEventType.BufferFlush
          )
        );

        return processed$;
      };
    }

    async function chat(
      name: string,
      {
        systemMessage,
        messages,
        functions,
        functionCall,
        connectorIdOverride,
      }: {
        systemMessage: string;
        messages: Message[];
        functions: FunctionDefinition[];
        functionCall?: string;
        connectorIdOverride?: string;
      }
    ) {
      that.log.info('Chat', name);

      const chat$ = defer(() => {
        that.log.info('Calling the /chat API');
        const params: ObservabilityAIAssistantAPIClientRequestParamsOf<'POST /internal/observability_ai_assistant/chat'>['params']['body'] =
          {
            name,
            systemMessage,
            messages,
            connectorId: connectorIdOverride || connectorId,
            functions: functions.map((fn) => pick(fn, 'name', 'description', 'parameters')),
            functionCall,
            scopes: currentScopes,
          };

        return from(
          fetch(
            that.getUrl({
              pathname: '/internal/observability_ai_assistant/chat',
            }),
            {
              method: 'POST',
              headers: {
                ...that.defaultHeaders,
                'x-elastic-internal-origin': 'Kibana',
              },
              body: JSON.stringify(params),
            }
          )
        );
      }).pipe(
        switchMap((response) =>
          streamIntoObservable(
            Readable.fromWeb(
              response.body! as unknown as WebReadableStream
            ) as unknown as NodeJS.AsyncIterator<string>
          )
        ),
        serializeAndHandleRetryableErrors(),
        filter(
          (line): line is ChatCompletionChunkEvent =>
            line.type === StreamingChatResponseEventType.ChatCompletionChunk
        ),
        concatenateChatCompletionChunks()
      );

      const message = await lastValueFrom(chat$);

      return message.message;
    }

    const results: EvaluationResult[] = [];

    return {
      chat: async (message, systemMessage) => {
        const messages = [
          ...this.getMessages(message).map((msg) => ({
            message: msg,
            '@timestamp': new Date().toISOString(),
          })),
        ];
        return chat('chat', { systemMessage, messages, functions: [] });
      },
      complete: async ({
        messages: messagesArg,
        conversationId,
        options = {},
        scope: newScope,
      }: CompleteFunctionParams) => {
        that.log.info('Calling complete');

        // set scope
        currentScopes = [newScope || 'observability'];

        const messages = [
          ...this.getMessages(messagesArg!).map((msg) => ({
            message: msg,
            '@timestamp': new Date().toISOString(),
          })),
        ];

        const stream$ = defer(() => {
          that.log.info(`Calling /chat/complete API`);
          return from(
            fetch(
              that.getUrl({
                pathname: '/internal/observability_ai_assistant/chat/complete',
              }),
              {
                method: 'POST',
                headers: {
                  ...that.defaultHeaders,
                  'x-elastic-internal-origin': 'Kibana',
                },
                body: JSON.stringify({
                  screenContexts: options.screenContexts || [],
                  conversationId,
                  messages,
                  connectorId,
                  persist,
                  title: currentTitle,
                  scopes: currentScopes,
                }),
              }
            )
          );
        }).pipe(
          switchMap((response) => {
            return streamIntoObservable(
              Readable.fromWeb(
                response.body! as unknown as WebReadableStream
              ) as unknown as NodeJS.AsyncIterator<string>
            );
          }),
          serializeAndHandleRetryableErrors(),
          catchError((error): Observable<ChatCompletionErrorEvent> => {
            const errorEvent: ChatCompletionErrorEvent = {
              error: {
                message: error.message,
                stack: error.stack,
                code: isChatCompletionError(error) ? error.code : undefined,
                meta: error.meta,
              },
              type: StreamingChatResponseEventType.ChatCompletionError,
            };

            this.log.error('Error in stream');
            this.log.error(JSON.stringify(error));

            return of(errorEvent);
          }),
          filter(
            (
              event
            ): event is MessageAddEvent | ConversationCreateEvent | ChatCompletionErrorEvent =>
              event.type === StreamingChatResponseEventType.MessageAdd ||
              event.type === StreamingChatResponseEventType.ConversationCreate ||
              event.type === StreamingChatResponseEventType.ChatCompletionError
          ),
          toArray()
        );

        const events = await lastValueFrom(stream$);

        const messagesWithAdded = messages
          .map((msg) => msg.message)
          .concat(
            events
              .filter(
                (event): event is MessageAddEvent =>
                  event.type === StreamingChatResponseEventType.MessageAdd
              )
              .map((event) => event.message.message)
          );

        return {
          errors: events.filter(
            (event): event is ChatCompletionErrorEvent =>
              event.type === StreamingChatResponseEventType.ChatCompletionError
          ),
          messages: messagesWithAdded,
          conversationId:
            conversationId ||
            events.find(
              (event): event is ConversationCreateEvent =>
                event.type === StreamingChatResponseEventType.ConversationCreate
            )?.conversation.id,
        };
      },
      evaluate: async ({ messages, conversationId, errors }, criteria) => {
        const criteriaCount = criteria.length;

        const message = await chat('evaluate', {
          connectorIdOverride: evaluationConnectorId,
          systemMessage: `You are a critical assistant for evaluating conversations with the Elastic Observability AI Assistant,
                which helps our users make sense of their Observability data.

                Your goal is to verify whether a conversation between the user and the assistant matches the given criteria.

                For each criterion, calculate a score. Explain your score, by describing what the assistant did right, and describing and quoting what the
                assistant did wrong, where it could improve, and what the root cause was in case of a failure.

                ### Scoring Contract

                * You MUST call the function "scores" exactly once.
                * The "criteria" array in the arguments MUST contain **one object for EVERY criterion**.
                  * If a criterion cannot be satisfied, still include it with \`"score": 0\` and a short \`"reasoning"\`.
                * Do NOT omit, merge, or reorder indices.
                * Do NOT place the scores in normal text; only in the "scores" function call.`,
          messages: [
            {
              '@timestamp': new Date().toString(),
              message: {
                role: MessageRole.User,
                content: `Evaluate the conversation according to the following criteria, using the "scores" tool:

                ${criteria.map((criterion, index) => {
                  return `${index}: ${criterion}`;
                })}

                This is the conversation:

                ${JSON.stringify(
                  messages
                    .filter((msg) => msg.role !== MessageRole.System)
                    .map((msg) => omit(msg, 'data'))
                )}`,
              },
            },
          ],
          functions: [
            {
              name: 'scores',
              parameters: {
                type: 'object',
                properties: {
                  criteria: {
                    type: 'array',
                    minLength: criteriaCount,
                    maxLength: criteriaCount,
                    items: {
                      type: 'object',
                      properties: {
                        index: {
                          type: 'number',
                          description: 'The index number of the criterion',
                        },
                        score: {
                          type: 'number',
                          description:
                            'A score between 0 (criterion failed) or 1 (criterion succeeded). Fractional results (e.g. 0.5) are allowed, if part of the criterion succeeded',
                        },
                        reasoning: {
                          type: 'string',
                          description:
                            'Your reasoning for the score. Explain your score by mentioning what you expected to happen and what did happen.',
                        },
                      },
                      required: ['index', 'score', 'reasoning'],
                    },
                  },
                },
                required: ['criteria'],
              },
              description: 'Call this function to return scores for the criteria',
            },
          ],
          functionCall: 'scores',
        });

        const scoredCriteria = (
          JSON.parse(message.function_call!.arguments!) as {
            criteria: Array<{ index: number; score: number; reasoning: string }>;
          }
        ).criteria;

        const scoredMap = new Map(scoredCriteria.map((c) => [c.index, c] as const));

        // Although very rare, the LLM judge can sometimes skip evaluation of certain criteria.
        // The fallback default score is 0, with self-explanatory reasoning.
        const scores = criteria.map((criterion, idx) => {
          const criterionScore = scoredMap.get(idx);
          return {
            criterion,
            score: criterionScore?.score ?? 0,
            reasoning: criterionScore
              ? criterionScore.reasoning
              : 'No score returned by LLM judge, defaulting to 0.',
          };
        });

        scores.push({
          score: errors.length === 0 ? 1 : 0,
          criterion: 'The conversation did not encounter any errors',
          reasoning: errors.length
            ? `The following errors occurred: ${errors.map((error) => error.error.message)}`
            : 'No errors occurred',
        });

        const result: EvaluationResult = {
          name: currentTitle,
          category: firstSuiteName,
          conversationId,
          messages,
          passed: scores.every(({ score }) => score === 1),
          scores,
          errors,
        };

        results.push(result);

        onResultCallbacks.forEach(({ callback }) => {
          callback(result);
        });

        return result;
      },
      getResults: () => results,
      onResult: (callback) => {
        const unregister = () => {
          remove(onResultCallbacks, { callback });
        };
        onResultCallbacks.push({ callback, unregister });
        return unregister;
      },
      getConnectorId: () => connectorId,
    };
  }

  async getConnectors() {
    const url = this.getUrl({
      pathname: '/api/actions/connectors',
    });

    const resp = await fetch(url, {
      headers: this.defaultHeaders,
    });

    if (!resp.ok) {
      throw new Error(`Failed to get connectors: ${resp.status} ${resp.statusText}`);
    }

    const connectors = (await resp.json()) as Array<{
      id: string;
      connector_type_id: string;
      name: string;
      is_preconfigured: boolean;
      is_deprecated: boolean;
      referenced_by_count: number;
    }>;

    return connectors.filter((connector) => isSupportedConnectorType(connector.connector_type_id));
  }
}
