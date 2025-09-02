/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';
import { naturalLanguageSearch } from '@kbn/onechat-genai-utils';
import type { EsqlResponse } from '@kbn/onechat-genai-utils/tools/steps/execute_esql';
import { esqlResponseToJson } from '@kbn/onechat-genai-utils/tools/utils/esql';
import { APP_UI_ID } from '../../../../common/constants';
import { getPromptSuffixForOssModel } from '../esql/utils/common';

export type SecurityIncidentToolParams = Require<AssistantToolParams, 'inference' | 'connectorId'>;

const TOOL_NAME = 'AssetSecurityIncidentTool';

interface ThreatTechnique {
  id: string;
  name: string;
  subtechniques?: string[];
}

interface ThreatInfo {
  tactics: string[];
  techniques: ThreatTechnique[];
}

interface SecurityIncident {
  alert_id: string;
  alert_status: string;
  workflow_status: string;
  severity: string;
  risk_score?: number;
  rule_name: string;
  rule_type: string;
  rule_description?: string;
  host_name?: string;
  user_name?: string;
  source_ip?: string;
  destination_ip?: string;
  process_name?: string;
  file_name?: string;
  event_action?: string;
  timestamp: string;
  reason?: string;
  threat_info?: ThreatInfo;
}

interface SecurityIncidentData {
  total_incidents: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  open_count: number;
  acknowledged_count: number;
  closed_count: number;
  recent_incidents: SecurityIncident[];
}

const extractIdentifierFromArn = (identifier: string): string => {
  // Handle ARN format: arn:aws:ec2:region:account:ec2/i-instanceid
  if (identifier.startsWith('arn:aws:ec2:') && identifier.includes('/i-')) {
    const parts = identifier.split('/');
    const instancePart = parts.find((part) => part.startsWith('i-'));
    if (instancePart) {
      return instancePart;
    }
  }
  // Handle IAM user ARN format: arn:aws:iam::account:user/username
  if (identifier.startsWith('arn:aws:iam:') && identifier.includes(':user/')) {
    const parts = identifier.split('/');
    // Return the username (last part after the slash)
    return parts[parts.length - 1];
  }
  // Handle IAM role ARN format: arn:aws:iam::account:role/rolename
  if (identifier.startsWith('arn:aws:iam:') && identifier.includes(':role/')) {
    const parts = identifier.split('/');
    // Return the role name (last part after the slash)
    return parts[parts.length - 1];
  }
  // If not ARN format, return as-is
  return identifier;
};

const buildSecurityIncidentQuery = (
  entityIdentifier: string,
  entityType: 'host' | 'user' | 'service' | 'generic' = 'host',
  timeRange: string = 'now-7d'
): string => {
  // Extract identifier from ARN format if needed (instance ID, username, role name, etc.)
  const searchIdentifier = extractIdentifierFromArn(entityIdentifier);

  const baseContext = `Find Kibana security alerts with kibana.alert.uuid, kibana.alert.rule.name, kibana.alert.severity, and kibana.alert.workflow_status fields for ${entityType} "${searchIdentifier}" in the last ${timeRange}. Must have kibana.alert.* fields - not raw event logs.`;

  switch (entityType) {
    case 'host':
      return `${baseContext} Search for security alerts where host.name or host.id equals "${searchIdentifier}". Do NOT use host.ip field for host identifiers like instance IDs.`;
    case 'user':
      // Security alert documents only contain processed ECS fields, not raw CloudTrail fields
      return `${baseContext} Search for security alerts where user.name equals "${searchIdentifier}".`;
    case 'service':
      return `${baseContext} Search for security alerts where service.name, service.id, or process.name matches "${searchIdentifier}".`;
    default:
      return `${baseContext} Search for security alerts related to "${searchIdentifier}".`;
  }
};

const extractThreatInfoFromFlattenedFields = (
  item: Record<string, unknown>
): ThreatInfo | undefined => {
  const tactics: string[] = [];
  const techniques: ThreatTechnique[] = [];

  // Extract tactics from flattened fields
  const tacticName = item['kibana.alert.rule.threat.tactic.name'];
  if (typeof tacticName === 'string') {
    tactics.push(tacticName);
  } else if (Array.isArray(tacticName)) {
    tacticName.forEach((name) => {
      if (typeof name === 'string') {
        tactics.push(name);
      }
    });
  }

  // Extract techniques from flattened fields
  const techniqueId = item['kibana.alert.rule.threat.technique.id'];
  const techniqueName = item['kibana.alert.rule.threat.technique.name'];

  if (typeof techniqueId === 'string' && typeof techniqueName === 'string') {
    techniques.push({
      id: techniqueId,
      name: techniqueName,
    });
  } else if (Array.isArray(techniqueId) && Array.isArray(techniqueName)) {
    // Handle arrays of techniques
    const maxLength = Math.min(techniqueId.length, techniqueName.length);
    for (let i = 0; i < maxLength; i++) {
      if (typeof techniqueId[i] === 'string' && typeof techniqueName[i] === 'string') {
        techniques.push({
          id: techniqueId[i] as string,
          name: techniqueName[i] as string,
        });
      }
    }
  }

  if (tactics.length === 0 && techniques.length === 0) {
    return undefined;
  }

  return {
    tactics: [...new Set(tactics)], // Remove duplicates
    techniques,
  };
};

