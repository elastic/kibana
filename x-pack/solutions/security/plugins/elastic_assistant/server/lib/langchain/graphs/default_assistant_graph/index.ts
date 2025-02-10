/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool } from '@langchain/core/tools';
import { getDefaultArguments } from '@kbn/langchain/server';
import {
  createOpenAIToolsAgent,
  createStructuredChatAgent,
  createToolCallingAgent,
} from 'langchain/agents';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { TelemetryTracer } from '@kbn/langchain/server/tracers/telemetry';
import { pruneContentReferences, MessageMetadata } from '@kbn/elastic-assistant-common';
import { getPrompt, resolveProviderAndModel } from '@kbn/security-ai-prompts';
import { localToolPrompts, promptGroupId as toolsGroupId } from '../../../prompt/tool_prompts';
import { promptGroupId } from '../../../prompt/local_prompt_object';
import { getModelOrOss } from '../../../prompt/helpers';
import { getPrompt as localGetPrompt, promptDictionary } from '../../../prompt';
import { getLlmClass } from '../../../../routes/utils';
import { EsAnonymizationFieldsSchema } from '../../../../ai_assistant_data_clients/anonymization_fields/types';
import { AssistantToolParams } from '../../../../types';
import { AgentExecutor } from '../../executors/types';
import { formatPrompt, formatPromptStructured } from './prompts';
import { GraphInputs } from './types';
import { getDefaultAssistantGraph } from './graph';
import { invokeGraph, streamGraph } from './helpers';
import { transformESSearchToAnonymizationFields } from '../../../../ai_assistant_data_clients/anonymization_fields/helpers';

