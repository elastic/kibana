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
import { flatMap, groupBy, isEmpty, memoize } from 'lodash';
import type { LlmType } from '@kbn/elastic-assistant-plugin/server/types';
import zodToJsonSchema from 'zod-to-json-schema';
import { formatToolName, isOperation, zodObjectHasRequiredProperties } from './utils';
import type { Operation } from './utils';
import { InternalNode } from './open_api_tool_structure/internal_node';
import { OperationNode } from './open_api_tool_structure/operation_node';

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
    if (schema.oneOf !== undefined && Array.isArray(schema.oneOf)) {
      // Several providers do not support oneOf
      const minifiedJsonSchema = schema.oneOf.map((s) => zodToJsonSchema(jsonSchemaToZod(s)));
      return z
        .any()
        .describe(
          `${
            schema.description ? `${schema.description}\n\n` : ''
          }One of (oneOf) the following schemas:\n${JSON.stringify(minifiedJsonSchema)}`
        ); // Fallback to providing the schema as a description
    }
    let modified = false;
    if (
      this.llmType === 'gemini' &&
      schema.type === 'integer' &&
      schema.enum &&
      schema.enum.some((val) => typeof val === 'number')
    ) {
      // Gemini does not support number enums
      schema.enum = schema.enum.map((x) => (x as number).toString());
      modified = true;
    }
    if (this.llmType === 'gemini' && schema.exclusiveMinimum !== undefined) {
      delete schema.exclusiveMinimum; // Gemini does not support exclusiveMinimum
      modified = true;
    }
    if (this.llmType === 'gemini' && schema.exclusiveMaximum !== undefined) {
      delete schema.exclusiveMaximum; // Gemini does not support exclusiveMaximum
      modified = true;
    }
    if (
      this.llmType === 'gemini' &&
      schema.anyOf &&
      Array.isArray(schema.anyOf) &&
      schema.anyOf.length > 1
    ) {
      // Gemini does not support types with multiple values so we use any
      const minifiedJsonSchema = schema.anyOf.map((s) => zodToJsonSchema(jsonSchemaToZod(s)));
      return z
        .any()
        .describe(
          `${
            schema.description ? `${schema.description}\n\n` : ''
          }Any of (anyOf) the following schemas:\n${JSON.stringify(minifiedJsonSchema)}`
        ); // Fallback to providing the schema as a description
    }
    if (this.llmType === 'gemini' && Array.isArray(schema.type)) {
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
      schema.type === 'array' &&
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
        parserOverride: (s, r) => this.getParserOverride(s, r, jsonSchemaToZodWithParserOverride),
      });
    };

    const schemaTypeToZod = Object.keys(schemaTypeToSchemaObject).reduce((total, next) => {
      const schema = schemaTypeToSchemaObject[next];
      const zodSchema = jsonSchemaToZodWithParserOverride(schema as JsonSchema);
      if (zodObjectHasRequiredProperties(zodSchema)) {
        return { ...total, [next]: zodSchema };
      }
      return { ...total, [next]: zodSchema.optional() };
    }, {} as Record<'query' | 'body' | 'header' | 'path' | 'cookie' | 'formData', z.ZodTypeAny>);

    return z.object(schemaTypeToZod);
  }

  /**
   * Simple structure that groups tools by operation tags. Override
   * this method to customize the tree structure.
   */
  protected async getOperationsStructure(): Promise<InternalNode> {
    const operations = this.getOperations();

    const groupedTags = groupBy(
      flatMap(operations, (operation) => {
        return operation.getTags().map((tag) => ({
          tag: tag.name,
          operation,
        }));
      }),
      'tag'
    );

    const children = Object.entries(groupedTags).map(([tag, operationsArr]): InternalNode => {
      return new InternalNode({
        name: formatToolName(`${tag}_agent`),
        description: [
          ...new Set(
            operationsArr
              .flatMap((operationArr) => operationArr.operation)
              .flatMap((operation) => operation.getTags())
              .filter((t) => t.name === tag)
              .map((t) => t.description || t.name)
              .filter((t) => !!t)
          ),
        ].join('\n'),
        children: operationsArr
          .flatMap((operationArr) => operationArr.operation)
          .map((operation) => new OperationNode({ operationId: operation.getOperationId() })),
      });
    });

    const { name, description } = this.getRootToolDetails();

    const root = new InternalNode({
      name,
      description,
      children,
    });

    return root;
  }

  async getTool(args: T) {
    const helper = (node: InternalNode | OperationNode): Promise<StructuredToolInterface> => {
      if (node instanceof OperationNode) {
        const operation = this.dereferencedOas.getOperationById(node.operationId);
        if (!operation) {
          throw new Error(`Operation with ID ${node.operationId} not found`);
        }
        const tool = this.getToolForOperation({ operation, ...args });
        return tool;
      }
      if (node instanceof InternalNode) {
        const tools = node.children.map((child) => helper(child));
        return this.getInternalNode({
          ...args,
          tools: Promise.all(tools),
          name: node.name,
          description: node.description,
        });
      }
      throw new Error(`Unknown node type: ${node}`);
    };

    const treeStructure = await this.getOperationsStructure();

    const root = await helper(treeStructure);
    return root;
  }

  protected getRootToolDetails(): {
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
