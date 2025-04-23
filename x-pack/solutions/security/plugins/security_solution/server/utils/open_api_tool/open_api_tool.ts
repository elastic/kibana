import Oas from "oas";
import { fixOpenApiSpecIteratively, formatToolName, isOperation, Operation } from "./utils";
import { parse } from 'yaml'
import { JsonSchema, jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { SchemaObject } from 'oas/dist/types.cjs';
import { z } from "zod";
import { StructuredToolInterface } from "@langchain/core/tools";
import { groupBy } from "lodash";

export abstract class OpenApiTool {
    private dereferencedOas: Promise<Oas>

    constructor(args: {
        apiSpec: Promise<any>
    }) {
        const { apiSpec } = args;

        this.dereferencedOas = new Promise<Oas>(async (resolve, reject) => {
            try {
                const apiSpecString = await apiSpec
                const api = await parse(apiSpecString);
                // Fix OpenAPI spec to make it valid
                const fixedApiSpec = fixOpenApiSpecIteratively(api);
                const oas = new Oas(fixedApiSpec);
                await oas.dereference()
                    .then(async () => {
                        resolve(oas)
                    })
            } catch (error) {
                reject(error)
                return
            }
        })
    }

    protected async getOperations() {
        const oas = await this.dereferencedOas;
        return Object.values(oas.getPaths())
            .map(operationByMethod => Object.values(operationByMethod))
            .flat()
            .filter(isOperation)
    }

    protected async getParametersAsZodSchema(args: {
        operation: Operation
    }) {
        const { operation } = args;
        const schemaTypeToSchemaObject = (operation
            .getParametersAsJSONSchema() ?? [])
            .reduce((total, next) => {
                if (!next.schema) return total
                return { [next.type]: next.schema, ...total }
            }, {} as Record<string, SchemaObject>)

        const schemaTypeToZod = Object.keys(schemaTypeToSchemaObject)
            .reduce((total, next) => {
                const schema = schemaTypeToSchemaObject[next]
                const zodSchema = jsonSchemaToZod(schema as JsonSchema)
                return { ...total, [next]: zodSchema }
            }, {} as Record<"query" | "body" | "header" | "path" | "cookie" | "formData", z.ZodTypeAny>)

        return z.object(schemaTypeToZod)
    }

    // Simple implementation that groups tools by operation tags
    async getTool() {
        const operations = await this.getOperations()
        const toolsAndOperations = await Promise.all(operations.map(operation => {
            return this.getToolForOperation({ operation })
                .then(tool => ({
                    tool,
                    operation
                }))
        }))

        // Group tools by operation tags
        const groupedToolsByOperationTags = groupBy(toolsAndOperations, (toolAndOperation) => {
            return toolAndOperation.operation.getTags().map(tag => tag.name).join('_')
        })

        // Create internal node for each group
        const tools = await Promise.all(Object.entries(groupedToolsByOperationTags).filter(([tag, _]) => !!tag).map(async ([tag, toolsAndOperations]) => {
            const internalNode = await this.getInternalNode({
                tools: toolsAndOperations.map(toolAndOperation => toolAndOperation.tool),
                name: formatToolName(`kibana_${tag}_agent`),
                description: toolsAndOperations.map(toolAndOperation => toolAndOperation.operation.getOperationId()).join('\n')
            })
            return internalNode
        }))

        // Create root tool
        const rootTool = await this.getInternalNode({
            tools,
            name: 'kibana_tool',
            description: 'Kibana tool'
        })

        return rootTool
    }

    protected abstract getToolForOperation(args: { operation: Operation }): Promise<StructuredToolInterface>;

    protected abstract getInternalNode(args: {
        tools: StructuredToolInterface[]
        name: string
        description: string
    }): Promise<StructuredToolInterface>;
}