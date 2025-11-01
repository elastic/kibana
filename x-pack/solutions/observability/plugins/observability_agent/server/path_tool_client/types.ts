/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ToolDefinition } from '@kbn/inference-common/src/chat_complete/tools';
import type { ToolHandlerContext } from '@kbn/onechat-server';

export interface PathResponse {
  content?: any;
  data?: any;
}

export interface ToolHandler {
  name: string;
  definition: ToolDefinition;
  handler: ({
    args,
    toolHandlerContext,
  }: {
    args: any;
    toolHandlerContext: ToolHandlerContext;
  }) => Promise<any>;
}

export interface PathNode {
  id: string;
  description?: string;
  tool?: ToolHandler;
  nodes?: PathNode[];
}

export interface PathDefinition {
  name: string;
  description: string;
  root: PathNode;
}

export type PathRegistry = Map<string, PathDefinition>;
