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
import type { LlmType } from '@kbn/elastic-assistant-plugin/server/types';
import { formatToolName, isOperation } from './utils';
import type { Operation } from './utils';

export abstract class OpenApiTool<T> {
  protected dereferencedOas: Oas;
  private getParametersAsZodSchemaMemoized = memoize(
    this.getParametersAsZodSchemaInternal.bind(this),
    (args) => {
      return args.operation.getOperationId();
    }
  );
  protected llmType: LlmType | undefined;

  protected constructor(args: { dereferencedOas: Oas; llmType: LlmType | undefined }) {
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
    return this.getParametersAsZodSchemaMemoized(args);
  }

  // Modify JSON schema to be compatible with LLM providers
  protected getParserOverride(
    schema: JsonSchemaObject,
    refs: Refs,
    jsonSchemaToZodWithParserOverride: (schema: JsonSchema) => z.ZodTypeAny
  ) {
    if (schema.enum && schema.enum.every((x) => typeof x === 'string')) {
      return z.enum(schema.enum as [string]); // Gemini does not support literals so must use enums
    }
    if (schema.type === 'array' && isEmpty(schema.items)) {
      return z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())]); // OpenAi requires items in array to be defined
    }
    if (this.llmType == 'gemini' && schema.oneOf !== undefined && Array.isArray(schema.oneOf)) {
      // Gemini does not support oneOf so we use any
      return z.any().describe(schema.description ?? ''); // Gemini does not support oneOf so we use any
    }
    let modified = false;
    if (
      this.llmType == 'gemini' &&
      schema.type === 'integer' &&
      schema.enum &&
      schema.enum.some((val) => typeof val === 'number')
    ) {
      // Gemini does not support number enums
      schema.enum = schema.enum.map((x) => (x as number).toString());
      modified = true;
    }
    if (this.llmType == 'gemini' && schema.exclusiveMinimum !== undefined) {
      delete schema.exclusiveMinimum; // Gemini does not support exclusiveMinimum
      modified = true;
    }
    if (this.llmType == 'gemini' && schema.exclusiveMaximum !== undefined) {
      delete schema.exclusiveMaximum; // Gemini does not support exclusiveMaximum
      modified = true;
    }
    if (
      this.llmType == 'gemini' &&
      schema.anyOf &&
      Array.isArray(schema.anyOf) &&
      schema.anyOf.length > 1
    ) {
      // Gemini does not support types with multiple values so making sure to use only the first one
      schema.anyOf = [schema.anyOf[0]];
      modified = true;
    }
    if (this.llmType == 'gemini' && Array.isArray(schema.type)) {
      schema.type = schema.type[0]; // Gemini does not support multiple types so we use the first one
      modified = true;
    }
    if (schema.anyOf !== undefined && schema.default !== undefined) {
      delete schema.default; // Gemini does not support keys alongside anyOf
      modified = true;
    }
    if (schema.format !== undefined) {
      delete schema.format; // Gemini does not support contentEncoding
      modified = true;
    }
    if (
      schema.type == 'array' &&
      schema.items &&
      typeof schema.items !== 'boolean' &&
      !Array.isArray(schema.items) &&
      schema.items.type === undefined
    ) {
      schema.items.type = 'string'; // requires item type to be defined
      modified = true;
    }

    if (modified) {
      return jsonSchemaToZodWithParserOverride(schema);
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
        parserOverride: (schema, refs) =>
          this.getParserOverride(schema, refs, jsonSchemaToZodWithParserOverride),
      });
    };

    const schemaTypeToZod = Object.keys(schemaTypeToSchemaObject).reduce((total, next) => {
      const schema = schemaTypeToSchemaObject[next];
      const zodSchema = jsonSchemaToZodWithParserOverride(schema as JsonSchema);
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

  protected getRootToolDetails(args: T): {
    name: string;
    description: string;
  } {
    throw new Error('Method not implemented.');
  }

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
