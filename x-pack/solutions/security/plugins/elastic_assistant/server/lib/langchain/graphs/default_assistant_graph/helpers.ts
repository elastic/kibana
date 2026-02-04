/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from 'elastic-apm-node';
import agent from 'elastic-apm-node';
import type { Logger } from '@kbn/logging';
import type { TelemetryTracer } from '@kbn/langchain/server/tracers/telemetry';
import type { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';
import { streamFactory } from '@kbn/ml-response-stream/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ExecuteConnectorRequestBody,
  InterruptValue,
  TraceData,
} from '@kbn/elastic-assistant-common';
import type { APMTracer } from '@kbn/langchain/server/tracers/apm';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../../../telemetry/event_based_telemetry';
import { withAssistantSpan } from '../../tracers/apm/with_assistant_span';
import { AGENT_NODE_TAG } from './nodes/run_agent';
import type { DefaultAssistantGraph } from './graph';
import { DEFAULT_ASSISTANT_GRAPH_ID } from './graph';
import type { GraphInputs } from './types';
import type { OnLlmResponse, TraceOptions } from '../../executors/types';

interface StreamGraphParams {
  apmTracer: APMTracer;
  assistantGraph: DefaultAssistantGraph;
  inputs: GraphInputs;
  isEnabledKnowledgeBase: boolean;
  logger: Logger;
  onLlmResponse?: OnLlmResponse;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  telemetry: AnalyticsServiceSetup;
  telemetryTracer?: TelemetryTracer;
  traceOptions?: TraceOptions;
}

/**
 * Execute the graph in streaming mode
 *
 * @param apmTracer
 * @param assistantGraph
 * @param inputs
 * @param isEnabledKnowledgeBase
 * @param logger
 * @param onLlmResponse
 * @param request
 * @param telemetry
 * @param telemetryTracer
 * @param traceOptions
 */
export const streamGraph = async ({
  apmTracer,
  assistantGraph,
  inputs,
  isEnabledKnowledgeBase,
  logger,
  onLlmResponse,
  request,
  telemetry,
  telemetryTracer,
  traceOptions,
}: StreamGraphParams): Promise<StreamResponseWithHeaders> => {
  let streamingSpan: Span | undefined;
  if (agent.isStarted()) {
    streamingSpan = agent.startSpan(`${DEFAULT_ASSISTANT_GRAPH_ID} (Streaming)`) ?? undefined;
  }
  const {
    end: streamEnd,
    push,
    responseWithHeaders,
  } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

  let didEnd = false;

  const closeStream = (args: { errorMessage: string; isError: true } | { isError: false }) => {
    if (didEnd) {
      return;
    }

    if (args.isError) {
      telemetry.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
        actionTypeId: request.body.actionTypeId,
        model: request.body.model,
        errorMessage: args.errorMessage,
        assistantStreamingEnabled: true,
        isEnabledKnowledgeBase,
        errorLocation: 'handleStreamEnd',
      });
    }

    streamEnd();
    didEnd = true;

    if ((streamingSpan && !streamingSpan?.outcome) || streamingSpan?.outcome === 'unknown') {
      streamingSpan.outcome = args.isError ? 'failure' : 'success';
    }
    streamingSpan?.end();
  };

  const handleFinalContent = (args: {
    finalResponse: string;
    refusal?: string;
    isError: boolean;
    interruptValue?: InterruptValue;
  }) => {
    if (onLlmResponse) {
      onLlmResponse({
        content: args.finalResponse,
        refusal: args.refusal,
        interruptValue: args.interruptValue,
        traceData: {
          transactionId: streamingSpan?.transaction?.ids?.['transaction.id'],
          traceId: streamingSpan?.ids?.['trace.id'],
        },
        isError: args.isError,
      }).catch(() => {});
    }
  };

  const stream = await assistantGraph.streamEvents(inputs, {
    callbacks: [
      apmTracer,
      ...(traceOptions?.tracers ?? []),
      ...(telemetryTracer ? [telemetryTracer] : []),
    ],
    runName: DEFAULT_ASSISTANT_GRAPH_ID,
    tags: traceOptions?.tags ?? [],
    version: 'v2',
    streamMode: ['values', 'debug'],
    recursionLimit: inputs?.isOssModel ? 50 : 25,
    configurable: {
      thread_id: inputs.threadId,
    },
  });

  const pushStreamUpdate = async () => {
    for await (const { event, data, tags } of stream) {
      if ((tags || []).includes(AGENT_NODE_TAG)) {
        if (event === 'on_chat_model_stream' && !inputs.isOssModel) {
          const msg = data.chunk as AIMessageChunk;
          if (!didEnd && !msg.tool_call_chunks?.length && msg.content && msg.content.length) {
            push({ payload: msg.content as string, type: 'content' });
          }
        } else if (
          event === 'on_chat_model_end' &&
          !data.output.lc_kwargs?.tool_calls?.length &&
          !didEnd
        ) {
          const refusal =
            typeof data.output?.additional_kwargs?.refusal === 'string'
              ? (data.output.additional_kwargs.refusal as string)
              : undefined;
          handleFinalContent({ finalResponse: data.output.content, refusal, isError: false });
        } else if (
          // This is the end of one model invocation but more message will follow as there are tool calls. If this chunk contains text content, add a newline separator to the stream to visually separate the chunks.
          event === 'on_chat_model_end' &&
          data.output.lc_kwargs?.tool_calls?.length &&
          (data.chunk?.content || data.output?.content) &&
          !didEnd
        ) {
          push({ payload: '\n\n' as string, type: 'content' });
        }
      }
    }

    closeStream({ isError: false });
  };

  pushStreamUpdate().catch((err) => {
    logger.error(`Error streaming graph: ${err}`);
    handleFinalContent({ finalResponse: err.message, isError: true });
    closeStream({ isError: true, errorMessage: err.message });
  });

  return responseWithHeaders;
};

