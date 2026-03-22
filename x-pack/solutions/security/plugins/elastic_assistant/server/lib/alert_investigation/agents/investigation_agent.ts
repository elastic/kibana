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

import type { Alert, TriageResult, MitreMapping } from '../types';
import type { CTIContext } from './cti_enrichment_agent';

/**
 * Investigation Result
 */
export interface InvestigationAnalysis {
  /** Primary hypothesis about what happened */
  hypothesis: string;
  /** Supporting evidence from ES queries */
  evidence: Array<{
    description: string;
    query: string;
    matchCount: number;
  }>;
  /** Attack timeline */
  timeline: Array<{
    timestamp: string;
    event: string;
    significance: string;
  }>;
  /** Blast radius assessment */
  blastRadius: {
    affectedHosts: number;
    affectedUsers: number;
    affectedAssets: string[];
  };
  /** Investigation confidence */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Detailed analysis */
  analysis: string;
}

/**
 * Tool: Query Related Events
 *
 * Searches ES for corroborating events (logs, alerts, metrics)
 */
const createQueryRelatedEventsTool = (esClient: ElasticsearchClient) => {
  return new DynamicStructuredTool({
    name: 'query_related_events',
    description:
      'Query Elasticsearch for related events to gather evidence (correlated alerts, logs, or audit events)',
    schema: z.object({
      entityValue: z.string().describe('Entity to search for (IP, user, host, process)'),
      entityType: z
        .enum(['ip', 'user', 'host', 'process'])
        .describe('Type of entity'),
      timeRange: z
        .object({
          start: z.string().describe('Start time (ISO 8601 or relative like "now-1h")'),
          end: z.string().describe('End time (ISO 8601 or relative like "now")'),
        })
        .describe('Time range to search'),
      eventTypes: z
        .array(z.string())
        .optional()
        .describe('Specific event types to filter (e.g., ["process", "network", "file"])'),
    }),
    func: async ({ entityValue, entityType, timeRange, eventTypes }) => {
      try {
        const fieldMap: Record<string, string[]> = {
          ip: ['source.ip', 'destination.ip', 'client.ip', 'server.ip'],
          user: ['user.name', 'user.id'],
          host: ['host.name', 'host.id'],
          process: ['process.name', 'process.executable', 'process.parent.name'],
        };

        const fields = fieldMap[entityType];

        const query: any = {
          bool: {
            should: fields.map((field) => ({ term: { [field]: entityValue } })),
            minimum_should_match: 1,
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.start,
                    lte: timeRange.end,
                  },
                },
              },
            ],
          },
        };

        if (eventTypes && eventTypes.length > 0) {
          query.bool.filter.push({
            terms: { 'event.category': eventTypes },
          });
        }

        const results = await esClient.search({
          index: ['logs-*', '.alerts-security.alerts-*'], // Search logs and alerts
          body: {
            query,
            size: 20,
            sort: [{ '@timestamp': 'asc' }], // Chronological order for timeline
            _source: [
              '@timestamp',
              'event.category',
              'event.type',
              'event.action',
              'process.name',
              'user.name',
              'host.name',
              'source.ip',
              'destination.ip',
            ],
          },
        });

        const events = results.hits.hits.map((hit: any) => ({
          timestamp: hit._source?.['@timestamp'],
          category: hit._source?.event?.category,
          type: hit._source?.event?.type,
          action: hit._source?.event?.action,
          process: hit._source?.process?.name,
          user: hit._source?.user?.name,
          host: hit._source?.host?.name,
        }));

        return JSON.stringify({
          entityValue,
          entityType,
          matchCount: events.length,
          events,
        });
      } catch (error) {
        return JSON.stringify({
          error: `Failed to query related events: ${error.message}`,
        });
      }
    },
  });
};

/**
 * Tool: Get Entity Graph
 *
 * Builds entity relationship graph (who connected to what, when)
 */
const createEntityGraphTool = (esClient: ElasticsearchClient) => {
  return new DynamicStructuredTool({
    name: 'get_entity_graph',
    description:
      'Build entity relationship graph showing connections between users, hosts, and IPs',
    schema: z.object({
      centerEntity: z.string().describe('Entity to center graph on (user, host, or IP)'),
      entityType: z.enum(['user', 'host', 'ip']).describe('Entity type'),
      depth: z.number().default(1).describe('Relationship depth (1 = direct connections)'),
    }),
    func: async ({ centerEntity, entityType, depth }) => {
      try {
        // Simple implementation: Find all related entities
        const fieldMap: Record<string, { source: string[]; target: string[] }> = {
          user: {
            source: ['user.name'],
            target: ['host.name', 'source.ip', 'destination.ip'],
          },
          host: {
            source: ['host.name'],
            target: ['user.name', 'source.ip', 'destination.ip'],
          },
          ip: {
            source: ['source.ip', 'destination.ip'],
            target: ['user.name', 'host.name'],
          },
        };

        const fields = fieldMap[entityType];

        const results = await esClient.search({
          index: '.alerts-security.alerts-*',
          body: {
            query: {
              bool: {
                should: fields.source.map((field) => ({ term: { [field]: centerEntity } })),
                minimum_should_match: 1,
              },
            },
            size: 50,
            _source: [...fields.source, ...fields.target, '@timestamp'],
          },
        });

        // Build entity graph
        const connections: Record<string, Set<string>> = {};

        results.hits.hits.forEach((hit: any) => {
          fields.target.forEach((targetField) => {
            const targetValue = hit._source?.[targetField];
            if (targetValue) {
              if (!connections[targetValue]) {
                connections[targetValue] = new Set();
              }
              connections[targetValue].add(centerEntity);
            }
          });
        });

        const graph = Object.entries(connections).map(([entity, sources]) => ({
          entity,
          type: entityType,
          connections: Array.from(sources),
          connectionCount: sources.size,
        }));

        return JSON.stringify({
          centerEntity,
          depth,
          totalConnections: graph.length,
          graph,
        });
      } catch (error) {
        return JSON.stringify({
          error: `Failed to build entity graph: ${error.message}`,
        });
      }
    },
  });
};

