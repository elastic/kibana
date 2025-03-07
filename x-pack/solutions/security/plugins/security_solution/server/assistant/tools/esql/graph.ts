import { StructuredToolInterface } from "@langchain/core/tools";
import { getIndexNamesTool } from "./index_names_tool";
import { ElasticsearchClient, KibanaRequest } from "@kbn/core/server";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { END, START, StateGraph } from "@langchain/langgraph";
import { EsqlSelfHealingAnnotation } from "./state";
import { ESQL_VALIDATOR_NODE, NL_TO_ESQL_AGENT_NODE, TOOLS_NODE } from "./constants";
import { stepRouter } from "./step_router";
import { getNlToEsqlAgent } from "./nl_to_esql_agent";
import { InferenceServerStart } from "@kbn/inference-plugin/server";
import { Logger } from '@kbn/core/server';
import { getValidatorNode } from "./validator";
import { getInspectIndexMappingTool } from "./inspect_index_mapping_tool";

export const getEsqlSelfHealingGraph = ({
    esClient,
    connectorId,
    inference,
    logger,
    request,
}: {
    esClient: ElasticsearchClient
    connectorId: string,
    inference: InferenceServerStart,
    logger: Logger,
    request: KibanaRequest,
}
) => {

    const availableIndexNamesTool = getIndexNamesTool({
        esClient
    })
    const inspectIndexMappingTool = getInspectIndexMappingTool({
        esClient
    })

    const tools: StructuredToolInterface[] = [
        availableIndexNamesTool,
        inspectIndexMappingTool
    ]

    const toolNode = new ToolNode(tools)
    const nlToEsqlAgentNode = getNlToEsqlAgent({
        connectorId,
        inference,
        logger,
        request,
        tools,
    })
    const validatorNode = getValidatorNode({
        esClient
    })

    const graph = new StateGraph(EsqlSelfHealingAnnotation)
        .addNode(NL_TO_ESQL_AGENT_NODE, nlToEsqlAgentNode)
        .addNode(TOOLS_NODE, toolNode)
        .addNode(ESQL_VALIDATOR_NODE, validatorNode, {
            ends: [END, NL_TO_ESQL_AGENT_NODE]
        })
        .addEdge(START, NL_TO_ESQL_AGENT_NODE)
        .addEdge(TOOLS_NODE, NL_TO_ESQL_AGENT_NODE)
        .addConditionalEdges(NL_TO_ESQL_AGENT_NODE, stepRouter, {
            [TOOLS_NODE]: TOOLS_NODE,
            [ESQL_VALIDATOR_NODE]: ESQL_VALIDATOR_NODE
        }).compile()

    return graph
}