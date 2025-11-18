/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { HumanMessage } from '@langchain/core/messages';
import type { BuiltinToolDefinition, ScopedModel, ToolEventEmitter } from '@kbn/onechat-server';
import type { Logger } from '@kbn/logging';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { generateEsql } from '@kbn/onechat-genai-utils/tools';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools/search/run_search_tool';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { getRiskIndex } from '../../../../common/search_strategy/security_solution/risk_score/common';
import { getSpaceIdFromRequest } from '../helpers';
import { securityTool } from '../constants';

const evaluateAlertSchema = z.object({
  alertData: z
    .string()
    .describe(
      'The filtered alert data in key-value format (comma-separated, newline-delimited). Contains entities like host.name, user.name, source.ip, destination.ip, file.hash.sha256, file.name, file.path, service.name, kibana.alert.uuid, etc.'
    ),
});

export const EVALUATE_ALERT_TOOL_ID = securityTool('evaluate-alert');

// Essential fields to keep when querying alerts to minimize token usage
const KEEP_FIELDS = [
  '_id',
  '@timestamp',
  'host.name',
  'user.name',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'source.ip',
  'destination.ip',
  'event.category',
  'message',
].join(', ');

const ENTITY_EXTRACTION_PROMPT = `Extract security entities from the following alert data. Return a JSON object with the following structure:
{
  "alertId": "string or null",
  "hostNames": ["string"],
  "userNames": ["string"],
  "sourceIps": ["string"],
  "destinationIps": ["string"],
  "fileHashes": ["string"],
  "fileNames": ["string"],
  "filePaths": ["string"],
  "serviceNames": ["string"],
  "mitreTechniques": ["string"],
  "ruleName": "string or null"
}

Extract all values found in the alert data. If a field is not present, use an empty array [] or null.
Only include non-null, non-empty values.

Alert data:
{alertData}

Return only valid JSON, no other text:`;

/**
 * Uses LLM to extract entities from alert data
 */
