import { lastValueFrom } from "rxjs";
import { EsqlSelfHealingAnnotation } from "./state"
import { langchainMessageToInferenceMessage, langchainToolsToInferenceTools, nlToEsqlTaskEventToLangchainMessage } from "@kbn/elastic-assistant-common";
import { StructuredToolInterface } from "@langchain/core/tools";
import { KibanaRequest } from "@kbn/core/server";
import { InferenceServerStart, naturalLanguageToEsql } from "@kbn/inference-plugin/server";
import { Logger } from '@kbn/core/server';
import { ChatCompletionMessageEvent } from "@kbn/inference-common";
import { Command } from "@langchain/langgraph";

export const getNlToEsqlAgent = ({
    connectorId,
    inference,
    logger,
    request,
    tools,
 }:{
    connectorId: string,
    inference: InferenceServerStart,
    logger: Logger,
    request: KibanaRequest,
    tools: StructuredToolInterface[]
 }) => {
    return async (state: typeof EsqlSelfHealingAnnotation.State) => {
        const { messages: stateMessages } = state;

        const inferenceMessages = stateMessages.map(langchainMessageToInferenceMessage)

        const result = await lastValueFrom(naturalLanguageToEsql({
            client: inference.getClient({ request: request }),
            connectorId: connectorId,
            functionCalling: 'auto',
            logger: logger,
            tools: langchainToolsToInferenceTools(tools),
            messages: inferenceMessages
        })) as ChatCompletionMessageEvent

        return new Command({
            update:{
                messages : [nlToEsqlTaskEventToLangchainMessage(result)]
            }
        })
    }
}