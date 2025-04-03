import { IdentityIndexAnnotation } from "../../state"
import { Command } from "@langchain/langgraph";
import { buildTree, getIndexPatterns } from "./utils";
import { ElasticsearchClient } from "@kbn/core/server";

export const fetchIndexPatterns = ({ esClient }: {
    esClient: ElasticsearchClient
}) => {

    return async (state: typeof IdentityIndexAnnotation.State) => {

        const indicesResolveIndexResponse = await esClient.indices.resolveIndex({
            name: '*',
            expand_wildcards: 'open',
        });

        
        // Stores indices that do not have any datastreams or aliases
        const indicesWithoutDatastreamsOrAliases = new Set<string>();
        const seenIndices = new Set<string>();
        const dataStreamsAndAliases = new Set<string>();

        for (const dataStream of indicesResolveIndexResponse.data_streams){
            for (const index of dataStream.backing_indices) {
                seenIndices.add(index);
            }
            dataStreamsAndAliases.add(dataStream.name);
        }

        for (const alias of indicesResolveIndexResponse.aliases) {
            for (const index of alias.indices) {
                seenIndices.add(index);
            }
            dataStreamsAndAliases.add(alias.name);
        }

        // Add indices that do not have any datastreams or aliases
        for (const index of indicesResolveIndexResponse.indices) {
            if (!seenIndices.has(index.name)) {
                indicesWithoutDatastreamsOrAliases.add(index.name);
            }
        }

            
        const indexNamePartRootNode = buildTree([...indicesWithoutDatastreamsOrAliases, ...dataStreamsAndAliases]);
        const constructedIndexPatterns = getIndexPatterns(indexNamePartRootNode, { ignoreDigitParts: true });

        const indexPatterns = new Set<string>();

        // Add any index patterns that could be constructed from the indices
        for (const indexPattern of constructedIndexPatterns.indexPatterns) {
            indexPatterns.add(indexPattern);
        }

        // Add any remaining indices that did not match any patterns
        for (const remainingIndex of constructedIndexPatterns.remainingIndices) {
            indexPatterns.add(remainingIndex);
        }

        const availableIndexPatterns = Array.from(indexPatterns).filter((indexPattern) => !indexPattern.startsWith("."));

        return new Command({
            update: {
                indexPatterns: availableIndexPatterns
            }
        })
    }
}