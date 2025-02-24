
import { OpenAPI } from 'openapi-types';
import { getApiSpec } from './helper';
import Oas from 'oas';
import { tool } from '@langchain/core/tools';
import { JsonSchema, jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { z } from 'zod';
import { SchemaObject } from 'oas/dist/types.cjs';
import {parse} from 'uri-template';

type GroupedByTag = {
    [tag: string]: OpenAPI.Document<{}>['paths']
}

const methods = ['get', 'post'] as const
const operationIds = ['createCaseDefaultSpace', 'addCaseCommentDefaultSpace', 'findCaseCommentsDefaultSpace', 'deleteCaseDefaultSpace', "findCasesDefaultSpace", "updateCaseDefaultSpace"] as const //"findCasesDefaultSpace", 

export const generateOpenApiGraph = async () => {
    const apiSpec = await getApiSpec()
    const oas = new Oas(apiSpec);
    await oas.dereference()
    const operations = oas.getPaths()
    const operationId = Object.values(operations).map((operation) => Object.values(operation)).flat().map((operation) => operation.getOperationId())
    console.log(operationId)
    return operationIds.map((operationId) => oas.getOperationById(operationId)).map((operation) => {
        const method = operation.method
        const path = operation.path
        if (!operation) return undefined
        const tags = operation.getTags()
        if (!tags.map(tag => tag.name).includes('cases')) return undefined
        const toolDescription = [...tags.map(tag => tag.description), operation.getDescription()].join(' ')
        const operationId = operation.getOperationId()
        const schema = operation.getParametersAsJSONSchema()


        const schemas = (schema ?? []).reduce((total, next) => {
            if (!next.schema) return total
            return { [next.type]: next.schema, ...total }
        }, {} as Record<string, SchemaObject>)

        const toolSchema = z.object(Object.keys(schemas).reduce((total, next) => {
            const schema = schemas[next]
            const zodSchema = jsonSchemaToZod(schema as JsonSchema)
            return { ...total, [next]: zodSchema }
        }, {}))


        return tool(async (input) => {

            const query = input.query
            const body = input.body
            const header = input.header
            const queryString = new URLSearchParams(query).toString();
            const finalPath = parse(path).expand(input.path)

            console.table({ path, query, body, header, method })
            const requestPath = `http://localhost:5601${finalPath}?${queryString}`

            const requestOptions = {
                method: method.toUpperCase(),
                headers: { ...header, "Authorization": `Basic ZWxhc3RpYzpjaGFuZ2VtZQ==` },
                body: JSON.stringify(body)
            }

            console.log(requestPath)
            console.log(JSON.stringify(requestOptions, null, 2))

            return await fetch(requestPath, requestOptions).then((res) => res.json())
        }, {
            name: operationId,
            description: toolDescription,
            tags: tags.map(tag => tag.name),
            schema: toolSchema,
            verbose: true,
            verboseParsingErrors: true
            
        })
    }).flat().filter((e) => e != null)
}


