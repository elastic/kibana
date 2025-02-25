
import { getApiSpec } from './helper';
import Oas from 'oas';
import { tool } from '@langchain/core/tools';
import { JsonSchema, jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { z } from 'zod';
import { SchemaObject } from 'oas/dist/types.cjs';
import { parse } from 'uri-template';


type Operation = ReturnType<Oas['operation']>
type OperationOrWebhook = ReturnType<Oas['getOperationById']>

export const generateToolsFromOpenApiSpec = async () => {
    const apiSpec = getApiSpec()
    const oas = new Oas(apiSpec);
    await oas.dereference()

    const operations = Object.values(oas.getPaths())
        .map(operationByMathod => Object.values(operationByMathod))
        .flat()
        .filter(isOperation)

    return operations.map((operation) => {

        return tool(async (input) => {
            const params = new URLSearchParams(input.query);
            const pathname = parse(operation.path).expand(input.path)

            const url = new URL(pathname, "http://localhost:5601");
            url.search = params.toString()

            const requestOptions = {
                method: operation.method.toUpperCase(),
                headers: { ...input.header, "Authorization": `Basic ZWxhc3RpYzpjaGFuZ2VtZQ==` },
                body: JSON.stringify(input.body)
            }

            return await fetch(url.toString(), requestOptions).then((res) => res.json())
        }, {
            name: operation.getOperationId(),
            description: [operation.getDescription(), ...operation.getTags().map(tag => tag.description)].join('\n'),
            tags: operation.getTags().map(tag => tag.name),
            schema: getParametersAsZodSchema(operation),
            verbose: true,
            verboseParsingErrors: true

        })
    }).flat()
        .filter((t) => t != null)
}


const getParametersAsZodSchema = (operation: Operation) => {
    const schemaTypeToSchemaObject = operation
        .getParametersAsJSONSchema()
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

const isOperation = (operation: OperationOrWebhook): operation is Operation => {
    return operation.isWebhook() === false
}