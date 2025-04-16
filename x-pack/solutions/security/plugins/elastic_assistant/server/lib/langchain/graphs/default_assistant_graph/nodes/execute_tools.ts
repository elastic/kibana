/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { StructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import { ToolExecutor } from '@langchain/langgraph/prebuilt';
import { castArray } from 'lodash';
import { AgentAction } from 'langchain/agents';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { NodeType } from '../constants';
import { AgentState, NodeParamsBase } from '../types';

export interface ExecuteToolsParams extends NodeParamsBase {
  state: AgentState;
  tools: StructuredTool[];
  config?: RunnableConfig;
}

let mcpClientPromise: Promise<Client> | null = null;
let mcpToolsPromise: Promise<StructuredToolInterface[]> | null = null;

async function getMcpClient(): Promise<Client> {
  if (!mcpClientPromise) {
    const transport = new StdioClientTransport({
      command: 'npm',
      args: ['--silent', '--prefix', '/Users/eyalkraft/Workspace/elastic/aws-mcp', 'start'],
    });

    const client = new Client({
      name: 'aws-mcp-client',
      version: '1.0.0',
    });

    mcpClientPromise = client.connect(transport).then(() => client);
  }

  return mcpClientPromise;
}

async function getMcpTools(): Promise<StructuredToolInterface[]> {
  if (!mcpToolsPromise) {
    const client = await getMcpClient();
    mcpToolsPromise = loadMcpTools('aws', client);
  }

  return mcpToolsPromise;
}

/**
 * Node to execute tools
 *
 * Note: Could maybe leverage `ToolNode` if tool selection state is pushed to `messages[]`.
 * See: https://github.com/langchain-ai/langgraphjs/blob/0ef76d603b55c00a04f5793d1e6ab15af7c756cb/langgraph/src/prebuilt/tool_node.ts
 *
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 * @param tools - The tools available to execute
 * @param config - Any configuration that may've been supplied
 */
export async function executeTools({
  logger,
  state,
  tools,
  config,
}: ExecuteToolsParams): Promise<Partial<AgentState>> {
  logger.debug(() => `${NodeType.TOOLS}: Node state:\n${JSON.stringify(state, null, 2)}`);

  const mcpTools = await getMcpTools();

  logger.info('DUDE');
  logger.info(mcpTools.toString());

  // mcpTools.push(...tools);

  const toolExecutor = new ToolExecutor({ tools: mcpTools });

  const steps = await Promise.all(
    castArray(state.agentOutcome as AgentAction)?.map(async (action) => {
      let out;
      try {
        out = await toolExecutor.invoke(action, config);
      } catch (err) {
        return {
          action,
          observation: JSON.stringify(`Error: ${err}`, null, 2),
        };
      }

      return {
        action,
        observation: JSON.stringify(out, null, 2),
      };
    })
  );

  return { steps, lastNode: NodeType.TOOLS };
}
