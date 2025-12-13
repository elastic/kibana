/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredTool } from '@langchain/core/tools';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { TelemetryTracer } from '@kbn/langchain/server/tracers/telemetry';
import type { MessageMetadata } from '@kbn/elastic-assistant-common';
import { pruneContentReferences } from '@kbn/elastic-assistant-common';
import { getPrompt } from '@kbn/security-ai-prompts';
import { isEmpty } from 'lodash';
import { generateChatTitle } from './nodes/generate_chat_title';
import { localToolPrompts, promptGroupId as toolsGroupId } from '../../../prompt/tool_prompts';
import { promptGroupId } from '../../../prompt/local_prompt_object';
import { getFormattedTime, getModelOrOss } from '../../../prompt/helpers';
import { getLlmClass } from '../../../../routes/utils';
import { getPrompt as localGetPrompt, promptDictionary } from '../../../prompt';
import type { EsAnonymizationFieldsSchema } from '../../../../ai_assistant_data_clients/anonymization_fields/types';
import type { AssistantToolParams } from '../../../../types';
import type { AgentExecutor } from '../../executors/types';
import { DEFAULT_ASSISTANT_GRAPH_PROMPT_TEMPLATE, chatPromptFactory } from './prompts';
import type { GraphInputs } from './types';
import { getDefaultAssistantGraph } from './graph';
import { invokeGraph, streamGraph } from './helpers';
import { transformESSearchToAnonymizationFields } from '../../../../ai_assistant_data_clients/anonymization_fields/helpers';
import { DEFAULT_DATE_FORMAT_TZ } from '../../../../../common/constants';
import { getConversationWithNewMessage } from '../../utils/get_conversation_with_new_message';

