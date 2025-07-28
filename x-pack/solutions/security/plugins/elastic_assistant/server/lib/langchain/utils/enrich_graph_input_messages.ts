import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { getPrompt, promptDictionary } from "../../prompt";
import { promptGroupId } from "../../prompt/local_prompt_object";
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';

type Params = {
    llmType?: string;
    connectorId: string;
    savedObjectsClient: SavedObjectsClientContract;
    actionsClient: PublicMethodsOf<ActionsClient>
    messages: BaseMessage[];
}

/**
 * Apply enrichments to a conversation
 */
export const enrichConversation = (params: Params) => {
    const userPromptEnricher = userPrompt(params);
    return userPromptEnricher(params.messages);
}

/**
 * Prepends the user prompt to the last message if the last message is a human message.
 */
const userPrompt = (params: Pick<Params, 'actionsClient' | 'savedObjectsClient' | "connectorId" | "llmType">) => {

    return async (messages: BaseMessage[]): Promise<BaseMessage[]> => {
        const userPrompt =
            params.llmType === 'gemini'
                ? await getPrompt({
                    actionsClient: params.actionsClient,
                    connectorId: params.connectorId,
                    promptId: promptDictionary.userPrompt,
                    promptGroupId: promptGroupId.aiAssistant,
                    provider: 'gemini',
                    savedObjectsClient: params.savedObjectsClient,
                })
                : '';

        if (!userPrompt) {
            return messages;
        }

        const lastMessage = messages[messages.length - 1];
        if (lastMessage instanceof HumanMessage) {
            messages[messages.length - 1] = new HumanMessage(userPrompt + lastMessage.content, lastMessage.additional_kwargs);
        }
        return messages;
    }
}