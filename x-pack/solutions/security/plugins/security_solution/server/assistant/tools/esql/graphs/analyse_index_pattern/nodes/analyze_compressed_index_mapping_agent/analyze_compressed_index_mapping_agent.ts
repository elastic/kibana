import { z } from "zod";
import { mapFieldDescriptorToNestedObject } from "../../../../tools/inspect_index_mapping_tool/inspect_index_utils";
import { CreateLlmInstance } from "../../../../utils/common";
import { AnalyzeIndexPatternAnnotation } from "../../state"
import { compressMapping } from "./compress_mapping";
import { Command } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const structuredOutput = z.object({
    containsRequiredFieldsForQuery: z.boolean().describe('Whether the index pattern contains the required fields for the query'),
})

export const getAnalyzeCompressedIndexMappingAgent = ({
    createLlmInstance
}: {
    createLlmInstance: CreateLlmInstance
}) => {
    const llm = createLlmInstance();
    return async (state: typeof AnalyzeIndexPatternAnnotation.State) => {
        const { fieldDescriptors, input } = state;
        if (fieldDescriptors === undefined) {
            throw new Error('State fieldDescriptors is undefined');
        }
        if (input === undefined) {
            throw new Error('State input is undefined');
        }

        const prunedFields = fieldDescriptors.map(fieldDescriptor => ({ name: fieldDescriptor.name, type: fieldDescriptor.esTypes[0] }))
        const nestedObject = mapFieldDescriptorToNestedObject(prunedFields);
        const compressedIndexMapping = compressMapping(nestedObject);

        const result = await llm
            .withStructuredOutput(structuredOutput, { name: 'indexMappingAnalysis' })
            .invoke([
                new SystemMessage({
                    content: "You are a security analyst who is an expert in Elasticsearch and particularly at analyzing indices. " +
                        "You have been given an index mapping and an explanation of the query that we are trying to generate. Analyze " +
                        "the index mapping and determine whether it contains the fields required to write the query."
                }),
                new HumanMessage({
                    content: `Query objective:${input.question}\nIndex pattern: '${input.indexPattern}'\n\n Compressed index mapping:\n${compressedIndexMapping}`,
                }),
            ])

        return new Command({
            update: {
                output: {
                    containsRequiredFieldsForQuery: result.containsRequiredFieldsForQuery,
                    context: compressedIndexMapping
                }
            }
        })


    }

}