interface InvokeGraphParams {
  apmTracer: APMTracer;
  assistantGraph: DefaultAssistantGraph;
  inputs: GraphInputs;
  onLlmResponse?: OnLlmResponse;
  telemetryTracer?: TelemetryTracer;
  traceOptions?: TraceOptions;
}
interface InvokeGraphResponse {
  output: string;
  traceData: TraceData;
  conversationId?: string;
}

/**
 * Execute the graph in non-streaming mode
 *
 * @param apmTracer
 * @param assistantGraph
 * @param inputs
 * @param onLlmResponse
 * @param telemetryTracer
 * @param traceOptions
 */
export const invokeGraph = async ({
  apmTracer,
  assistantGraph,
  inputs,
  onLlmResponse,
  telemetryTracer,
  traceOptions,
}: InvokeGraphParams): Promise<InvokeGraphResponse> => {
  return withAssistantSpan(DEFAULT_ASSISTANT_GRAPH_ID, async (span) => {
    let traceData: TraceData = {};
    if (span?.transaction?.ids['transaction.id'] != null && span?.ids['trace.id'] != null) {
      traceData = {
        // Transactions ID since this span is the parent
        transactionId: span.transaction.ids['transaction.id'],
        traceId: span.ids['trace.id'],
      };
      span.addLabels({ evaluationId: traceOptions?.evaluationId });
    }
    const result = await assistantGraph.invoke(inputs, {
      callbacks: [
        apmTracer,
        ...(traceOptions?.tracers ?? []),
        ...(telemetryTracer ? [telemetryTracer] : []),
      ],
      runName: DEFAULT_ASSISTANT_GRAPH_ID,
      tags: traceOptions?.tags ?? [],
      recursionLimit: inputs?.isOssModel ? 50 : 25,
      configurable: {
        thread_id: inputs.threadId,
      },
    });
    const lastMessage = result.messages[result.messages.length - 1];
    const output = lastMessage.text;
    const conversationId = result.conversationId;
    const refusal =
      typeof lastMessage?.additional_kwargs?.refusal === 'string'
        ? (lastMessage.additional_kwargs.refusal as string)
        : undefined;
    if (onLlmResponse) {
      await onLlmResponse({
        content: output,
        traceData,
        ...(refusal ? { refusal } : {}),
      });
    }

    return { output, traceData, conversationId };
  });
};