const extractEntitiesWithLLM = async (
  alertData: string,
  model: ScopedModel,
  logger: Logger
): Promise<{
  alertId?: string;
  hostNames: string[];
  userNames: string[];
  sourceIps: string[];
  destinationIps: string[];
  fileHashes: string[];
  fileNames: string[];
  filePaths: string[];
  serviceNames: string[];
  mitreTechniques: string[];
  ruleName?: string;
}> => {
  try {
    const prompt = ENTITY_EXTRACTION_PROMPT.replace('{alertData}', alertData);
    const response = await model.chatModel.invoke([new HumanMessage(prompt)]);

    const responseText =
      typeof response.content === 'string'
        ? response.content
        : Array.isArray(response.content)
        ? response.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('')
        : String(response.content);

    // Extract JSON from response (in case LLM adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const entities = JSON.parse(jsonMatch[0]) as {
      alertId?: string | null;
      hostNames?: string[];
      userNames?: string[];
      sourceIps?: string[];
      destinationIps?: string[];
      fileHashes?: string[];
      fileNames?: string[];
      filePaths?: string[];
      serviceNames?: string[];
      mitreTechniques?: string[];
      ruleName?: string | null;
    };
    logger.debug(`Extracted entities: ${JSON.stringify(entities, null, 2)}`);

    return {
      alertId: entities.alertId || undefined,
      hostNames: entities.hostNames || [],
      userNames: entities.userNames || [],
      sourceIps: entities.sourceIps || [],
      destinationIps: entities.destinationIps || [],
      fileHashes: entities.fileHashes || [],
      fileNames: entities.fileNames || [],
      filePaths: entities.filePaths || [],
      serviceNames: entities.serviceNames || [],
      mitreTechniques: entities.mitreTechniques || [],
      ruleName: entities.ruleName || undefined,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Error extracting entities with LLM: ${errorMessage}`);
    // Return empty entities on error
    return {
      hostNames: [],
      userNames: [],
      sourceIps: [],
      destinationIps: [],
      fileHashes: [],
      fileNames: [],
      filePaths: [],
      serviceNames: [],
      mitreTechniques: [],
    };
  }
};

/**
 * Queries related alerts using generateEsql tool
 */
const queryRelatedAlerts = async (
  entities: {
    hostNames: string[];
    userNames: string[];
    sourceIps: string[];
    destinationIps: string[];
    fileHashes: string[];
  },
  spaceId: string,
  model: ScopedModel,
  esClient: IScopedClusterClient,
  logger: Logger,
  events: ToolEventEmitter
): Promise<string> => {
  try {
    const conditions: string[] = [];

    if (entities.hostNames.length > 0) {
      conditions.push(`host.name is "${entities.hostNames[0]}"`);
    }
    if (entities.userNames.length > 0) {
      conditions.push(`user.name is "${entities.userNames[0]}"`);
    }
    if (entities.sourceIps.length > 0) {
      conditions.push(`source.ip is "${entities.sourceIps[0]}"`);
    }
    if (entities.destinationIps.length > 0) {
      conditions.push(`destination.ip is "${entities.destinationIps[0]}"`);
    }
    if (entities.fileHashes.length > 0) {
      conditions.push(`file.hash.sha256 is "${entities.fileHashes[0]}"`);
    }

    if (conditions.length === 0) {
      return 'No related alerts found (no entities to search for).';
    }

    const index = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
    const nlQuery = `Find related security alerts from the last 7 days where ${conditions.join(
      ' OR '
    )}. Include only essential fields: ${KEEP_FIELDS}. Limit to 50 results.`;

    const additionalInstructions = `When querying security alert indices, ALWAYS use the KEEP command to filter fields and reduce response size. Include these essential fields: ${KEEP_FIELDS}. Example: FROM ${index} | KEEP ${KEEP_FIELDS} | ...`;

    logger.debug(`Querying related alerts with natural language: ${nlQuery}`);

    const esqlResponse = await generateEsql({
      nlQuery,
      index,
      additionalInstructions,
      executeQuery: true,
      model,
      esClient: esClient.asCurrentUser,
      logger,
      events,
    });

    if (esqlResponse.error) {
      return `Error querying related alerts: ${esqlResponse.error}`;
    }

    if (esqlResponse.results && esqlResponse.results.values.length > 0) {
      const count = esqlResponse.results.values.length;
      return `Found ${count} related alerts. Query: ${
        esqlResponse.query || 'N/A'
      }. Results summary: ${esqlResponse.answer || 'See query results.'}`;
    }

    return 'No related alerts found.';
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Error querying related alerts: ${errorMessage}`);
    return `Error querying related alerts: ${errorMessage}`;
  }
};

/**
 * Queries risk scores using search tool
 */
