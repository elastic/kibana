import {
  createMiddleware,
  AgentMiddleware,
  ToolMessage,
  AIMessage,
} from "langchain";
import { BaseMessage, RemoveMessage } from "@langchain/core/messages";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

/**
 * Create middleware that patches dangling tool calls in the messages history.
 *
 * When an AI message contains tool_calls but subsequent messages don't include
 * the corresponding ToolMessage responses, this middleware adds synthetic
 * ToolMessages saying the tool call was cancelled.
 *
 * @returns AgentMiddleware that patches dangling tool calls
 *
 * @example
 * ```typescript
 * import { createAgent } from "langchain";
 * import { createPatchToolCallsMiddleware } from "./middleware/patch_tool_calls";
 *
 * const agent = createAgent({
 *   model: "claude-sonnet-4-5-20250929",
 *   middleware: [createPatchToolCallsMiddleware()],
 * });
 * ```
 */
export function createPatchToolCallsMiddleware(): AgentMiddleware {
  return createMiddleware({
    name: "patchToolCallsMiddleware",
    beforeAgent: async (state) => {
      const messages = state.messages as BaseMessage[] | undefined;

      if (!messages || messages.length === 0) {
        return;
      }

      const patchedMessages: any[] = [];

      // Iterate over the messages and add any dangling tool calls
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        patchedMessages.push(msg);

        // Check if this is an AI message with tool calls
        if (AIMessage.isInstance(msg) && msg.tool_calls != null) {
          for (const toolCall of msg.tool_calls) {
            // Look for a corresponding ToolMessage in the messages after this one
            const correspondingToolMsg = messages
              .slice(i)
              .find(
                (m) =>
                  ToolMessage.isInstance(m) && m.tool_call_id === toolCall.id,
              );

            if (!correspondingToolMsg) {
              // We have a dangling tool call which needs a ToolMessage
              const toolMsg = `Tool call ${toolCall.name} with id ${toolCall.id} was cancelled - another message came in before it could be completed.`;
              patchedMessages.push(
                new ToolMessage({
                  content: toolMsg,
                  name: toolCall.name,
                  tool_call_id: toolCall.id!,
                }),
              );
            }
          }
        }
      }

      // Return state update with RemoveMessage followed by patched messages
      return {
        messages: [
          new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
          ...patchedMessages,
        ],
      };
    },
  });
}
