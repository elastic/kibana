import { START, StateGraph, Send, END } from "@langchain/langgraph"
import { IdentityIndexAnnotation } from "./state"
import { CHECK_IF_INDEX_PATTERN_CONTAINS_REQUIRED_FIELDS, CONVERT_INDICES_TO_INDEX_PATTERNS, GET_AVAILABLE_INDEX_NAMES, SELECT_INDEX_PATTERN, SHORTLIST_INDEX_PATTERNS } from "./constants";
import { getConvertIndicesToIndexPatterns } from "./nodes/convert_indices_to_index_patters/convert_indices_to_index_patters";
import { ActionsClientChatBedrockConverse, ActionsClientChatVertexAI, ActionsClientChatOpenAI } from "@kbn/langchain/server";
import { getShortlistIndexPatterns } from "./nodes/shortlist_index_patterns/shortlist_index_patterns";
import { getCheckIfIndexContainsRequiredFields } from "./nodes/check_if_index_contains_required_fields/check_if_index_contains_required_fields";
import { getSelectIndexPattern } from "./nodes/select_index/select_index";
import { ElasticsearchClient } from "@kbn/core/server";
import { getAvailableIndexNames } from "./nodes/available_indices/available_indices";

export const getIdentifyIndexGraph = ({
    createLlmInstance,
    esClient,
}: {
    createLlmInstance: () => ActionsClientChatBedrockConverse | ActionsClientChatVertexAI | ActionsClientChatOpenAI
    esClient: ElasticsearchClient,
}) => {

    const graph = new StateGraph(IdentityIndexAnnotation)
        .addNode(GET_AVAILABLE_INDEX_NAMES, getAvailableIndexNames({ esClient }))
        .addNode(CONVERT_INDICES_TO_INDEX_PATTERNS, getConvertIndicesToIndexPatterns({ esClient }), { retryPolicy: { maxAttempts: 3 } })
        .addNode(SHORTLIST_INDEX_PATTERNS, getShortlistIndexPatterns({ createLlmInstance }), { retryPolicy: { maxAttempts: 3 } })
        .addNode(CHECK_IF_INDEX_PATTERN_CONTAINS_REQUIRED_FIELDS, getCheckIfIndexContainsRequiredFields({
            esClient,
            createLlmInstance
        }), { retryPolicy: { maxAttempts: 3 } })
        .addNode(SELECT_INDEX_PATTERN, getSelectIndexPattern({ createLlmInstance }), { retryPolicy: { maxAttempts: 3 } })

        .addEdge(START, GET_AVAILABLE_INDEX_NAMES)
        .addEdge(GET_AVAILABLE_INDEX_NAMES, CONVERT_INDICES_TO_INDEX_PATTERNS)
        .addEdge(CONVERT_INDICES_TO_INDEX_PATTERNS, SHORTLIST_INDEX_PATTERNS)
        .addConditionalEdges(SHORTLIST_INDEX_PATTERNS, (state: typeof IdentityIndexAnnotation.State) => {
            return state.shortlistedIndexPatterns.map((indexPattern) => new Send(CHECK_IF_INDEX_PATTERN_CONTAINS_REQUIRED_FIELDS, {
                objectiveSummary: state.objectiveSummary,
                indexPattern: indexPattern
            }))
        }, {
            [CHECK_IF_INDEX_PATTERN_CONTAINS_REQUIRED_FIELDS]: CHECK_IF_INDEX_PATTERN_CONTAINS_REQUIRED_FIELDS
        })
        .addEdge(CHECK_IF_INDEX_PATTERN_CONTAINS_REQUIRED_FIELDS, SELECT_INDEX_PATTERN)
        .addEdge(SELECT_INDEX_PATTERN, END)
        .compile();

    return graph;
}