const extractIncidentsFromResponse = (response: EsqlResponse): SecurityIncident[] => {
  const jsonData = esqlResponseToJson(response);
  const incidents: SecurityIncident[] = [];

  for (const item of jsonData) {
    try {
      const threatInfo = extractThreatInfoFromFlattenedFields(item);

      const incident: SecurityIncident = {
        alert_id: item['kibana.alert.uuid'] || item._id || 'Unknown',
        alert_status: item['kibana.alert.status'] || 'unknown',
        workflow_status: item['kibana.alert.workflow_status'] || 'open',
        severity: item['kibana.alert.severity'] || item['kibana.alert.rule.severity'] || 'Unknown',
        risk_score: item['kibana.alert.risk_score'] || item['kibana.alert.rule.risk_score'],
        rule_name: item['kibana.alert.rule.name'] || 'Unknown Rule',
        rule_type: item['kibana.alert.rule.type'] || 'query',
        rule_description: item['kibana.alert.rule.description'],
        host_name: item['host.name'] || item['agent.name'],
        user_name: item['user.name'],
        source_ip: item['source.ip'],
        destination_ip: item['destination.ip'],
        process_name: item['process.name'],
        file_name: item['file.name'],
        event_action: item['event.action'],
        timestamp: item['@timestamp'] || item['kibana.alert.start'] || 'Unknown',
        reason: item['kibana.alert.reason'],
        threat_info: threatInfo,
      };
      incidents.push(incident);
    } catch (error) {
      // Skip malformed entries but continue processing
      // eslint-disable-next-line no-continue
      continue;
    }
  }

  return incidents;
};

const formatSecurityIncidentData = (incidents: SecurityIncident[]): SecurityIncidentData => {
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let openCount = 0;
  let acknowledgedCount = 0;
  let closedCount = 0;

  incidents.forEach((incident) => {
    // Count by severity
    const severity = incident.severity?.toLowerCase();
    if (severity === 'critical') {
      criticalCount++;
    } else if (severity === 'high') {
      highCount++;
    } else if (severity === 'medium') {
      mediumCount++;
    } else if (severity === 'low') {
      lowCount++;
    }

    // Count by workflow status
    const status = incident.workflow_status?.toLowerCase();
    if (status === 'open') {
      openCount++;
    } else if (status === 'acknowledged') {
      acknowledgedCount++;
    } else if (status === 'closed') {
      closedCount++;
    }
  });

  return {
    total_incidents: incidents.length,
    critical_count: criticalCount,
    high_count: highCount,
    medium_count: mediumCount,
    low_count: lowCount,
    open_count: openCount,
    acknowledged_count: acknowledgedCount,
    closed_count: closedCount,
    recent_incidents: incidents,
  };
};

