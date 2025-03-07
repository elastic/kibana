import { ElasticsearchClient } from "@kbn/core/server"
import { tool } from "@langchain/core/tools"
import { z } from "zod"

const toolDetails = {
    name: "inspect_index_mapping",
    description: `Use this tool to inspect an index mapping. The tool with fetch the mappings of the provided indexName and then return the data at the given propertyKey. For example:

Example index mapping:
\`\`\`
{
    "mappings": {
        "properties": {
            "field1": {
                "type": "keyword"
            },
            "field2": {
                "properties": {
                    "nested_field": {
                        "type": "keyword"
                    }
                }

            }
        }
    }
}
\`\`\`

Input:
\`\`\`
{
    "indexName": "my_index",
    "propertyKey": "mappings.properties"
}
\`\`\`

Output:
\`\`\`
{
    "field1": "Object",
    "field2": "Object"
}
\`\`\

The tool can be called repeatedly to explode objects and arrays. For example:

Input:
\`\`\`
{

    "indexName": "my_index",
    "propertyKey": "mappings.properties.field1"
}
\`\`\`

Output:
\`\`\`
{
    "type": "keyword",
}
\`\`\``
}

export const getInspectIndexMappingTool = ({
    esClient
}: {
    esClient: ElasticsearchClient
}) => {
    return tool(async ({
        indexName,
        propertyKey
    }) => {
        const indexMapping = await esClient.indices.getMapping({
            index: indexName   
        })

        const entriesAtKey = getEntriesAtKey(indexMapping[indexName], propertyKey.split("."))
        const result = formatEntriesAtKey(entriesAtKey)

        return `Object at ${propertyKey} \n${JSON.stringify(result, null, 2)}`
    }, {
        name: toolDetails.name,
        description: toolDetails.description,
        schema: z.object({
            indexName: z.string().describe(`The index name to get the properties of.`),
            propertyKey: z.string().optional().default("mappings.properties").describe(`The key to get the properties of.`)
        })
    })
}

const getEntriesAtKey = (mapping: Record<string, any> | undefined, keys: string[]): Record<string, any> | undefined => {
    if (mapping === undefined) {
        return
    }
    if (keys.length === 0) {
        return mapping
    }

    const key = keys.shift()
    if (key === undefined) {
        return mapping
    }

    return getEntriesAtKey(mapping[key], keys)
}

const formatEntriesAtKey = (mapping: Record<string, any> | undefined): Record<string, string> => {
    if (mapping === undefined) {
        return {}
    }
    return Object.entries(mapping).reduce((acc, [key, value]) => {
        acc[key] = typeof value === "string" ? value : "Object"
        return acc
    }, {} as Record<string, string>)
}