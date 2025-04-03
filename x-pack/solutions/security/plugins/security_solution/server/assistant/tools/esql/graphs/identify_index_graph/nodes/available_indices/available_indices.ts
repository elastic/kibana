import { ElasticsearchClient } from "@kbn/core/server";
import { Command } from "@langchain/langgraph";
import { IdentityIndexAnnotation } from "../../state";


export const getAvailableIndexNames = ({
    esClient,
}: {
    esClient: ElasticsearchClient
}) => {

    return async (state: typeof IdentityIndexAnnotation.State) => {

        const indicesResolveIndexResponse = await esClient.indices.resolveIndex({
            name: '*',
            expand_wildcards: 'open',
        });

        const resolvedIndexNames = Object.values(indicesResolveIndexResponse) // Check if there are duplicates
            .flat()
            .map((item) => item.name as string)
            .filter((item) => !item.startsWith("."))
            .sort();

        return new Command({
            update: {
                availableIndices: resolvedIndexNames
            }
        })
    }

}