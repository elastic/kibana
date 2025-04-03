import { Command } from "@langchain/langgraph";
import { EsqlSelfHealingAnnotation } from "../../state";

export const getBuildSuccessReportFromLastMessageNode = () => {
    return async (state: typeof EsqlSelfHealingAnnotation.State) => {
        const { messages, validateEsqlResults } = state;
        const lastMessage = messages[messages.length - 1];

        const containsInvalidQueries = validateEsqlResults.some((result) => !result.isValid);

        if (containsInvalidQueries) {
            throw new Error('Expected all queries to be valid.');
        }

        return new Command({
            update: {
                messages: [
                    `${lastMessage.content}\n\nAll queries have been validated.`,
                ],
            },
        });
    }
}