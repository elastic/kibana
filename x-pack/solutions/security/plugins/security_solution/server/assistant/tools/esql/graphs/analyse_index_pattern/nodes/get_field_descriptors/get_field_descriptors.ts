import { IndexPatternsFetcher } from "@kbn/data-plugin/server";
import { AnalyzeIndexPatternAnnotation } from "../../state";
import { ElasticsearchClient } from "@kbn/core/server";
import { Command } from "@langchain/langgraph";

export const getFieldDescriptors = ({ esClient }: { esClient: ElasticsearchClient }) => {
    const indexPatternsFetcher = new IndexPatternsFetcher(esClient);

    return async (state: typeof AnalyzeIndexPatternAnnotation.State) => {
        if (state.input === undefined) {
            throw new Error('State input is undefined');
        }

        const { indexPattern } = state.input;
        const { fields: fieldDescriptors } = await indexPatternsFetcher.getFieldsForWildcard({
            pattern: indexPattern,
            fieldCapsOptions: {
                allow_no_indices: false,
                includeUnmapped: false,
            },
        });

        return new Command({
            update: {
                fieldDescriptors
            },
        })
    }
}