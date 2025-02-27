
import { getApiSpec } from './helper';
import Oas from 'oas';
import { tool } from '@langchain/core/tools';
import { JsonSchema, jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { z } from 'zod';
import { SchemaObject } from 'oas/dist/types.cjs';
import { parse } from 'uri-template';
import { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { castArray, first, pick, pickBy } from 'lodash';
import { CoreContext } from '@kbn/core/public';

const copiedHeaderNames = [
    'accept-encoding',
    'accept-language',
    'accept',
    'content-type',
    'cookie',
    'kbn-build-number',
    'kbn-version',
    'origin',
    'referer',
    'user-agent',
    'x-elastic-internal-origin',
    'x-elastic-product-origin',
    'x-kbn-context',
];

type Operation = ReturnType<Oas['operation']>
type OperationOrWebhook = ReturnType<Oas['getOperationById']>

export const generateToolsFromOpenApiSpec = async (assistantToolParams: AssistantToolParams) => {
    const apiSpec = getApiSpec()
    const oas = new Oas(apiSpec);
    await oas.dereference()

    const operations = Object.values(oas.getPaths())
        .map(operationByMethod => Object.values(operationByMethod))
        .flat()
        .filter(isOperation)

    return operations.map((operation) => {

        return tool(async (input) => {

            const { request } = assistantToolParams
            const { origin } = request.rewrittenUrl || request.url;

            const params = new URLSearchParams(input.query);
            const pathname = parse(operation.path).expand(input.path)

            // TODO: Handle the case where there is a kibana base url. Get baseUrl from coreStart
            const url = new URL(pathname, origin);
            url.search = params.toString()

            const headers = pickBy(request.headers, (value, key) => {
                return (
                    copiedHeaderNames.includes(key.toLowerCase()) || key.toLowerCase().startsWith('sec-')
                );
            });

            const requestOptions = {
                method: operation.method.toUpperCase(),
                headers: { ...input.header, ...headers },
                body: JSON.stringify(input.body)
            }

            return await fetch(url.toString(), requestOptions).then((res) => res.json())
        }, {
            name: operation.getOperationId(),
            description: [operation.getDescription(), ...operation.getTags().map(tag => tag.description), operation.getRequestBodyExamples()].join('\n'),
            tags: operation.getTags().map(tag => tag.name),
            schema: getParametersAsZodSchema(operation),
            verbose: true,
            verboseParsingErrors: true
        })
    }).flat().filter((t) => t != null)
}



const getParametersAsZodSchema = (operation: Operation) => {
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

const isOperation = (operation: OperationOrWebhook): operation is Operation => {
    return operation.isWebhook() === false
}