const formatSecurityIncidentMessage = (
  data: SecurityIncidentData,
  entityIdentifier: string
): string => {
  if (data.total_incidents === 0) {
    return `No security incidents found for ${entityIdentifier}. This could mean:
- The asset has no active security alerts or incidents
- Security monitoring is not enabled for this asset
- The asset identifier may not match records in the security alerts index
- The asset may be secure with no recent security events`;
  }

  let message = `# Security Incident Analysis for ${entityIdentifier}\n\n`;
  message += `## Summary\n`;
  message += `- **Total Security Incidents**: ${data.total_incidents}\n`;
  message += `- **Open**: ${data.open_count} incidents\n`;
  message += `- **Acknowledged**: ${data.acknowledged_count} incidents\n`;
  message += `- **Closed**: ${data.closed_count} incidents\n\n`;

  message += `## Severity Breakdown\n`;
  message += `- **Critical**: ${data.critical_count} incidents\n`;
  message += `- **High**: ${data.high_count} incidents\n`;
  message += `- **Medium**: ${data.medium_count} incidents\n`;
  message += `- **Low**: ${data.low_count} incidents\n\n`;

  if (data.critical_count > 0 || data.high_count > 0) {
    message += `## 🚨 High Priority Incidents\n\n`;
    const highPriorityIncidents = data.recent_incidents.filter(
      (incident) =>
        incident.severity?.toLowerCase() === 'critical' ||
        incident.severity?.toLowerCase() === 'high'
    );

    highPriorityIncidents.slice(0, 5).forEach((incident) => {
      message += `### ${incident.rule_name} (${incident.severity?.toUpperCase()})\n`;
      message += `- **Alert ID**: ${incident.alert_id}\n`;
      message += `- **Status**: ${incident.workflow_status}\n`;
      if (incident.risk_score) {
        message += `- **Risk Score**: ${incident.risk_score}\n`;
      }
      if (incident.host_name) {
        message += `- **Host**: ${incident.host_name}\n`;
      }
      if (incident.user_name) {
        message += `- **User**: ${incident.user_name}\n`;
      }
      if (incident.source_ip) {
        message += `- **Source IP**: ${incident.source_ip}\n`;
      }
      if (incident.process_name) {
        message += `- **Process**: ${incident.process_name}\n`;
      }
      if (incident.threat_info?.techniques && incident.threat_info.techniques.length > 0) {
        const techniqueIds = incident.threat_info.techniques.map((t) => t.id).join(', ');
        message += `- **MITRE ATT&CK Techniques**: ${techniqueIds}\n`;
      }
      if (incident.threat_info?.tactics && incident.threat_info.tactics.length > 0) {
        message += `- **MITRE ATT&CK Tactics**: ${incident.threat_info.tactics.join(', ')}\n`;
      }
      if (incident.reason) {
        message += `- **Alert Reason**: ${incident.reason.substring(0, 200)}${
          incident.reason.length > 200 ? '...' : ''
        }\n`;
      }
      message += `- **Timestamp**: ${incident.timestamp}\n\n`;
    });

    if (highPriorityIncidents.length > 5) {
      message += `... and ${highPriorityIncidents.length - 5} more high priority incidents.\n\n`;
    }
  }

  if (data.open_count > 0) {
    message += `## ⚠️ Open Incidents Requiring Attention (${data.open_count})\n\n`;
    const openIncidents = data.recent_incidents.filter(
      (incident) => incident.workflow_status?.toLowerCase() === 'open'
    );

    openIncidents.slice(0, 3).forEach((incident) => {
      message += `### ${incident.rule_name}\n`;
      message += `- **Severity**: ${incident.severity}\n`;
      message += `- **Rule Type**: ${incident.rule_type}\n`;
      if (incident.host_name) {
        message += `- **Host**: ${incident.host_name}\n`;
      }
      message += `- **Timestamp**: ${incident.timestamp}\n\n`;
    });

    if (openIncidents.length > 3) {
      message += `... and ${openIncidents.length - 3} more open incidents.\n\n`;
    }
  }

  // Add rule summary
  const ruleCounts = data.recent_incidents.reduce((acc, incident) => {
    if (incident.rule_name) {
      acc[incident.rule_name] = (acc[incident.rule_name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  if (Object.keys(ruleCounts).length > 0) {
    message += `\n## 📊 Most Triggered Rules\n`;
    Object.entries(ruleCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([rule, count]) => {
        message += `- **${rule}**: ${count} incidents\n`;
      });
  }

  // Add MITRE ATT&CK summary if available
  const allTechniques = data.recent_incidents
    .flatMap((incident) => incident.threat_info?.techniques || [])
    .filter((tech, index, arr) => arr.findIndex((t) => t.id === tech.id) === index); // Remove duplicates by ID

  if (allTechniques.length > 0) {
    message += `\n## 🎯 MITRE ATT&CK Techniques Detected\n`;
    allTechniques.slice(0, 10).forEach((technique) => {
      message += `- **${technique.id}**: ${technique.name}\n`;
    });
  }

  const allTactics = [
    ...new Set(data.recent_incidents.flatMap((incident) => incident.threat_info?.tactics || [])),
  ];

  if (allTactics.length > 0) {
    message += `\n## 🎯 MITRE ATT&CK Tactics Observed\n`;
    allTactics.forEach((tactic) => {
      message += `- ${tactic}\n`;
    });
  }

  return message;
};

const securityIncidentSchema = z.object({
  entityIdentifier: z
    .string()
    .describe('The identifier for the asset (hostname, IP address, service name, etc.)'),
  entityType: z
    .enum(['host', 'user', 'service', 'generic'])
    .default('host')
    .describe('The type of entity to search for security incidents'),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of security incidents to return'),
  timeRange: z
    .string()
    .optional()
    .default('now-7d')
    .describe('Time range for incident search (e.g., "now-24h", "now-7d", "now-30d")'),
});

const DESCRIPTION = `Call this tool to get detailed security incident and alert information about a specific asset. This includes active security alerts, attack patterns, MITRE ATT&CK techniques, and incident status.

Use this tool when users ask about:
- Security incidents for an asset
- Active alerts and their status
- Attack patterns targeting an asset
- Recent security events and threats
- MITRE ATT&CK techniques observed on an asset
- Security alert correlation with asset vulnerabilities/compliance
- Incident response context for an asset

The tool searches across the security alerts index to provide comprehensive security incident insights.`;

export const ASSET_SECURITY_INCIDENT_TOOL: AssistantTool = {
  id: 'asset-security-incident-tool',
  name: TOOL_NAME,
  description: DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is SecurityIncidentToolParams => {
    const { request, inference, connectorId } = params;
    return (
      requestHasRequiredAnonymizationParams(request) && inference != null && connectorId != null
    );
  },
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { esClient, logger, request, inference, connectorId, isOssModel, description } =
      params as SecurityIncidentToolParams;
    if (inference == null || connectorId == null) return null;

    return tool(
      async ({ entityIdentifier, entityType = 'host', maxResults = 50, timeRange = 'now-7d' }) => {
        try {
          const extractedIdentifier = extractIdentifierFromArn(entityIdentifier);
          logger?.info(
            `AssetSecurityIncidentTool: Searching security incidents for ${entityIdentifier} (type: ${entityType})${
              extractedIdentifier !== entityIdentifier
                ? ` -> extracted: ${extractedIdentifier}`
                : ''
            }`
          );

          // Use One Chat's naturalLanguageSearch with indexExplorer to automatically find security alerts indices
          const nlQuery = buildSecurityIncidentQuery(entityIdentifier, entityType, timeRange);

          // Use the user's selected connector from AI Assistant
          const inferenceClient = inference.getClient({ request, bindTo: { connectorId } });
          const chatModel = await inference.getChatModel({
            request,
            connectorId, // Use the connector the user selected
            chatModelOptions: {},
          });

          // Get connector details using the user's connector
          const connector = await inferenceClient.getConnectorById(connectorId);

          // Create properly typed ScopedModel
          const model = {
            connector,
            chatModel,
            inferenceClient,
          };

          logger?.debug(`AssetSecurityIncidentTool: Generated NL query: ${nlQuery}`);

          // Let indexExplorer find security alerts index - emphasize kibana.alert fields
          const searchResults = await naturalLanguageSearch({
            nlQuery,
            context: `Kibana security alerts index. ONLY use these exact available field paths for ES|QL queries:

ALERT FIELDS:
- kibana.alert.uuid
- kibana.alert.rule.name  
- kibana.alert.severity
- kibana.alert.workflow_status
- kibana.alert.rule.threat.tactic.id
- kibana.alert.rule.threat.tactic.name
- kibana.alert.rule.threat.tactic.reference
- kibana.alert.rule.threat.technique.id
- kibana.alert.rule.threat.technique.name
- kibana.alert.rule.threat.technique.reference
- kibana.alert.rule.threat.framework

ECS FIELDS:
- @timestamp
- user.name  
- host.name (STRING - for host identifiers like instance IDs, hostnames)
- host.id (STRING - for host identifiers like instance IDs)
- host.ip (IP - only for actual IP addresses, NOT for host identifiers)
- event.action
- event.outcome
- source.ip (IP - only for actual IP addresses)  
- destination.ip (IP - only for actual IP addresses)
- process.name
- file.name

IMPORTANT: 
- For host identifiers like "i-0ff9407dad7d38dbf", use host.name or host.id fields - NEVER use host.ip or source.ip
- host.ip, source.ip, destination.ip are IP address fields - do NOT use them for hostnames or instance IDs
- DO NOT use kibana.alert.rule.threat as a field - use the specific nested fields instead
- DO NOT use aws.cloudtrail.* fields as they are not mapped in this index
- This is NOT raw CloudTrail logs - it's processed security alerts
- Time range: ${timeRange}`,
            // No index specified - let indexExplorer find the correct alerts index
            model,
            esClient,
          });

          logger?.debug(
            `AssetSecurityIncidentTool: Search completed with ${
              searchResults.values?.length || 0
            } results`
          );

          const securityIncidents = extractIncidentsFromResponse(searchResults);
          const incidentData = formatSecurityIncidentData(securityIncidents.slice(0, maxResults));

          logger?.info(
            `AssetSecurityIncidentTool: Found ${incidentData.total_incidents} security incidents for ${entityIdentifier} (critical: ${incidentData.critical_count}, high: ${incidentData.high_count}, open: ${incidentData.open_count})`
          );

          const responseMessage = formatSecurityIncidentMessage(incidentData, entityIdentifier);
          return responseMessage;
        } catch (error) {
          logger?.error(`AssetSecurityIncidentTool error: ${error.message}`);
          logger?.error(`AssetSecurityIncidentTool error stack: ${error.stack}`);
          return `Error retrieving security incident information for ${entityIdentifier}: ${error.message}`;
        }
      },
      {
        name: TOOL_NAME,
        description:
          (description || DESCRIPTION) + (isOssModel ? getPromptSuffixForOssModel(TOOL_NAME) : ''),
        schema: securityIncidentSchema,
      }
    );
  },
};
