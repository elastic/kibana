/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/

import type { ScopedModel, ToolHandlerContext } from '@kbn/onechat-server';
import {
  MessageRole,
  type AssistantMessage,
  type ToolMessage,
  type Message,
} from '@kbn/inference-common';
import type { PathDefinition, PathNode, ToolHandler } from './types';

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
    this.id = pathSchema.name;
    this.root = this.buildNode(pathSchema.root, null);
  }

  buildNode(pathNode: PathNode, parent: Node | null): Node {
    const newNode = new Node(pathNode.id, [], pathNode.tool);
    pathNode.nodes?.forEach((child) => {
      const childNode = this.buildNode(child, newNode);
      newNode.addChild(childNode);
    });
    return newNode;
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
    messages: Message[],
    prompt: string,
    toolHandlerContext: ToolHandlerContext
  ): Promise<any> {
    const response = await model.inferenceClient.chatComplete({
      connectorId: model.connector.connectorId,
      system:
        'You are executing a path step. Use the function to perform the step action as needed.',
      messages,
      tools: { [node.tool!.name]: node.tool!.definition },
      toolChoice: { function: node.tool!.name },
    });
    const args = response.toolCalls?.[0]?.function.arguments;

    const toolResponse = await node.tool!.handler({ args, toolHandlerContext });
    if (node.children.length === 0) {
      return { toolCall: response.toolCalls?.[0], toolResponse };
    }

    const next = await Promise.all(
      node.children.map(
        async (child) =>
          await this.traverse(
            child,
            model,
            [
              ...messages,
              {
                role: MessageRole.Assistant,
                content: '',
                toolCalls: response.toolCalls,
              } as AssistantMessage,
              {
                role: MessageRole.Tool,
                name: node.tool!.name,
                toolCallId: response.toolCalls?.[0].toolCallId!,
                response: toolResponse,
              } as ToolMessage,
            ],
            prompt,
            toolHandlerContext
          )
      )
    );
    return { toolCall: response.toolCalls?.[0], toolResponse, next };
  }

  async walk(
    model: ScopedModel,
    prompt: string,
    toolHandlerContext: ToolHandlerContext
  ): Promise<any> {
    const root = this.getRoot();
    return await this.traverse(
      root,
      model,
      [
        {
          role: MessageRole.User,
          content: prompt,
        },
      ],
      prompt,
      toolHandlerContext
    );
  }
}
