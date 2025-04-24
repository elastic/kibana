/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Oas from 'oas';
import type { JsonSchema } from '@n8n/json-schema-to-zod';
import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import type { SchemaObject } from 'oas/dist/types.cjs';
import { z } from '@kbn/zod';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { groupBy, memoize } from 'lodash';
import { fixOpenApiSpecIteratively, formatToolName, isOperation } from './utils';
import type { Operation } from './utils';

export abstract class OpenApiTool<T> {
  private dereferencedOas: Oas;
  private getParametersAsZodSchemaMemoized = memoize(
    this.getParametersAsZodSchemaInternal.bind(this),
    (args) => {
      return args.operation.getOperationId();
    }
  );

  protected constructor(args: { dereferencedOas: Oas }) {
    const { dereferencedOas } = args;
    this.dereferencedOas = dereferencedOas;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fixOpenApiSpecIteratively(openApiSpec: any): any {
    return fixOpenApiSpecIteratively(openApiSpec);
  }

  protected getOperations() {
    const oas = this.dereferencedOas;
    return Object.values(oas.getPaths())
      .map((operationByMethod) => Object.values(operationByMethod))
      .flat()
      .filter(isOperation);
  }

  protected getParametersAsZodSchema(args: { operation: Operation }) {
    return this.getParametersAsZodSchemaMemoized(args);
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

    const schemaTypeToZod = Object.keys(schemaTypeToSchemaObject).reduce((total, next) => {
      const schema = schemaTypeToSchemaObject[next];
      const zodSchema = jsonSchemaToZod(schema as JsonSchema);
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
          name: formatToolName(`kibana_${tag}_agent`),
          description: internalToolsAndOperations
            .map((toolAndOperation) => toolAndOperation.operation.getOperationId())
            .join('\n'),
        });
        return internalNode;
      });

    // Create root tool
    const rootTool = await this.getInternalNode({
      ...args,
      tools: Promise.all(tools),
      name: 'kibana_tool',
      description: 'Kibana tool',
    });

    return rootTool;
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
