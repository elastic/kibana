/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool } from '@langchain/core/tools';
import { getDefaultArguments } from '@kbn/langchain/server';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { TelemetryTracer } from '@kbn/langchain/server/tracers/telemetry';
import { pruneContentReferences, MessageMetadata } from '@kbn/elastic-assistant-common';
import { getPrompt, resolveProviderAndModel } from '@kbn/security-ai-prompts';
import { isEmpty } from 'lodash';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { generateChatTitle } from './nodes/generate_chat_title';
import { localToolPrompts, promptGroupId as toolsGroupId } from '../../../prompt/tool_prompts';
import { promptGroupId } from '../../../prompt/local_prompt_object';
import { getFormattedTime, getModelOrOss } from '../../../prompt/helpers';
import { getLlmClass } from '../../../../routes/utils';
import { getPrompt as localGetPrompt, promptDictionary } from '../../../prompt';
import { EsAnonymizationFieldsSchema } from '../../../../ai_assistant_data_clients/anonymization_fields/types';
import { AssistantToolParams } from '../../../../types';
import { AgentExecutor } from '../../executors/types';
import { formatPrompt } from './prompts';
import { GraphInputs } from './types';
import { getDefaultAssistantGraph } from './graph';
import { invokeGraph, streamGraph } from './helpers';
import { transformESSearchToAnonymizationFields } from '../../../../ai_assistant_data_clients/anonymization_fields/helpers';
import { DEFAULT_DATE_FORMAT_TZ } from '../../../../../common/constants';
import { agentRunnableFactory } from './agentRunnable';
import { EsqlTelemetryTracer } from '../../tracers/esql_telemetry_tracer/esql_telemetry_tracer';

export const callAssistantGraph: AgentExecutor<true | false> = async ({
  abortSignal,
  assistantContext,
  actionsClient,
  alertsIndexPattern,
  assistantTools = [],
  connectorId,
  contentReferencesStore,
  conversationId,
  core,
  dataClients,
  esClient,
  inference,
  inferenceChatModelEnabled = false,
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
  const isOpenAI = llmType === 'openai' && !isOssModel;
  const llmClass = getLlmClass(llmType);

  /**
   * Creates a new instance of llmClass.
   *
   * This function ensures that a new llmClass instance is created every time it is called.
   * This is necessary to avoid any potential side effects from shared state. By always
   * creating a new instance, we prevent other uses of llm from binding and changing
   * the state unintentionally. For this reason, only call createLlmInstance at runtime
   */
  const createLlmInstance = async () =>
    inferenceChatModelEnabled
      ? inference.getChatModel({
          request,
          connectorId,
          chatModelOptions: {
            model: request.body.model,
            signal: abortSignal,
            temperature: getDefaultArguments(llmType).temperature,
            // prevents the agent from retrying on failure
            // failure could be due to bad connector, we should deliver that result to the client asap
            maxRetries: 0,
            metadata: {
              connectorTelemetry: {
                pluginId: 'security_ai_assistant',
              },
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
          model: request.body.model,
          // ensure this is defined because we default to it in the language_models
          // This is where the LangSmith logs (Metadata > Invocation Params) are set
          temperature: getDefaultArguments(llmType).temperature,
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

  const chatPromptTemplate = formatPrompt({
    prompt: defaultSystemPrompt,
    additionalPrompt: systemPrompt,
    llmType,
  });

  const llm = await createLlmInstance();
  const agentRunnable = await agentRunnableFactory({
    llm,
    llmType,
    tools,
    inferenceChatModelEnabled,
    isOpenAI,
    isStream,
    prompt: chatPromptTemplate,
  });

  const { provider } =
    !llmType || llmType === 'inference'
      ? await resolveProviderAndModel({
          connectorId,
          actionsClient,
        })
      : { provider: llmType };

  const uiSettingsDateFormatTimezone = await core.uiSettings.client.get<string>(
    DEFAULT_DATE_FORMAT_TZ
  );

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
    getFormattedTime: () =>
      getFormattedTime({
        screenContextTimezone: screenContext?.timeZone,
        uiSettingsDateFormatTimezone,
      }),
    telemetry,
    telemetryParams,
    contentReferencesStore,
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

  const callbacks: Callbacks = [
    new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger),
    ...(traceOptions?.tracers ?? []),
    ...(telemetryParams
      ? [
          new TelemetryTracer(
            {
              elasticTools: tools.map(({ name }) => name),
              totalTools: tools.length,
              telemetry,
              telemetryParams,
            },
            logger
          ),
          new EsqlTelemetryTracer(
            {
              telemetry,
              telemetryParams,
            },
            logger
          ),
        ]
      : []),
  ];
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
      model,
      telemetryParams,
      telemetry,
    }).catch((error) => {
      logger.error(`Failed to generate chat title: ${error.message}`);
    });
  })();

  if (isStream) {
    return streamGraph({
      assistantGraph,
      inputs,
      inferenceChatModelEnabled,
      isEnabledKnowledgeBase: telemetryParams?.isEnabledKnowledgeBase ?? false,

      logger,
      onLlmResponse,
      request,
      telemetry,
      traceOptions,
      callbacks,
    });
  }

  const graphResponse = await invokeGraph({
    assistantGraph,
    inputs,
    onLlmResponse,
    traceOptions,
    callbacks,
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