export const callAssistantGraph: AgentExecutor<true | false> = async ({
  abortSignal,
  actionsClient,
  alertsIndexPattern,
  assistantTools = [],
  connectorId,
  contentReferencesStore,
  conversationId,
  dataClients,
  esClient,
  inference,
  langChainMessages,
  llmTasks,
  llmType,
  isOssModel,
  logger: parentLogger,
  isStream = false,
  onLlmResponse,
  onNewReplacements,
  replacements,
  request,
  savedObjectsClient,
  size,
  systemPrompt,
  telemetry,
  telemetryParams,
  traceOptions,
  responseLanguage = 'English',
}) => {
  const logger = parentLogger.get('defaultAssistantGraph');
  const isOpenAI = llmType === 'openai' && !isOssModel;
  const llmClass = getLlmClass(llmType);

  /**
   * Creates a new instance of llmClass.
   *
   * This function ensures that a new llmClass instance is created every time it is called.
   * This is necessary to avoid any potential side effects from shared state. By always
   * creating a new instance, we prevent other uses of llm from binding and changing
   * the state unintentionally. For this reason, never assign this value to a variable (ex const llm = createLlmInstance())
   */
  const createLlmInstance = () =>
    new llmClass({
      actionsClient,
      connectorId,
      llmType,
      logger,
      // possible client model override,
      // let this be undefined otherwise so the connector handles the model
      model: request.body.model,
      // ensure this is defined because we default to it in the language_models
      // This is where the LangSmith logs (Metadata > Invocation Params) are set
      temperature: getDefaultArguments(llmType).temperature,
      signal: abortSignal,
      streaming: isStream,
      // prevents the agent from retrying on failure
      // failure could be due to bad connector, we should deliver that result to the client asap
      maxRetries: 0,
    });

  const anonymizationFieldsRes =
    await dataClients?.anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>({
      perPage: 1000,
      page: 1,
    });

  const anonymizationFields = anonymizationFieldsRes
    ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
    : undefined;

  const latestMessage = langChainMessages.slice(-1); // the last message

  // Check if KB is available (not feature flag related)
  const isEnabledKnowledgeBase =
    (await dataClients?.kbDataClient?.isInferenceEndpointExists()) ?? false;

  // Fetch any applicable tools that the source plugin may have registered
  const assistantToolParams: AssistantToolParams = {
    alertsIndexPattern,
    anonymizationFields,
    connectorId,
    contentReferencesStore,
    esClient,
    inference,
    isEnabledKnowledgeBase,
    kbDataClient: dataClients?.kbDataClient,
    llmTasks,
    logger,
    onNewReplacements,
    replacements,
    request,
    size,
    telemetry,
  };

  const tools: StructuredTool[] = (
    await Promise.all(
      assistantTools.map(async (tool) => {
        let description: string | undefined;
        try {
          description = await getPrompt({
            actionsClient,
            connectorId,
            localPrompts: localToolPrompts,
            model: getModelOrOss(llmType, isOssModel, request.body.model),
            promptId: tool.name,
            promptGroupId: toolsGroupId,
            provider: llmType,
            savedObjectsClient,
          });
        } catch (e) {
          logger.error(`Failed to get prompt for tool: ${tool.name}`);
        }
        return tool.getTool({
          ...assistantToolParams,
          llm: createLlmInstance(),
          isOssModel,
          description,
        });
      })
    )
  ).filter((e) => e != null) as StructuredTool[];

  // If KB enabled, fetch for any KB IndexEntries and generate a tool for each
  if (isEnabledKnowledgeBase) {
    const kbTools = await dataClients?.kbDataClient?.getAssistantTools({
      esClient,
      contentReferencesStore,
    });
    if (kbTools) {
      tools.push(...kbTools);
    }
  }

  const defaultSystemPrompt = await localGetPrompt({
    actionsClient,
    connectorId,
    model: getModelOrOss(llmType, isOssModel, request.body.model),
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: llmType,
    savedObjectsClient,
  });

  const agentRunnable =
    isOpenAI || llmType === 'inference'
      ? await createOpenAIToolsAgent({
          llm: createLlmInstance(),
          tools,
          prompt: formatPrompt(defaultSystemPrompt, systemPrompt),
          streamRunnable: isStream,
        })
      : llmType && ['bedrock', 'gemini'].includes(llmType)
      ? await createToolCallingAgent({
          llm: createLlmInstance(),
          tools,
          prompt: formatPrompt(defaultSystemPrompt, systemPrompt),
          streamRunnable: isStream,
        })
      : // used with OSS models
        await createStructuredChatAgent({
          llm: createLlmInstance(),
          tools,
          prompt: formatPromptStructured(defaultSystemPrompt, systemPrompt),
          streamRunnable: isStream,
        });

  const apmTracer = new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger);
  const telemetryTracer = telemetryParams
    ? new TelemetryTracer(
        {
          elasticTools: tools.map(({ name }) => name),
          totalTools: tools.length,
          telemetry,
          telemetryParams,
        },
        logger
      )
    : undefined;
  const { provider } =
    !llmType || llmType === 'inference'
      ? await resolveProviderAndModel({
          connectorId,
          actionsClient,
        })
      : { provider: llmType };
  const assistantGraph = getDefaultAssistantGraph({
    agentRunnable,
    dataClients,
    // we need to pass it like this or streaming does not work for bedrock
    createLlmInstance,
    logger,
    actionsClient,
    savedObjectsClient,
    tools,
    replacements,
    // some chat models (bedrock) require a signal to be passed on agent invoke rather than the signal passed to the chat model
    ...(llmType === 'bedrock' ? { signal: abortSignal } : {}),
    contentReferencesEnabled: Boolean(contentReferencesStore),
  });
  const inputs: GraphInputs = {
    responseLanguage,
    conversationId,
    connectorId,
    llmType,
    isStream,
    isOssModel,
    input: latestMessage[0]?.content as string,
    provider: provider ?? '',
  };

  if (isStream) {
    return streamGraph({
      apmTracer,
      assistantGraph,
      inputs,
      logger,
      onLlmResponse,
      request,
      telemetryTracer,
      traceOptions,
    });
  }

  const graphResponse = await invokeGraph({
    apmTracer,
    assistantGraph,
    inputs,
    onLlmResponse,
    telemetryTracer,
    traceOptions,
  });

  const contentReferences =
    contentReferencesStore && pruneContentReferences(graphResponse.output, contentReferencesStore);

  const metadata: MessageMetadata = {
    ...(contentReferences ? { contentReferences } : {}),
  };

  const isMetadataPopulated = !!contentReferences;

  return {
    body: {
      connector_id: connectorId,
      data: graphResponse.output,
      trace_data: graphResponse.traceData,
      replacements,
      status: 'ok',
      ...(isMetadataPopulated ? { metadata } : {}),
      ...(graphResponse.conversationId ? { conversationId: graphResponse.conversationId } : {}),
    },
    headers: {
      'content-type': 'application/json',
    },
  };
};
