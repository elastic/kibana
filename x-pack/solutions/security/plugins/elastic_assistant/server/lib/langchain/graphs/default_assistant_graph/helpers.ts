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
  InterruptResumeValue,
  TraceData,
} from '@kbn/elastic-assistant-common';
import { InterruptValue } from '@kbn/elastic-assistant-common';
import type { APMTracer } from '@kbn/langchain/server/tracers/apm';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { Command } from '@langchain/langgraph';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../../../telemetry/event_based_telemetry';
import { withAssistantSpan } from '../../tracers/apm/with_assistant_span';
import { AGENT_NODE_TAG } from './nodes/run_agent';
import type { DefaultAssistantGraph } from './graph';
import { DEFAULT_ASSISTANT_GRAPH_ID } from './graph';
import type { GraphInputs } from './types';
import type { OnLlmResponse, TraceOptions } from '../../executors/types';
import { PromiseQueue } from '../../utils/promise_queue';

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
  interruptResumeValue?: InterruptResumeValue;
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
  interruptResumeValue,
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
    isError: boolean;
    interruptValue?: InterruptValue;
  }) => {
    if (onLlmResponse) {
      return onLlmResponse({
        content: args.finalResponse,
        interruptValue: args.interruptValue,
        traceData: {
          transactionId: streamingSpan?.transaction?.ids?.['transaction.id'],
          traceId: streamingSpan?.ids?.['trace.id'],
        },
        isError: args.isError,
      });
    }
  };

  const streamEventsInput = interruptResumeValue
    ? new Command({ resume: interruptResumeValue })
    : inputs;

  const stream = await assistantGraph.streamEvents(streamEventsInput, {
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

  const promiseQueue = new PromiseQueue();

  const pushStreamUpdate = async () => {
    for await (const chunk of stream) {
      const { event, data, tags } = chunk;
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
          promiseQueue.queuePromise(
            handleFinalContent({ finalResponse: data.output.content, isError: false })
          );
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

      // include interrupts in the stream.
      if (event === 'on_chain_stream') {
        const payload = data.chunk?.[1].payload;
        if (payload) {
          const id = payload.id;
          const interruptValue = payload.interrupts?.[0]?.value;
          if (typeof id === 'string' && interruptValue !== null) {
            const parsedInterruptValue = InterruptValue.safeParse({ id, ...interruptValue });
            if (parsedInterruptValue.success) {
              push({ payload: JSON.stringify(parsedInterruptValue.data), type: 'interruptValue' });
            }
          }
        }
      }
    }

    // finished consuming the stream. Checking if interrupts happened.
    await checkInterrupts(assistantGraph, inputs.threadId, logger, handleFinalContent);

    // Ensure any queued final-content work is done before closing the stream
    if (promiseQueue.pendingPromises.size > 0) {
      await Promise.allSettled([...promiseQueue.pendingPromises]);
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
  interruptResumeValue?: InterruptResumeValue;
  logger: Logger;
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
  interruptResumeValue,
  logger,
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

    const invokeInput = interruptResumeValue
      ? new Command({ resume: interruptResumeValue })
      : inputs;

    const result = await assistantGraph.invoke(invokeInput, {
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

    const handleFinalContent = (args: {
      finalResponse: string;
      isError: boolean;
      interruptValue?: InterruptValue;
    }) => {
      if (onLlmResponse) {
        return onLlmResponse({
          content: args.finalResponse,
          interruptValue: args.interruptValue,
          isError: args.isError,
          traceData,
        });
      }
    };

    const handleFinalContentCalled = await checkInterrupts(
      assistantGraph,
      inputs.threadId,
      logger,
      handleFinalContent
    );

    if (!handleFinalContentCalled) {
      await handleFinalContent({
        finalResponse: output,
        isError: false,
      });
    }

    return { output, traceData, conversationId };
  });
};

/**
 * Checks if graph has pending interrupts and if it does, calls handleFinalContent with the interrupt.
 * @param assistantGraph
 * @param threadId
 * @param logger
 * @param handleFinalContent
 * @returns boolean if handleFinalContent was called
 */
async function checkInterrupts(
  assistantGraph: DefaultAssistantGraph,
  threadId: string,
  logger: Logger,
  handleFinalContent: (args: {
    finalResponse: string;
    isError: boolean;
    interruptValue?: InterruptValue;
  }) => Promise<void> | undefined
): Promise<boolean> {
  const state = await assistantGraph.getState({ configurable: { thread_id: threadId } });
  if (state?.tasks?.length > 0) {
    // The graph contains tasks, graph must have been interrupted
    if (state.tasks.length > 1) {
      logger.warn('Expected at most one task to be active');
    }
    const task = state.tasks.at(0);
    if (!task) {
      throw new Error(`No task found in state: ${JSON.stringify(state, null, 2)}`);
    }
    if (task.interrupts.length < 1 || task.interrupts.length > 1) {
      throw new Error(`Expected exactly one interrupt in task, found ${task.interrupts.length}`);
    }
    const interrupt = task.interrupts[0];
    const interruptValue = interrupt.value;
    const parsedInterruptValue = InterruptValue.safeParse({ id: task.id, ...interruptValue });
    if (!parsedInterruptValue.success) {
      throw new Error(
        `Interrupt did not match schema. You must use typedInterrupt(...). ${JSON.stringify(
          parsedInterruptValue.error
        )}`
      );
    }

    await handleFinalContent({
      finalResponse: '#### ⏳ Action required',
      interruptValue: parsedInterruptValue.data,
      isError: false,
    });

    return true;
  }

  return false;
}