/**
 * Investigation Agent
 *
 * Performs deep investigation with hypothesis testing and evidence gathering
 */
export const createInvestigationAgent = (
  llmClient: ActionsClientLlm,
  esClient: ElasticsearchClient
) => {
  const tools = [createQueryRelatedEventsTool(esClient), createEntityGraphTool(esClient)];

  const systemPrompt = `You are an expert security investigator performing deep analysis.

Your task:
1. Form hypothesis about what happened based on alert, triage, MITRE, and CTI
2. Gather evidence using query_related_events tool
3. Build entity graph using get_entity_graph tool
4. Construct attack timeline (what happened when)
5. Assess blast radius (how many hosts, users, assets affected)
6. Provide detailed analysis

Investigation Methodology:
- **Hypothesis:** What do you think happened? (based on initial alert + context)
- **Evidence:** What corroborating data supports your hypothesis?
- **Timeline:** Chronological sequence of events (first → last)
- **Blast Radius:** Scope of impact (lateral movement? data exfiltration?)
- **Confidence:** HIGH (strong evidence), MEDIUM (some gaps), LOW (speculative)

Think like a forensic investigator: follow the evidence, build the narrative.

Return JSON:
{
  "hypothesis": "Attacker used stolen credentials to move laterally across network",
  "evidence": [
    {
      "description": "Same user authenticated to 5 different hosts in 10 minutes",
      "query": "user.name:admin AND event.category:authentication",
      "matchCount": 5
    }
  ],
  "timeline": [
    {
      "timestamp": "2026-03-22T10:00:00Z",
      "event": "Initial authentication on HOST-1",
      "significance": "Likely compromised credentials used here"
    },
    {
      "timestamp": "2026-03-22T10:05:00Z",
      "event": "Lateral movement to HOST-2, HOST-3, HOST-4, HOST-5",
      "significance": "Rapid propagation indicates automated tool or script"
    }
  ],
  "blastRadius": {
    "affectedHosts": 5,
    "affectedUsers": 1,
    "affectedAssets": ["HOST-1", "HOST-2", "HOST-3", "HOST-4", "HOST-5"]
  },
  "confidence": "HIGH",
  "analysis": "Strong evidence of lateral movement attack using compromised admin credentials. Attacker moved horizontally across 5 hosts in 10 minutes, suggesting automated exploitation. No data exfiltration observed yet, but investigation should continue."
}`;

  return {
    name: 'investigation-agent',
    tools,
    systemPrompt,
    llmClient,

    async execute(
      alert: Alert,
      triageResult?: TriageResult,
      mitreMapping?: MitreMapping,
      ctiContext?: CTIContext
    ): Promise<InvestigationAnalysis> {
      const alertContext = JSON.stringify(
        {
          id: alert._id,
          timestamp: alert._source['@timestamp'],
          user: alert._source['user.name'],
          host: alert._source['host.name'],
          process: alert._source['process.name'],
          commandLine: alert._source['process.command_line'],
        },
        null,
        2
      );

      const contextSections: string[] = [];

      if (triageResult) {
        contextSections.push(`Triage: ${triageResult.classification} - ${triageResult.attackType}`);
      }

      if (mitreMapping) {
        contextSections.push(
          `MITRE: ${mitreMapping.techniques.map((t) => t.id).join(', ')} (${mitreMapping.phase})`
        );
      }

      if (ctiContext) {
        contextSections.push(
          `CTI: ${ctiContext.threatActor ? `Actor: ${ctiContext.threatActor}` : 'No attribution'}, ${ctiContext.iocs.length} IOCs analyzed`
        );
      }

      const prompt = `Investigate this alert in depth:

Alert:
${alertContext}

Context:
${contextSections.join('\n')}

Use query_related_events and get_entity_graph tools to:
1. Form hypothesis about the attack
2. Gather corroborating evidence
3. Build attack timeline
4. Assess blast radius

Provide deep investigation analysis as JSON.`;

      const llmWithTools = llmClient.bindTools(tools);
      const response = await llmWithTools.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);

      const content = typeof response.content === 'string' ? response.content : '';
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse investigation response: no JSON found');
      }

      const result = JSON.parse(jsonMatch[1] || jsonMatch[0]) as InvestigationAnalysis;

      if (!result.hypothesis || !Array.isArray(result.evidence)) {
        throw new Error('Invalid investigation response structure');
      }

      return result;
    },
  };
};
