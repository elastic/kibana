/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';

import type { Alert, TriageResult } from '../types';

/**
 * Tool: Query Similar Alerts
 *
 * Allows LLM to search for similar past alerts to inform triage decision
 */
const createQuerySimilarAlertsTool = (esClient: ElasticsearchClient) => {
  return new DynamicStructuredTool({
    name: 'query_similar_alerts',
    description: 'Query Elasticsearch for similar past alerts based on entity (IP, user, host, process)',
    schema: z.object({
      entityValue: z.string().describe('Value of the entity to search for (e.g., IP address, username, hostname)'),
      entityType: z.enum(['ip', 'user', 'host', 'process']).describe('Type of entity to search for'),
      limit: z.number().default(10).describe('Maximum number of alerts to return'),
    }),
    func: async ({ entityValue, entityType, limit }) => {
      const fieldMap: Record<string, string[]> = {
        ip: ['source.ip', 'destination.ip'],
        user: ['user.name'],
        host: ['host.name'],
        process: ['process.name', 'process.executable'],
      };

      const fields = fieldMap[entityType];
      if (!fields) {
        return JSON.stringify({ error: 'Invalid entity type' });
      }

      try {
        const results = await esClient.search({
          index: '.alerts-security.alerts-*',
          body: {
            query: {
              bool: {
                should: fields.map((field) => ({
                  term: { [field]: entityValue },
                })),
                minimum_should_match: 1,
              },
            },
            size: limit,
            sort: [{ '@timestamp': 'desc' }],
            _source: [
              '@timestamp',
              'kibana.alert.rule.name',
              'kibana.alert.severity',
              'kibana.alert.risk_score',
              'event.category',
              'event.type',
              ...fields,
            ],
          },
        });

        const alerts = results.hits.hits.map((hit: any) => ({
          timestamp: hit._source?.['@timestamp'],
          ruleName: hit._source?.kibana?.alert?.rule?.name,
          severity: hit._source?.kibana?.alert?.severity,
          riskScore: hit._source?.kibana?.alert?.risk_score,
          eventCategory: hit._source?.event?.category,
          eventType: hit._source?.event?.type,
        }));

        return JSON.stringify({
          count: alerts.length,
          alerts,
        });
      } catch (error) {
        return JSON.stringify({
          error: `Failed to query alerts: ${error.message}`,
        });
      }
    },
  });
};

/**
 * Triage Agent
 *
 * Classifies alert severity and attack type using LLM reasoning
 * and historical alert context from Elasticsearch
 */
export const createTriageAgent = (llmClient: ActionsClientLlm, esClient: ElasticsearchClient) => {
  const tools = [createQuerySimilarAlertsTool(esClient)];

  const systemPrompt = `You are an expert security analyst triaging security alerts.

Your task:
1. Analyze the alert details carefully
2. Query for similar past alerts using the query_similar_alerts tool to understand historical context
3. Classify severity: CRITICAL, HIGH, MEDIUM, or LOW
4. Determine attack type: Malware, Phishing, Lateral Movement, C2, Exfiltration, Brute Force, or Unknown
5. Provide confidence score (0-100%)
6. Explain your reasoning clearly

Classification Guidelines:
- CRITICAL: Active breach, data exfiltration, ransomware, critical system compromise
- HIGH: Lateral movement, credential theft, command and control, exploit attempts
- MEDIUM: Suspicious activity, policy violations, reconnaissance
- LOW: Noise, false positive, informational

Attack Type Guidelines:
- Malware: Malicious file execution, dropper, payload delivery
- Phishing: Social engineering, credential harvesting
- Lateral Movement: Horizontal network propagation, privilege escalation
- C2 (Command & Control): Beacon activity, remote access, backdoor
- Exfiltration: Data theft, unauthorized file transfers
- Brute Force: Password attacks, credential stuffing
- Unknown: Insufficient information or ambiguous activity

Think step-by-step and be thorough in your analysis.

Return your result as JSON:
{
  "classification": "HIGH",
  "attackType": "Lateral Movement",
  "confidence": 85,
  "reasoning": "User executed suspicious commands on 5 different hosts in 1 hour - clear lateral movement pattern. Historical alerts show this user typically only accesses 1 host."
}`;

  return {
    name: 'triage-agent',
    tools,
    systemPrompt,
    llmClient,

    /**
     * Execute triage for a single alert
     */
    async execute(alert: Alert): Promise<TriageResult> {
      const alertContext = JSON.stringify({
        id: alert._id,
        timestamp: alert._source['@timestamp'],
        ruleName: alert._source['kibana.alert.rule.name'],
        severity: alert._source['kibana.alert.severity'],
        riskScore: alert._source['kibana.alert.risk_score'],
        processName: alert._source['process.name'],
        commandLine: alert._source['process.command_line'],
        userName: alert._source['user.name'],
        hostName: alert._source['host.name'],
        sourceIp: alert._source['source.ip'],
        destIp: alert._source['destination.ip'],
        eventCategory: alert._source['event.category'],
        eventType: alert._source['event.type'],
      }, null, 2);

      const prompt = `Triage this security alert:

${alertContext}

Use the query_similar_alerts tool to check if we've seen similar activity from this user, host, or IP before.

Then provide your triage classification as JSON.`;

      const llmWithTools = llmClient.bindTools(tools);
      const response = await llmWithTools.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);

      // Parse JSON response
      const content = typeof response.content === 'string' ? response.content : '';

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse triage response: no JSON found');
      }

      const result = JSON.parse(jsonMatch[1] || jsonMatch[0]) as TriageResult;

      // Validate result structure
      if (!result.classification || !result.attackType || typeof result.confidence !== 'number') {
        throw new Error('Invalid triage response structure');
      }

      return result;
    },
  };
};
