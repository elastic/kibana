import { Command } from "@langchain/langgraph";
import { EsqlSelfHealingAnnotation } from "../../state"
import { lastMessageWithErrorReport } from "./utils";

export const getBuildErrorReportFromLastMessageNode = () => {
    return async (state: typeof EsqlSelfHealingAnnotation.State) => {
        const { messages, validateEsqlResults } = state;
        const lastMessage = messages[messages.length - 1];

        const containsInvalidQueries = validateEsqlResults.some((result) => !result.isValid);

        if (!containsInvalidQueries) {
            throw new Error('Expected at least one invalid query to be present in the last message');
        }

        return new Command({
            update: {
                messages: [
                    lastMessageWithErrorReport(lastMessage.content as string, validateEsqlResults),
                ],
            },
        });
    }
}