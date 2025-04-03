import { Command } from "@langchain/langgraph";
import { EsqlSelfHealingAnnotation } from "../../state";
import { lastMessageWithUnvalidatedReport } from "./utils";

export const getBuildUnvalidatedReportFromLastMessageNode = () => {
    return async (state: typeof EsqlSelfHealingAnnotation.State) => {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];

        return new Command({
            update: {
                messages: [
                    `${lastMessageWithUnvalidatedReport(lastMessage.content as string).content}\n\n Make it clear in your final response that the query was not validated. I was unable to find a suitable index pattern that contains the required date.`,
                ],
            },
        });
    }
}