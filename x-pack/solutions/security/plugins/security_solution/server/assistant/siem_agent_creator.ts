/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentCreateRequest } from '@kbn/onechat-common';
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
      } as KibanaRequest;

      const agentClient = await onechatPlugin.agents.getScopedClient({ request: mockRequest });

      // Check if SIEM agent already exists
      const agentExists = await agentClient.has('siem-security-analyst');
      if (agentExists) {
        logger.info('SIEM agent already exists, skipping creation');
        return;
      }

      // Import the required types for agent creation
      const { AgentType, allToolsSelection } = await import('@kbn/onechat-common');

      const siemAgentRequest: AgentCreateRequest = {
        id: 'siem-security-analyst',
        name: 'SIEM Security Analyst',
        description:
          'AI assistant specialized in security analysis and threat detection for SIEM operations',
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

Always provide clear, actionable recommendations and explain your reasoning.`,
          tools: [
            // Include the open-and-acknowledged-alerts-internal-tool
            { tool_ids: ['.open-and-acknowledged-alerts-internal-tool'] },
            // Include all built-in tools for comprehensive security analysis
            { type: 'builtin', tool_ids: ['*'] },
          ],
        },
      };

      const createdAgent = await agentClient.create(siemAgentRequest);
      logger.info('Successfully created SIEM agent', {
        agentId: createdAgent.id,
        agentName: createdAgent.name,
      });
    } catch (error) {
      logger.error('Failed to create SIEM agent', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
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
