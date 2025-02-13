/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent, { Span } from 'elastic-apm-node';
import type { Logger } from '@kbn/logging';
import { TelemetryTracer } from '@kbn/langchain/server/tracers/telemetry';
import { streamFactory, StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExecuteConnectorRequestBody, TraceData } from '@kbn/elastic-assistant-common';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { AIMessageChunk } from '@langchain/core/messages';
import { withAssistantSpan } from '../../tracers/apm/with_assistant_span';
import { AGENT_NODE_TAG } from './nodes/run_agent';
import { DEFAULT_ASSISTANT_GRAPH_ID, DefaultAssistantGraph } from './graph';
import { GraphInputs } from './types';
import type { OnLlmResponse, TraceOptions } from '../../executors/types';

interface StreamGraphParams {
  apmTracer: APMTracer;
  assistantGraph: DefaultAssistantGraph;
  inputs: GraphInputs;
  logger: Logger;
  onLlmResponse?: OnLlmResponse;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  telemetryTracer?: TelemetryTracer;
  traceOptions?: TraceOptions;
}

/**
 * Execute the graph in streaming mode
 *
 * @param apmTracer
 * @param assistantGraph
 * @param inputs
 * @param logger
 * @param onLlmResponse
 * @param request
 * @param telemetryTracer
 * @param traceOptions
 */
export const streamGraph = async ({
  apmTracer,
  assistantGraph,
  inputs,
  logger,
  onLlmResponse,
  request,
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
  const handleStreamEnd = (finalResponse: string, isError = false) => {
    if (didEnd) {
      return;
    }
    if (onLlmResponse) {
      onLlmResponse(
        finalResponse,
        {
          transactionId: streamingSpan?.transaction?.ids?.['transaction.id'],
          traceId: streamingSpan?.ids?.['trace.id'],
        },
        isError
      ).catch(() => {});
    }
    streamEnd();
    didEnd = true;
    if ((streamingSpan && !streamingSpan?.outcome) || streamingSpan?.outcome === 'unknown') {
      streamingSpan.outcome = isError ? 'failure' : 'success';
    }
    streamingSpan?.end();
  };

  // Stream is from tool calling agent or structured chat agent
  if (inputs.isOssModel || inputs?.llmType === 'bedrock' || inputs?.llmType === 'gemini') {
    const stream = await assistantGraph.streamEvents(
      inputs,
      {
        callbacks: [
          apmTracer,
          ...(traceOptions?.tracers ?? []),
          ...(telemetryTracer ? [telemetryTracer] : []),
        ],
        runName: DEFAULT_ASSISTANT_GRAPH_ID,
        tags: traceOptions?.tags ?? [],
        version: 'v2',
        streamMode: 'values',
      },
      inputs.isOssModel || inputs?.llmType === 'bedrock'
        ? { includeNames: ['Summarizer'] }
        : undefined
    );

    const pushStreamUpdate = async () => {
      for await (const { event, data, tags } of stream) {
        if ((tags || []).includes(AGENT_NODE_TAG)) {
          if (event === 'on_chat_model_stream') {
            const msg = data.chunk as AIMessageChunk;
            if (!didEnd && !msg.tool_call_chunks?.length && msg.content.length) {
              push({ payload: msg.content as string, type: 'content' });
            }
          }

          if (
            event === 'on_chat_model_end' &&
            !data.output.lc_kwargs?.tool_calls?.length &&
            !didEnd
          ) {
            handleStreamEnd(data.output.content);
          }
        }
      }
    };

    pushStreamUpdate().catch((err) => {
      logger.error(`Error streaming graph: ${err}`);
      handleStreamEnd(err.message, true);
    });

    return responseWithHeaders;
  }

  // Stream is from openai functions agent
  let finalMessage = '';
  const stream = assistantGraph.streamEvents(
    inputs,
    {
      callbacks: [
        apmTracer,
        ...(traceOptions?.tracers ?? []),
        ...(telemetryTracer ? [telemetryTracer] : []),
      ],
      runName: DEFAULT_ASSISTANT_GRAPH_ID,
      streamMode: 'values',
      tags: traceOptions?.tags ?? [],
      version: 'v1',
    },
    inputs?.provider === 'bedrock' ? { includeNames: ['Summarizer'] } : undefined
  );

  const pushStreamUpdate = async () => {
    for await (const { event, data, tags } of stream) {
      if ((tags || []).includes(AGENT_NODE_TAG)) {
        if (event === 'on_llm_stream') {
          const chunk = data?.chunk;
          const msg = chunk.message;
          if (msg?.tool_call_chunks && msg?.tool_call_chunks.length > 0) {
            /* empty */
          } else if (!didEnd) {
            push({ payload: msg.content, type: 'content' });
            finalMessage += msg.content;
          }
        }

        if (event === 'on_llm_end' && !didEnd) {
          const generation = data.output?.generations[0][0];
          if (
            // if generation is null, an error occurred - do nothing and let error handling complete the stream
            generation != null &&
            // no finish_reason means the stream was aborted
            (!generation?.generationInfo?.finish_reason ||
              generation?.generationInfo?.finish_reason === 'stop')
          ) {
            handleStreamEnd(
              generation?.text && generation?.text.length ? generation?.text : finalMessage
            );
          }
        }
      }
    }
  };

  pushStreamUpdate().catch((err) => {
    logger.error(`Error streaming graph: ${err}`);
    handleStreamEnd(err.message, true);
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
    const r = await assistantGraph.invoke(inputs, {
      callbacks: [
        apmTracer,
        ...(traceOptions?.tracers ?? []),
        ...(telemetryTracer ? [telemetryTracer] : []),
      ],
      runName: DEFAULT_ASSISTANT_GRAPH_ID,
      tags: traceOptions?.tags ?? [],
    });
    const output = r.agentOutcome.returnValues.output;
    const conversationId = r.conversation?.id;
    if (onLlmResponse) {
      await onLlmResponse(output, traceData);
    }

    return { output, traceData, conversationId };
  });
};