export const callAssistantGraph: AgentExecutor<true | false> = async ({
  abortSignal,
  assistantContext,
  actionsClient,
  alertsIndexPattern,
  assistantTools = [],
  connectorId,
  threadId,
  contentReferencesStore,
  conversationId,
  core,
  dataClients,
  esClient,
  inference,
  inferenceChatModelDisabled = false,
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
  screenContext,
  size,
  systemPrompt,
  telemetry,
  telemetryParams,
  traceOptions,
  responseLanguage = 'English',
  timeout,
}) => {
  const logger = parentLogger.get('defaultAssistantGraph');
  const llmClass = getLlmClass(llmType);

  /**
   * Creates a new instance of llmClass.
   *
   * This function ensures that a new llmClass instance is created every time it is called.
   * This is necessary to avoid any potential side effects from shared state. By always
   * creating a new instance, we prevent other uses of llm from binding and changing
   * the state unintentionally. For this reason, only call createLlmInstance at runtime
   */
  const createLlmInstance = async () => {
    const connector = await actionsClient.get({ id: connectorId });
    const defaultModel = connector?.config?.defaultModel;
    return !inferenceChatModelDisabled
      ? inference.getChatModel({
          request,
          connectorId,
          chatModelOptions: {
            model: request.body.model,
            signal: abortSignal,
            // prevents the agent from retrying on failure
            // failure could be due to bad connector, we should deliver that result to the client asap
            maxRetries: 0,
            telemetryMetadata: {
              pluginId: 'security_ai_assistant',
            },
            // TODO add timeout to inference once resolved https://github.com/elastic/kibana/issues/221318
            // timeout,
          },
        })
      : new llmClass({
          actionsClient,
          connectorId,
          llmType,
          logger,
          // possible client model override,
          // let this be undefined otherwise so the connector handles the model
          model: request.body.model ?? defaultModel,
          // Temperature is not set here to allow connector config temperature to be used
          signal: abortSignal,
          streaming: isStream,
          // prevents the agent from retrying on failure
          // failure could be due to bad connector, we should deliver that result to the client asap
          maxRetries: 0,
          convertSystemMessageToHumanContent: false,
          timeout,
          telemetryMetadata: {
            pluginId: 'security_ai_assistant',
          },
        });
  };

  const anonymizationFieldsRes =
    await dataClients?.anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>({
      perPage: 1000,
      page: 1,
    });

  const anonymizationFields = anonymizationFieldsRes
    ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
    : undefined;

  const newMessages = langChainMessages.slice(-1); // this is the message that was just added

  // Check if KB is available (not feature flag related)
  const isEnabledKnowledgeBase =
    (await dataClients?.kbDataClient?.isInferenceEndpointExists()) ?? false;

  // Fetch any applicable tools that the source plugin may have registered
  const assistantToolParams: AssistantToolParams = {
    alertsIndexPattern,
    assistantContext,
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
    createLlmInstance,
    isOssModel,
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
        const llm = await createLlmInstance();
        return tool.getTool({
          ...assistantToolParams,
          llm,
          isOssModel,
          description,
        });
      })
    )
  ).filter((e) => e != null) as StructuredTool[];

  const apmTracer = new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger);
  const telemetryTracer = telemetryParams
    ? new TelemetryTracer(
        {
          // this line MUST come before kbTools are added
          elasticTools: tools.map(({ name }) => name),
          telemetry,
          telemetryParams,
        },
        logger
      )
    : undefined;

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

  const uiSettingsDateFormatTimezone = await core.uiSettings.client.get<string>(
    DEFAULT_DATE_FORMAT_TZ
  );

  const assistantGraph = await getDefaultAssistantGraph({
    // we need to pass it like this or streaming does not work for bedrock
    createLlmInstance,
    logger,
    actionsClient,
    savedObjectsClient,
    tools,
    // some chat models (bedrock) require a signal to be passed on agent invoke rather than the signal passed to the chat model
    ...(llmType === 'bedrock' ? { signal: abortSignal } : {}),
    contentReferencesStore,
    checkpointSaver: await assistantContext.getCheckpointSaver(),
  });

  const conversationMessages = await getConversationWithNewMessage({
    logger,
    conversationsDataClient: dataClients?.conversationsDataClient,
    conversationId,
    replacements,
    newMessages,
  });

  const chatPrompt = await chatPromptFactory(DEFAULT_ASSISTANT_GRAPH_PROMPT_TEMPLATE, {
    prompt: defaultSystemPrompt,
    additionalPrompt: systemPrompt,
    kbClient: dataClients?.kbDataClient,
    contentReferencesStore,
    logger,
    conversationMessages,
    formattedTime: getFormattedTime({
      screenContextTimezone: screenContext?.timeZone,
      uiSettingsDateFormatTimezone,
    }),
    actionsClient,
    savedObjectsClient,
    connectorId,
    llmType,
  });

  const inputs: GraphInputs = {
    responseLanguage,
    conversationId,
    connectorId,
    threadId,
    llmType,
    isStream,
    isOssModel,
    messages: chatPrompt.messages,
    isRegeneration: newMessages.length === 0,
  };

  // make a fire and forget async call to generateChatTitle
  void (async () => {
    const model = await createLlmInstance();
    await generateChatTitle({
      actionsClient,
      contentReferencesStore,
      conversationsDataClient: dataClients?.conversationsDataClient,
      logger,
      savedObjectsClient,
      state: {
        ...inputs,
      },
      newMessages,
      model,
      telemetryParams,
      telemetry,
    }).catch((error) => {
      logger.error(`Failed to generate chat title: ${error.message}`);
    });
  })();

  if (isStream) {
    return streamGraph({
      apmTracer,
      assistantGraph,
      inputs,
      isEnabledKnowledgeBase: telemetryParams?.isEnabledKnowledgeBase ?? false,
      logger,
      onLlmResponse,
      request,
      telemetry,
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

  const { prunedContentReferencesStore, prunedContent } = pruneContentReferences(
    graphResponse.output,
    contentReferencesStore
  );

  const metadata: MessageMetadata = {
    ...(!isEmpty(prunedContentReferencesStore)
      ? { contentReferences: prunedContentReferencesStore }
      : {}),
  };

  return {
    body: {
      connector_id: connectorId,
      data: prunedContent,
      trace_data: graphResponse.traceData,
      replacements,
      status: 'ok',
      ...(!isEmpty(metadata) ? { metadata } : {}),
      ...(graphResponse.conversationId ? { conversationId: graphResponse.conversationId } : {}),
    },
    headers: {
      'content-type': 'application/json',
    },
  };
};
