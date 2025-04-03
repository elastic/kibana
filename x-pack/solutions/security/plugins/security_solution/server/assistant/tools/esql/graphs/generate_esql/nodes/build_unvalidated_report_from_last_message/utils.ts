import { BaseMessage, HumanMessage } from "@langchain/core/messages";

export const lastMessageWithUnvalidatedReport = (lastMessage: string): BaseMessage => {
    let result = "";
    let startIndex = 0;

    while (true) {
        const start = lastMessage.indexOf("```esql", startIndex);
        if (start === -1) break;

        const end = lastMessage.indexOf("```", start + 7);
        if (end === -1) break;

        result += lastMessage.substring(startIndex, end) + "\n// This query was not validated.\n```";
        startIndex = end + 3;
    }

    result += lastMessage.substring(startIndex);

    return new HumanMessage({
        content: result,
    })
}