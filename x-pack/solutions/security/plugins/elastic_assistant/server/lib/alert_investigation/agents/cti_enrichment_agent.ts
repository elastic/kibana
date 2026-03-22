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
 * CTI Context Result
 */
export interface CTIContext {
  /** Threat actor attribution (if identified) */
  threatActor?: string;
  /** Campaign name (if identified) */
  campaign?: string;
  /** IOCs analyzed */
  iocs: Array<{
    value: string;
    type: 'ip' | 'domain' | 'hash' | 'url';
    reputation: 'malicious' | 'suspicious' | 'unknown' | 'benign';
    sources: string[]; // Which threat intel sources confirmed
  }>;
  /** CTI summary */
  analysis: string;
  /** Confidence level */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Sources used */
  sources: string[];
}

/**
 * Tool: Semantic CTI Lookup (ELSER-based)
 *
 * Uses ELSER embeddings to find semantically similar threat intelligence
 */
const createCTILookupTool = (esClient: ElasticsearchClient) => {
  return new DynamicStructuredTool({
    name: 'lookup_threat_intelligence',
    description:
      'Search threat intelligence knowledge base for IOCs (IPs, domains, hashes, URLs) using semantic similarity',
    schema: z.object({
      ioc: z.string().describe('IOC to look up (IP, domain, hash, or URL)'),
      iocType: z
        .enum(['ip', 'domain', 'hash', 'url'])
        .describe('Type of IOC'),
    }),
    func: async ({ ioc, iocType }) => {
      try {
        // Note: In production, this would use ELSER inference endpoint
        // For foundation spike, using simple term query as placeholder

        // Future implementation:
        // 1. Generate embedding using ELSER: esClient.ml.inferTrainedModel({ model_id: '.elser_model_2', docs: [{ text_field: ioc }] })
        // 2. kNN search in CTI index: esClient.search({ index: 'threat-intelligence-*', knn: { field: 'embedding', query_vector, k: 5 } })

        // Placeholder: Simple term search in threat intel indices
        const results = await esClient.search({
          index: ['threat-intelligence-*', 'logs-ti_*'], // Threat intel indices
          body: {
            query: {
              bool: {
                should: [
                  { term: { 'threat.indicator.ip': ioc } },
                  { term: { 'threat.indicator.domain': ioc } },
                  { term: { 'threat.indicator.file.hash.sha256': ioc } },
                  { term: { 'threat.indicator.url.full': ioc } },
                ],
                minimum_should_match: 1,
              },
            },
            size: 5,
            _source: [
              'threat.indicator.type',
              'threat.indicator.description',
              'threat.actor',
              'threat.campaign',
              'threat.indicator.confidence',
              'event.provider',
            ],
          },
        });

        const hits = results.hits.hits.map((hit: any) => ({
          description: hit._source?.threat?.indicator?.description,
          actor: hit._source?.threat?.actor,
          campaign: hit._source?.threat?.campaign,
          confidence: hit._source?.threat?.indicator?.confidence,
          source: hit._source?.event?.provider || 'unknown',
        }));

        return JSON.stringify({
          ioc,
          iocType,
          matches: hits.length,
          results: hits,
        });
      } catch (error) {
        return JSON.stringify({
          error: `Failed to lookup threat intelligence: ${error.message}`,
        });
      }
    },
  });
};

/**
 * Tool: Query Threat Intel Connectors
 *
 * Calls external threat intel APIs via Actions connectors
 */
const createThreatIntelConnectorTool = () => {
  return new DynamicStructuredTool({
    name: 'query_threat_intel_connector',
    description:
      'Query external threat intelligence sources (VirusTotal, AbuseIPDB, MISP) for IOC reputation',
    schema: z.object({
      ioc: z.string().describe('IOC to check (IP, domain, hash, URL)'),
      iocType: z.enum(['ip', 'domain', 'hash', 'url']).describe('IOC type'),
    }),
    func: async ({ ioc, iocType }) => {
      // Note: In production, this would call Actions connectors for VirusTotal, etc.
      // For foundation spike, returning placeholder response

      // Future implementation:
      // const actionsClient = getActionsClient();
      // const vtConnector = await actionsClient.get({ id: 'virustotal-connector' });
      // const result = await actionsClient.execute({ actionId: vtConnector.id, params: { ioc } });

      return JSON.stringify({
        ioc,
        iocType,
        reputation: 'unknown', // Placeholder
        sources: ['placeholder'],
        note: 'Production will integrate with VirusTotal, AbuseIPDB, MISP connectors',
      });
    },
  });
};

