/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
import type { AgentCreateRequest } from '@kbn/onechat-plugin/common/agents';
import { DEFAULT_SYSTEM_PROMPT } from '@kbn/elastic-assistant-plugin/server/lib/prompt/prompts';
import type {
  SecuritySolutionPluginCoreStartDependencies,
  SecuritySolutionPluginStartDependencies,
} from '../plugin_contract';

export interface SiemAgentCreatorDeps {
  onechatPlugin: SecuritySolutionPluginStartDependencies['onechat'];
  core: SecuritySolutionPluginCoreStartDependencies;
  logger: Logger;
}

export class SiemAgentCreator {
  private readonly deps: SiemAgentCreatorDeps;

  constructor(deps: SiemAgentCreatorDeps) {
    this.deps = deps;
  }

  async createSiemAgent(): Promise<void> {
    const { onechatPlugin, core, logger } = this.deps;

    try {
      // Create a mock request for internal agent creation
      const mockRequest = {
        headers: {},
        url: { pathname: '/internal/security_solution/siem-agent' },
        route: { settings: {} },
        events: { aborted$: new Observable() },
      } as unknown as KibanaRequest;

      const agentClient = await onechatPlugin.agents.getScopedClient({ request: mockRequest });

      // Check if SIEM agent already exists
      const agentExists = await agentClient.has('siem-security-analyst');
      if (agentExists) {
        logger.info('SIEM agent already exists, skipping creation');
        return;
      }

      const siemAgentRequest: AgentCreateRequest = {
        id: 'siem-security-analyst',
        name: 'SIEM Security Analyst',
        description: DEFAULT_SYSTEM_PROMPT,
        labels: ['security', 'siem', 'threat-detection', 'incident-response'],
        avatar_color: '#ff6b6b',
        avatar_symbol: '🛡️',
        configuration: {
          instructions: `You are a SIEM Security Analyst Assistant. Your primary responsibilities include:

1. **Threat Detection**: Analyze security alerts and identify potential threats
2. **Incident Response**: Provide guidance on responding to security incidents
3. **Alert Analysis**: Help investigate and triage security alerts
4. **Security Monitoring**: Assist with continuous security monitoring activities
5. **Threat Intelligence**: Provide context about known threats and attack patterns

When analyzing alerts, focus on:
- Risk assessment and prioritization
- Root cause analysis
- Recommended response actions
- Threat actor attribution when possible
- Compliance and regulatory considerations

When calling the tools prioritize the tools with tag security.

Always provide clear, actionable recommendations and explain your reasoning.`,
          tools: [
            // Include the open-and-acknowledged-alerts-internal-tool
            { type: ToolType.builtin, tool_ids: ['open-and-acknowledged-alerts-internal-tool'] },
            // Include the alert-counts-internal-tool
            { type: ToolType.builtin, tool_ids: ['alert-counts-internal-tool'] },
            // Include the knowledge-base-retrieval-internal-tool
            { type: ToolType.builtin, tool_ids: ['knowledge-base-retrieval-internal-tool'] },
            // Include the product-documentation-internal-tool
            { type: ToolType.builtin, tool_ids: ['product-documentation-internal-tool'] },
            // Include the security-labs-knowledge-internal-tool
            { type: ToolType.builtin, tool_ids: ['security-labs-knowledge-internal-tool'] },
            // Include the knowledge-base-write-internal-tool
            { type: ToolType.builtin, tool_ids: ['knowledge-base-write-internal-tool'] },
            // Include all built-in tools for comprehensive security analysis
            { type: ToolType.builtin, tool_ids: ['*'] },
          ],
        },
      };

      const createdAgent = await agentClient.create(siemAgentRequest);
      logger.info('Successfully created SIEM agent', {
        agent: createdAgent.id,
        agentName: createdAgent.name,
      });
    } catch (error) {
      logger.error('Failed to create SIEM agent', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

/**
 * Factory function to create a SIEM agent creator instance
 */
export const createSiemAgentCreator = (deps: SiemAgentCreatorDeps): SiemAgentCreator => {
  return new SiemAgentCreator(deps);
};
