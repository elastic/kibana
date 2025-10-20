/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/

import type { ScopedModel, ToolHandlerContext } from '@kbn/onechat-server';
import { MessageRole } from '@kbn/inference-common';
import type { PathDefinition, ToolHandler } from './types';

export class Node {
  public readonly children: Node[] = [];
  public readonly tool?: ToolHandler;

  constructor(public readonly id: string, children: Node[] = [], tool?: ToolHandler) {
    this.children = children;
    this.tool = tool;
  }
  parent: Node | null = null;
  addChild(child: Node) {
    child.parent = this;
    this.children.push(child);
  }
}

export class Path {
  private readonly root: Node;
  private readonly id: string;
  constructor(pathSchema: PathDefinition) {
    this.root = new Node(pathSchema.root.id, [], pathSchema.root.tool);
    this.id = pathSchema.name;

    if (pathSchema.root.nodes) {
      pathSchema.root.nodes.forEach((node) => {
        this.root.addChild(new Node(node.id, [], node.tool));
      });
    }
  }

  getRoot() {
    return this.root;
  }

  getId() {
    return this.id;
  }

  async traverse(
    node: Node,
    model: ScopedModel,
    prompt: string,
    toolHandlerContext: ToolHandlerContext
  ): Promise<any> {
    const response = await model.inferenceClient.chatComplete({
      connectorId: model.connector.connectorId,
      system:
        'You are executing a path step. Use the function to perform the step action as needed.',
      messages: [
        {
          role: MessageRole.User,
          content: prompt,
        },
      ],
      tools: { [node.tool!.name]: node.tool!.definition },
      toolChoice: { function: node.tool!.name },
    });
    const args = response.toolCalls?.[0]?.function.arguments;

    const toolResponse = await node.tool!.handler({ args, toolHandlerContext });
    if (node.children.length === 0) {
      return { toolCall: response.toolCalls?.[0], toolResponse };
    }
    const childrenResults = await Promise.all(
      node.children.map(
        async (child) => await this.traverse(child, model, prompt, toolHandlerContext)
      )
    );
    return { toolCall: response.toolCalls?.[0], toolResponse, childrenResults };
  }

  async walk(
    model: ScopedModel,
    prompt: string,
    toolHandlerContext: ToolHandlerContext
  ): Promise<any> {
    const root = this.getRoot();
    return await this.traverse(root, model, prompt, toolHandlerContext);
  }
}
