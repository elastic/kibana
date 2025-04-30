/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Oas from 'oas';
import type { JsonSchema, JsonSchemaObject, Refs } from '@n8n/json-schema-to-zod';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import type { SchemaObject } from 'oas/dist/types.cjs';
import { z } from '@kbn/zod';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { groupBy, isEmpty, memoize } from 'lodash';
import { formatToolName, isOperation } from './utils';
import type { Operation } from './utils';
import { LlmType } from '@kbn/elastic-assistant-plugin/server/types';

export abstract class OpenApiTool<T> {
  protected dereferencedOas: Oas;
  private getParametersAsZodSchemaMemoized = memoize(
    this.getParametersAsZodSchemaInternal.bind(this),
    (args) => {
      return args.operation.getOperationId();
    }
  );
  private llmType: LlmType | undefined;

  protected constructor(args: { dereferencedOas: Oas, llmType: LlmType | undefined }) {
    const { dereferencedOas } = args;
    this.dereferencedOas = dereferencedOas;
    this.llmType = args.llmType;
  }

  protected getOperations() {
    const oas = this.dereferencedOas;
    return Object.values(oas.getPaths())
      .flatMap((operationByMethod) => Object.values(operationByMethod))
      .filter(isOperation);
  }

  protected getParametersAsZodSchema(args: { operation: Operation }) {
    return this.getParametersAsZodSchemaMemoized(args);;
  }

  // 
  protected getParserOverride(schema: JsonSchemaObject, refs: Refs, jsonSchemaToZodWithParserOverride: (schema: JsonSchema) => z.ZodTypeAny) {
    if(this.llmType == 'gemini' && schema.type === 'integer' && schema.enum && schema.enum.some(val=>typeof val === 'number')) { // Gemini does not support number enums
      schema.enum = schema.enum.map((x) => (x as number).toString())
      return jsonSchemaToZodWithParserOverride(schema)
    }
    if(this.llmType == 'gemini' && schema.exclusiveMinimum) { 
      delete schema.exclusiveMinimum // Gemini does not support exclusiveMinimum
      return jsonSchemaToZodWithParserOverride(schema)
    }
    if(this.llmType == 'gemini' && schema.exclusiveMaximum) { 
      delete schema.exclusiveMaximum // Gemini does not support exclusiveMaximum
      return jsonSchemaToZodWithParserOverride(schema)
    }
    if (this.llmType == 'gemini' && schema.oneOf) { 
      return z.any().describe(schema.description ?? ''); // Gemini does not support oneOf so we use any
    }
    if (this.llmType == 'gemini' && schema.anyOf && Array.isArray(schema.anyOf) && schema.anyOf.length > 1) {  // Gemini does not support types with multiple values so making sure to use only the first one
      schema.anyOf = [schema.anyOf[0]]
      return jsonSchemaToZodWithParserOverride(schema)
    }
    if (this.llmType == 'gemini' && Array.isArray(schema.type)) { 
      schema.type = schema.type[0] // Gemini does not support multiple types so we use the first one
      return jsonSchemaToZodWithParserOverride(schema)
    }
    if (schema.enum && schema.enum.every((x) => typeof x === 'string')) {
      return z.enum(schema.enum as [string]); // Gemini does not support literals so must use enums
    }
    if (schema.anyOf && schema.default) {
      delete schema.default // Gemini does not support keys alongside anyOf
      return jsonSchemaToZodWithParserOverride(schema)
    }
    if (schema.type === "array" && isEmpty(schema.items)) {
      return z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())]) // OpenAi requires items in array to be defined
    }
    if (schema.format !== undefined) {
      delete schema.format // Gemini does not support contentEncoding
      return jsonSchemaToZodWithParserOverride(schema)
    }
    if (schema.type == 'array' && schema.items && typeof schema.items !== 'boolean' && !Array.isArray(schema.items) && schema.items.type == null) {
      schema.items.type = 'string' // openAi requires item type to be defined
      return jsonSchemaToZodWithParserOverride(schema)
    }

    return undefined;
  }

  private getParametersAsZodSchemaInternal(args: { operation: Operation }) {
    const { operation } = args;
    const schemaTypeToSchemaObject = (operation.getParametersAsJSONSchema() ?? []).reduce(
      (total, next) => {
        if (!next.schema) return total;
        return { [next.type]: next.schema, ...total };
      },
      {} as Record<string, SchemaObject>
    );

    const jsonSchemaToZodWithParserOverride = (schema: JsonSchema): z.ZodTypeAny => {
      return jsonSchemaToZod(schema as JsonSchema, {
        // Overrides to ensure schema is compatible with LLM provider
        parserOverride: (schema, refs) => this.getParserOverride(schema, refs, jsonSchemaToZodWithParserOverride),
      })
    }

    const schemaTypeToZod = Object.keys(schemaTypeToSchemaObject).reduce((total, next) => {
      const schema = schemaTypeToSchemaObject[next];
      const zodSchema = jsonSchemaToZodWithParserOverride(schema as JsonSchema);
      /*  if(operation.getOperationId() === 'createAgentKey') {
         console.log(JSON.stringify(schema, null, 2))
         console.log(JSON.stringify(zodToJsonSchema(zodSchema), null, 2))
       } */
      return { ...total, [next]: zodSchema };
    }, {} as Record<'query' | 'body' | 'header' | 'path' | 'cookie' | 'formData', z.ZodTypeAny>);

    return z.object(schemaTypeToZod);
  }

  // Simple implementation that groups tools by operation tags
  async getTool(args: T) {
    const operations = this.getOperations();
    const toolsAndOperations: Array<{
      operation: Operation;
      tool: Promise<StructuredToolInterface>;
    }> = [];

    for (const operation of operations) {
      const tool = this.getToolForOperation({ operation, ...args });
      toolsAndOperations.push({
        operation,
        tool,
      });
    }

    // Group tools by operation tags
    const groupedToolsByOperationTags = groupBy(toolsAndOperations, (toolAndOperation) => {
      return toolAndOperation.operation
        .getTags()
        .map((tag) => tag.name)
        .join('_');
    });

    // Create internal node for each group
    const tools = Object.entries(groupedToolsByOperationTags)
      .filter(([tag, _]) => !!tag)
      .map(async ([tag, internalToolsAndOperations]) => {
        const internalNode = await this.getInternalNode({
          ...args,
          tools: Promise.all(
            internalToolsAndOperations.map((toolAndOperation) => toolAndOperation.tool)
          ),
          name: formatToolName(`${tag}_agent`),
          description: internalToolsAndOperations
            .map((toolAndOperation) => toolAndOperation.operation.getOperationId())
            .join('\n'),
        });
        return internalNode;
      });

    const { name, description } = this.getRootToolDetails(args);

    // Create root tool
    const rootTool = await this.getInternalNode({
      ...args,
      tools: Promise.all(tools),
      name,
      description,
    });

    return rootTool;
  }

  protected getRootToolDetails(
    args: T
  ): {
    name: string;
    description: string;
  } {
    throw new Error('Method not implemented.');
  };

  protected abstract getToolForOperation(
    args: T & { operation: Operation }
  ): Promise<StructuredToolInterface>;

  protected abstract getInternalNode(
    args: T & {
      tools: Promise<StructuredToolInterface[]>;
      name: string;
      description: string;
    }
  ): Promise<StructuredToolInterface>;
}
