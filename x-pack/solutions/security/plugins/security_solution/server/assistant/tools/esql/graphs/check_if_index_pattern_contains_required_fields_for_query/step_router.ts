import { messageContainsToolCalls } from "../generate_esql/step_router";
import { AGENT, RESPOND, TOOLS } from "./constants";
import { CheckIfIndexContainsRequiredFieldsAnnotation } from "./state";

export const startStepRouter = (state: typeof CheckIfIndexContainsRequiredFieldsAnnotation.State): string => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (messageContainsToolCalls(lastMessage)) {
        return TOOLS;
    }

    return AGENT
};

export const agentStepRouter = (state: typeof CheckIfIndexContainsRequiredFieldsAnnotation.State): string => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (messageContainsToolCalls(lastMessage)) {
        return TOOLS;
    }

    return RESPOND
};