const queryRiskScores = async (
  entities: {
    hostNames: string[];
    userNames: string[];
  },
  spaceId: string,
  model: ScopedModel,
  esClient: IScopedClusterClient,
  logger: Logger,
  events: ToolEventEmitter
): Promise<string> => {
  try {
    const riskInfo: string[] = [];
    const riskIndex = getRiskIndex(spaceId, true);

    if (entities.hostNames.length > 0) {
      const nlQuery = `Find risk scores for hosts: ${entities.hostNames.join(
        ', '
      )}. Include host.name, host.risk.calculated_score_norm, and host.risk.calculated_level fields.`;
      const results = await runSearchTool({
        nlQuery,
        index: riskIndex,
        model,
        esClient: esClient.asCurrentUser,
        logger,
        events,
      });

      if (results.length > 0 && !results.some((r) => r.type === 'error')) {
        riskInfo.push(
          `Host Risk Scores: Found risk information for ${entities.hostNames.length} host(s).`
        );
      }
    }

    if (entities.userNames.length > 0) {
      const nlQuery = `Find risk scores for users: ${entities.userNames.join(
        ', '
      )}. Include user.name, user.risk.calculated_score_norm, and user.risk.calculated_level fields.`;
      const results = await runSearchTool({
        nlQuery,
        index: riskIndex,
        model,
        esClient: esClient.asCurrentUser,
        logger,
        events,
      });

      if (results.length > 0 && !results.some((r) => r.type === 'error')) {
        riskInfo.push(
          `User Risk Scores: Found risk information for ${entities.userNames.length} user(s).`
        );
      }
    }

    return riskInfo.length > 0 ? riskInfo.join('\n\n') : 'No risk score information found.';
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Error querying risk scores: ${errorMessage}`);
    return `Error querying risk scores: ${errorMessage}`;
  }
};

/**
 * Queries attack discoveries using search tool
 */
const queryAttackDiscoveries = async (
  alertId: string | undefined,
  spaceId: string,
  model: ScopedModel,
  esClient: IScopedClusterClient,
  logger: Logger,
  events: ToolEventEmitter
): Promise<string> => {
  if (!alertId) {
    return 'No alert ID available to query attack discoveries.';
  }

  try {
    // Query both scheduled and ad-hoc attack discovery indices
    const indexPattern = [
      `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}*`,
      `.ds-.adhoc${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}*`,
      `.internal${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}*`,
      `.internal.ds-.adhoc${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}*`,
    ].join(',');

    const nlQuery = `Find attack discoveries that include alert ID "${alertId}" in the kibana.alert.attack_discovery.alert_ids field. Include kibana.alert.attack_discovery.title, kibana.alert.attack_discovery.summary_markdown, and kibana.alert.attack_discovery.alert_ids fields. Limit to 5 results.`;

    const results = await runSearchTool({
      nlQuery,
      index: indexPattern,
      model,
      esClient: esClient.asCurrentUser,
      logger,
      events,
    });

    if (results.length > 0 && !results.some((r) => r.type === 'error')) {
      return `This alert is part of one or more attack discoveries. Found attack discovery information.`;
    }

    return 'This alert is not part of any known attack discovery.';
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Error querying attack discoveries: ${errorMessage}`);
    return `Error querying attack discoveries: ${errorMessage}`;
  }
};

/**
 * Queries Security Labs knowledge base for relevant information
 * Note: kbDataClient is not available in tool handler context, so this is a placeholder
 * that can be enhanced if knowledge base access is added to the context in the future
 */
const querySecurityLabs = async (entities: unknown, logger: Logger): Promise<string> => {
  // Security Labs knowledge base querying is not currently available in the tool handler context
  // This can be enhanced in the future if kbDataClient is added to ToolHandlerContext
  logger.debug('Security Labs knowledge base querying not available in tool handler context');
  return 'Security Labs knowledge base querying is not currently available. Consider using the Security Labs tool separately if needed.';
};

const EVALUATION_PROMPT = `You are a security analyst evaluating a security alert with enriched context. Analyze the alert data and all provided context to generate a comprehensive evaluation report.

SECURITY ALERT DATA:

{alertData}

---

ENRICHED CONTEXT:

RELATED ALERTS:
{relatedAlerts}

RISK SCORES:
{riskScores}

ATTACK DISCOVERIES:
{attackDiscoveries}

SECURITY LABS:
{securityLabs}

---

EVALUATION REQUIREMENTS

Evaluate the security event described above and provide a structured, markdown-formatted summary suitable for inclusion in an Elastic Security case. Use the enriched context above to provide a comprehensive analysis. Your response must include:

1. 📝 Event Description
  - Summarize the event using information from the alert data and enriched context.
  - Include user and host information, risk scores, and severity from the provided context.
  - Reference relevant MITRE ATT&CK techniques based on the event details, with hyperlinks to the official MITRE pages.
  - If this alert is part of an attack discovery, highlight that context.

2. 🔍 Triage Steps
  - List clear, bulleted triage steps tailored to Elastic Security workflows (e.g., alert investigation, timeline creation, entity analytics review).
  - Base recommendations on the alert fields and related alerts found (e.g., host.name, user.name, source.ip, destination.ip).
  - Highlight the detection rule mentioned in the alert data.
  - If related alerts were found, mention patterns or trends observed.

3. 🛡️ Recommended Actions
  - Provide prioritized response actions based on the alert data and context:
    - Elastic Defend endpoint response actions (e.g., isolate host, kill process, retrieve/delete file), with links to Elastic documentation.
    - Example ES|QL queries for further investigation using the fields from the alert (host.name, user.name, IPs, timestamps), formatted as code blocks.
    - Example OSQuery Manager queries for further investigation, formatted as code blocks.
    - Guidance on using Timelines and Entity Analytics for deeper context, with documentation links.
    - If risk scores indicate high-risk entities, recommend immediate investigation.

4. 📚 MITRE ATT&CK Context
  - Analyze the event category and rule description to identify relevant MITRE ATT&CK techniques.
  - Provide actionable recommendations based on MITRE guidance, with hyperlinks.
  - If Security Labs articles were found, reference relevant research and findings.

5. 🔗 Documentation Links
  - Include direct links to all referenced Elastic Security documentation and MITRE ATT&CK pages.
  - If Security Labs articles were found, include links to those articles.

Formatting Requirements:
  - Use markdown headers, tables, and code blocks for clarity.
  - Organize the response into visually distinct sections.
  - Use concise, actionable language.
  - Include relevant emojis in section headers for visual clarity (e.g., 📝, 🛡️, 🔍, 📚).

Generate the complete evaluation report now:`;

