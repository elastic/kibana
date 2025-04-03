import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ElasticsearchClient } from "@kbn/core/server";
import { ActionsClientChatBedrockConverse, ActionsClientChatVertexAI, ActionsClientChatOpenAI } from "@kbn/langchain/server";
import { Command } from "@langchain/langgraph";
import { toolDetails } from "../../../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool";
import { v4 as uuidv4 } from 'uuid';
import { getCheckIfIndexContainsRequiredFieldsForQueryGraph } from "../../../check_if_index_pattern_contains_required_fields_for_query/check_if_index_pattern_contains_required_fields_for_query";


export const getCheckIfIndexContainsRequiredFields = ({
    esClient,
    createLlmInstance,
}: {
    esClient: ElasticsearchClient
    createLlmInstance: () => ActionsClientChatBedrockConverse | ActionsClientChatVertexAI | ActionsClientChatOpenAI
}) => {

    const graph = getCheckIfIndexContainsRequiredFieldsForQueryGraph({ esClient, createLlmInstance })

    return async (input: {
        objectiveSummary: string;
        indexPattern: string;
    }) => {
        const { objectiveSummary, indexPattern } = input;

        const result = await graph
            .invoke({
                indexPattern: indexPattern,
                messages: [
                    new HumanMessage({
                        content: `Does the index pattern '${indexPattern}' contain the fields required to answer the following question: \n\n${objectiveSummary}`
                    }),
                    new AIMessage({
                        content: "",
                        tool_calls: [
                            {
                                "id": uuidv4(),
                                "type": "tool_call",
                                "name": toolDetails.name,
                                "args": {
                                    indexPattern: indexPattern,
                                    key: ""
                                }
                            }
                        ]
                    })
                ]
            })


        return new Command({
            update: {
                shortlistedIndexPatternAnalysis: {
                    [indexPattern]: {
                        indexPattern: indexPattern,
                        analysis: result.analysis,
                        containsRequiredData: result.containsRequiredData,
                    }
                }
            }
        })

    }
}