import { AssistantTool, AssistantToolParams } from "@kbn/elastic-assistant-plugin/server";
import { APP_UI_ID } from "@kbn/security-solution-plugin/common";
import { generateToolsFromOpenApiSpec } from "./generate_open_api_graph";
import { groupBy } from "lodash";

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

        const tools = await generateToolsFromOpenApiSpec(params)

        const groupedByTag = groupBy(
            tools.flatMap(tool => tool.tags?.map(tag => ({ tag, ...tool }))),
            "tag"
        )

        

        return tools
    },
} as unknown as AssistantTool;