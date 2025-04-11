import { CreateLlmInstance } from "../../../../utils/common";
import { AnalyzeIndexPatternAnnotation } from "../../state"
import { Command } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getInspectIndexMappingTool } from "../../../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool";
import { ElasticsearchClient } from "@kbn/core/server";

export const getExplorePartialIndexMappingAgent = ({
    createLlmInstance,
    esClient
}: {
    createLlmInstance: CreateLlmInstance
    esClient: ElasticsearchClient
}) => {

    const llm = createLlmInstance();
    const tool = getInspectIndexMappingTool({
        esClient: esClient,
        indexPattern: "placeholder"
    })
    const llmWithTools = llm.bindTools([tool])

    return async (state: typeof AnalyzeIndexPatternAnnotation.State) => {
        const { messages, input } = state;

        if (input === undefined) {
            throw new Error("Input is required");
        }

        const result = await llmWithTools
            .invoke([
                new SystemMessage({
                    content: "You are an expert in Elastic Search and particularly at analyzing indices. You have been given a function that allows you" +
                        " to explore a large index mapping. Use this function to explore the index mapping and determine whether it contains the fields " +
                        "required to write the query."
                }),
                new HumanMessage({
                    content: `Does the index mapping contain the fields required to generate a query that does the following:\n${input.question}`
                }),
                ...messages,
            ])

        return new Command({
            update: {
                messages: [result]
            }
        })
    }
}