export const evaluateAlertTool = (): BuiltinToolDefinition<typeof evaluateAlertSchema> => {
  return {
    id: EVALUATE_ALERT_TOOL_ID,
    type: ToolType.builtin,
    description: `Evaluates a security alert with enriched context by querying related alerts, risk scores, attack discoveries, and Security Labs content. Generates a comprehensive, structured markdown report suitable for inclusion in an Elastic Security case.

CRITICAL INSTRUCTION: This tool returns a COMPLETE FINAL ANSWER in the 'answer' field. You MUST return this answer EXACTLY as-is without any modification, summarization, or additional commentary. Copy the entire 'answer' field content verbatim and return it directly to the user. Do NOT synthesize, summarize, or rephrase this content.`,
    schema: evaluateAlertSchema,
    handler: async ({ alertData }, { request, esClient, modelProvider, logger, events }) => {
      logger.debug(`evaluate-alert tool called with alert data length: ${alertData.length}`);

      try {
        const spaceId = getSpaceIdFromRequest(request);
        const model = await modelProvider.getDefaultModel();

        // Extract entities using LLM
        const entities = await extractEntitiesWithLLM(alertData, model, logger);
        logger.debug(`Extracted entities: ${JSON.stringify(entities, null, 2)}`);

        // Query related alerts, risk scores, attack discoveries, and security labs in parallel
        const [relatedAlerts, riskScores, attackDiscoveries, securityLabs] = await Promise.all([
          queryRelatedAlerts(entities, spaceId, model, esClient, logger, events),
          queryRiskScores(entities, spaceId, model, esClient, logger, events),
          queryAttackDiscoveries(entities.alertId, spaceId, model, esClient, logger, events),
          querySecurityLabs(entities, logger),
        ]);

        // Build enriched context
        const enrichedContext = {
          relatedAlerts,
          riskScores,
          attackDiscoveries,
          securityLabs,
        };

        logger.debug(`Enriched context gathered: ${JSON.stringify(enrichedContext, null, 2)}`);

        // Generate evaluation using LLM
        const prompt = EVALUATION_PROMPT.replace('{alertData}', alertData)
          .replace('{relatedAlerts}', relatedAlerts)
          .replace('{riskScores}', riskScores)
          .replace('{attackDiscoveries}', attackDiscoveries)
          .replace('{securityLabs}', securityLabs);

        const response = await model.chatModel.invoke([new HumanMessage(prompt)]);

        const evaluationText =
          typeof response.content === 'string'
            ? response.content
            : Array.isArray(response.content)
            ? response.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('')
            : String(response.content);

        return {
          results: [
            {
              type: 'other',
              data: {
                answer: evaluationText,
                _verbatim: true,
                _finalAnswer: true,
              },
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in evaluate-alert tool: ${errorMessage}`);
        return {
          results: [
            {
              type: 'error',
              data: {
                message: `Error evaluating alert: ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'alerts', 'evaluation'],
  };
};
