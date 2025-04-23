import Oas from "oas";
import { formatToolName, isOperation, Operation } from "./utils";
import { JsonSchema, jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { SchemaObject } from 'oas/dist/types.cjs';
import { z } from "zod";
import { StructuredToolInterface } from "@langchain/core/tools";
import { groupBy, memoize } from "lodash";

export abstract class OpenApiTool<T> {
    private dereferencedOas: Oas
    private getParametersAsZodSchemaMemoized = memoize(this.getParametersAsZodSchemaInternal.bind(this), (args) =>{
        return args.operation.getOperationId()
    });

    protected constructor(args: {
        dereferencedOas: Oas
    }) {
        const { dereferencedOas } = args;
        this.dereferencedOas = dereferencedOas;
    }

    protected getOperations() {
        const oas = this.dereferencedOas;
        return Object.values(oas.getPaths())
            .map(operationByMethod => Object.values(operationByMethod))
            .flat()
            .filter(isOperation)
    }

    protected getParametersAsZodSchema(args: {
        operation: Operation
    }) {
        return this.getParametersAsZodSchemaMemoized(args)
    }

    private getParametersAsZodSchemaInternal(args: {
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
    async getTool(args: T) {
        const operations = this.getOperations()
        const toolsAndOperations: { operation: Operation, tool: Promise<StructuredToolInterface> }[] = []

        for (const operation of operations) {
            const tool = this.getToolForOperation({ operation, ...args })
            toolsAndOperations.push({
                operation,
                tool
            })
        }

        // Group tools by operation tags
        const groupedToolsByOperationTags = groupBy(toolsAndOperations, (toolAndOperation) => {
            return toolAndOperation.operation.getTags().map(tag => tag.name).join('_')
        })


        // Create internal node for each group
        const tools = Object.entries(groupedToolsByOperationTags)
            .filter(([tag, _]) => !!tag)
            .map(async ([tag, toolsAndOperations]) => {
                const internalNode = await this.getInternalNode({
                    ...args,
                    tools: Promise.all(toolsAndOperations.map(toolAndOperation => toolAndOperation.tool)),
                    name: formatToolName(`kibana_${tag}_agent`),
                    description: toolsAndOperations.map(toolAndOperation => toolAndOperation.operation.getOperationId()).join('\n'),
                })
                return internalNode
            })


        // Create root tool
        const rootTool = await this.getInternalNode({
            ...args,
            tools: Promise.all(tools),
            name: 'kibana_tool',
            description: 'Kibana tool',
        })

        return rootTool
    }

    protected abstract getToolForOperation(args: T & { operation: Operation }): Promise<StructuredToolInterface>;

    protected abstract getInternalNode(args: T & {
        tools: Promise<StructuredToolInterface[]>
        name: string
        description: string
    }): Promise<StructuredToolInterface>;
}