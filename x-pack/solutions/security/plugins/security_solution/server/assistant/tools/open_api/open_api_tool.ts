import { AssistantTool, AssistantToolParams } from "@kbn/elastic-assistant-plugin/server";
import { APP_UI_ID } from "@kbn/security-solution-plugin/common";
import { generateToolsFromOpenApiSpec } from "./generate_open_api_graph";
import { groupBy } from "lodash";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "langchain/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { PromptTemplate } from "@langchain/core/prompts";

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
            tools.flatMap(tool => tool.tags?.map(tag => ({ tag, ...tool }))) as (DynamicStructuredTool&{tag:string})[],
            "tag"
        )

        const apiAgents = Object.keys(groupedByTag).map(tag => {
            const tools= groupedByTag[tag].filter(tool => tool != null)
            return createReactAgent({
                llm: model,
                tools: tools,
                prompt: PromptTemplate.fromTemplate(`You are a research agent who is an expert in calling apis related to ${tag}. You can ask me to call any api and I will provide you with the results. You can also ask me to call multiple apis in a sequence.`)
              })

        })

        const workflow = createSupervisor({
            agents: apiAgents,
            llm: model,
            prompt: "You are a supervisor managing a team of agents who are experts in calling various apis. You can ask them to call any api and they will provide you with the results. You can also ask them to call multiple apis in a sequence.", 
              
          });

        

        return tools
    },
} as unknown as AssistantTool;