/**
 * CTI Enrichment Agent
 *
 * Looks up threat intelligence for IOCs in the alert
 * Uses ELSER for semantic CTI search + external connectors
 */
export const createCTIEnrichmentAgent = (
  llmClient: ActionsClientLlm,
  esClient: ElasticsearchClient
) => {
  const tools = [
    createCTILookupTool(esClient),
    createThreatIntelConnectorTool(),
  ];

  const systemPrompt = `You are a threat intelligence analyst enriching security alerts with CTI context.

Your task:
1. Extract IOCs from the alert (IPs, domains, hashes, URLs)
2. Look up each IOC using lookup_threat_intelligence tool (semantic search in CTI knowledge base)
3. Check IOC reputation using query_threat_intel_connector tool (VirusTotal, MISP, etc.)
4. Identify threat actor or campaign if possible
5. Provide context: Have we seen this before? What's the threat level?

IOC Types to extract:
- IPs: source.ip, destination.ip, client.ip, server.ip
- Domains: dns.question.name, url.domain
- Hashes: file.hash.sha256, file.hash.md5
- URLs: url.full

Threat Actor/Campaign Attribution:
- Look for patterns in CTI matches
- Consider: APT groups, ransomware families, nation-state actors
- Be conservative: Only attribute if HIGH confidence

Return JSON:
{
  "threatActor": "APT28" | null,
  "campaign": "Campaign name" | null,
  "iocs": [
    {
      "value": "192.168.1.100",
      "type": "ip",
      "reputation": "malicious",
      "sources": ["VirusTotal", "AbuseIPDB"]
    }
  ],
  "analysis": "Brief threat intelligence summary",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "sources": ["MISP", "VirusTotal", "Internal CTI"]
}`;

  return {
    name: 'cti-enrichment-agent',
    tools,
    systemPrompt,
    llmClient,

    /**
     * Execute CTI enrichment for an alert
     */
    async execute(alert: Alert, triageResult?: TriageResult): Promise<CTIContext> {
      // Extract potential IOCs from alert
      const iocs = [
        alert._source['source.ip'],
        alert._source['destination.ip'],
        alert._source['dns.question.name'],
        alert._source['url.full'],
        alert._source['file.hash.sha256'],
      ].filter(Boolean);

      const alertContext = JSON.stringify(
        {
          id: alert._id,
          iocs,
          processName: alert._source['process.name'],
          commandLine: alert._source['process.command_line'],
          filePath: alert._source['file.path'],
          eventCategory: alert._source['event.category'],
        },
        null,
        2
      );

      const triageContext = triageResult
        ? `

Triage Classification:
- Severity: ${triageResult.classification}
- Attack Type: ${triageResult.attackType}
- Confidence: ${triageResult.confidence}%
`
        : '';

      const prompt = `Enrich this alert with threat intelligence:

Alert Details:
${alertContext}
${triageContext}

Use the lookup_threat_intelligence and query_threat_intel_connector tools to:
1. Look up each IOC
2. Identify threat actor or campaign
3. Provide CTI context

Return CTI enrichment as JSON.`;

      const llmWithTools = llmClient.bindTools(tools);
      const response = await llmWithTools.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);

      // Parse JSON response
      const content = typeof response.content === 'string' ? response.content : '';
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse CTI enrichment response: no JSON found');
      }

      const result = JSON.parse(jsonMatch[1] || jsonMatch[0]) as CTIContext;

      // Validate structure
      if (!Array.isArray(result.iocs)) {
        throw new Error('Invalid CTI enrichment response structure');
      }

      return result;
    },
  };
};
