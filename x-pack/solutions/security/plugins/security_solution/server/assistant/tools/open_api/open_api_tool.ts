import { AssistantTool, AssistantToolParams } from "@kbn/elastic-assistant-plugin/server";
import { APP_UI_ID } from "@kbn/security-solution-plugin/common";
import { tool } from "@langchain/core/tools";
import { generateOpenApiGraph } from "./generate_open_api_graph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export const OPEN_API_TOOL_DETAILS = {
    id: 'api-tool',
    name: 'APITool',
    description:
        'Always call this tool to make any requests to the API',
} as const;


export const OPEN_API_TOOL: AssistantTool = {
    id: OPEN_API_TOOL_DETAILS.id,
    name: OPEN_API_TOOL_DETAILS.name,
    // note: this description is overwritten when `getTool` is called
    // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
    // local definitions can be overwritten by security-ai-prompt integration definitions
    description: OPEN_API_TOOL_DETAILS.description,
    sourceRegister: APP_UI_ID,
    isSupported: (params: AssistantToolParams) => {
        return true
    },
    async getTool(params: AssistantToolParams) {

        const result = await generateOpenApiGraph()
        return result
        return tool(
            async ({ query }) => {

                const tools = await generateOpenApiGraph();

                const agentModel = new ChatOpenAI({ temperature: 0, azureOpenAIApiKey: "93e67cb17f86496e8bc17a30bac8f108", azureOpenAIApiDeploymentName: "james-gpt4o", azureOpenAIApiVersion: "2024-02-15-preview", azureOpenAIBasePath: "https://jamesopenai.openai.azure.com/openai/deployments/" });
                const modelWithTools = agentModel.bindTools(tools);
                const result = await modelWithTools.invoke(query);
                return result.content
            },
            {
                name: OPEN_API_TOOL_DETAILS.name,
                description: OPEN_API_TOOL_DETAILS.description,
                schema: z.object({
                    query: z.string().describe(`A summary of the action to be performed`),
                }),
            }
        );
    },
} as unknown as AssistantTool;