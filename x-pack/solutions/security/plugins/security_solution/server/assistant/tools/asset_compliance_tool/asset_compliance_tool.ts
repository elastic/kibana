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
import { APP_UI_ID } from '../../../../common/constants';

interface ComplianceFinding {
  rule_name: string;
  evaluation: string;
  resource_type: string;
  resource_name: string;
  benchmark: string;
  section: string;
  severity?: string;
  description: string;
  remediation?: string;
  references?: string;
  last_seen: string;
}

interface ComplianceData {
  total_findings: number;
  passed_count: number;
  failed_count: number;
  compliance_score: number;
  findings: ComplianceFinding[];
}

const buildComplianceQuery = (
  entityIdentifier: string,
  entityType: 'host' | 'user' | 'service' | 'generic' = 'host',
  size: number = 50
) => {
  const hostQueries = [
    { term: { 'host.name': entityIdentifier } },
    { term: { 'host.id': entityIdentifier } },
    { term: { 'host.hostname': entityIdentifier } },
    { term: { 'resource.name': entityIdentifier } },
    { term: { 'resource.id': entityIdentifier } },
  ];

  const userQueries = [
    { term: { 'user.name': entityIdentifier } },
    { term: { 'user.id': entityIdentifier } },
    { term: { 'user.email': entityIdentifier } },
    { term: { 'resource.name': entityIdentifier } },
    { term: { 'resource.id': entityIdentifier } },
  ];

  const serviceQueries = [
    { term: { 'service.name': entityIdentifier } },
    { term: { 'service.id': entityIdentifier } },
    { term: { 'resource.name': entityIdentifier } },
    { term: { 'resource.id': entityIdentifier } },
  ];

  const genericQueries = [
    { term: { 'entity.name': entityIdentifier } },
    { term: { 'entity.id': entityIdentifier } },
    { term: { 'resource.name': entityIdentifier } },
    { term: { 'resource.id': entityIdentifier } },
  ];

  let identifierQueries;
  switch (entityType) {
    case 'user':
      identifierQueries = userQueries;
      break;
    case 'service':
      identifierQueries = serviceQueries;
      break;
    case 'generic':
      identifierQueries = genericQueries;
      break;
    default:
      identifierQueries = hostQueries;
  }

  return {
    index: 'security_solution-*.misconfiguration_latest*',
    size,
    sort: [{ '@timestamp': { order: 'desc' as const } }],
    query: {
      bool: {
        should: identifierQueries,
        minimum_should_match: 1,
      },
    },
    _source: [
      'rule.name',
      'rule.description',
      'rule.remediation',
      'rule.references',
      'rule.section',
      'rule.benchmark',
      'result.evaluation',
      'resource.type',
      'resource.name',
      'resource.sub_type',
      '@timestamp',
    ],
  };
};

const extractHitsFromResponse = (searchResults: unknown): unknown[] => {
  if (!searchResults || typeof searchResults !== 'object') {
    return [];
  }

  // Try direct hits structure
  if ('hits' in searchResults && searchResults.hits) {
    if (
      typeof searchResults.hits === 'object' &&
      'hits' in searchResults.hits &&
      Array.isArray(searchResults.hits.hits)
    ) {
      return searchResults.hits.hits;
    }
  }

  // Try body.hits structure for some ES clients
  if (
    'body' in searchResults &&
    searchResults.body &&
    typeof searchResults.body === 'object' &&
    'hits' in searchResults.body &&
    searchResults.body.hits &&
    typeof searchResults.body.hits === 'object' &&
    'hits' in searchResults.body.hits &&
    Array.isArray((searchResults.body.hits as Record<string, unknown>).hits)
  ) {
    return (searchResults.body.hits as Record<string, unknown>).hits as unknown[];
  }

  // Try direct array
  if (Array.isArray(searchResults)) {
    return searchResults;
  }

  return [];
};

const processSingleHit = (hit: unknown): ComplianceFinding | null => {
  if (!hit || typeof hit !== 'object' || !('_source' in hit)) {
    return null;
  }

  const source = hit._source as Record<string, unknown>;
  if (!source) {
    return null;
  }

  const result = source.result as Record<string, unknown> | undefined;
  const rule = source.rule as Record<string, unknown> | undefined;
  const resource = source.resource as Record<string, unknown> | undefined;
  const benchmark = rule?.benchmark as Record<string, unknown> | undefined;

  const evaluation = (result?.evaluation as string) || 'unknown';

  return {
    rule_name: (rule?.name as string) || 'Unknown Rule',
    evaluation,
    resource_type: (resource?.type as string) || 'Unknown',
    resource_name: (resource?.name as string) || 'Unknown',
    benchmark: (benchmark?.name as string) || 'Unknown Benchmark',
    section: (rule?.section as string) || 'Unknown Section',
    description: (rule?.description as string) || 'No description available',
    remediation: (rule?.remediation as string) || 'No remediation available',
    references: (rule?.references as string) || (rule?.reference as string),
    last_seen: (source['@timestamp'] as string) || 'Unknown',
  };
};

const formatComplianceData = (searchResults: unknown): ComplianceData => {
  const findings: ComplianceFinding[] = [];
  let passedCount = 0;
  let failedCount = 0;

  const hits = extractHitsFromResponse(searchResults);

  for (const hit of hits) {
    try {
      const finding = processSingleHit(hit);
      if (!finding) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (finding.evaluation === 'passed') {
        passedCount++;
      } else if (finding.evaluation === 'failed') {
        failedCount++;
      }

      findings.push(finding);
    } catch (error) {
      // Skip malformed hits but continue processing
      // eslint-disable-next-line no-continue
      continue;
    }
  }

  const totalFindings = passedCount + failedCount;
  const complianceScore = totalFindings > 0 ? Math.round((passedCount / totalFindings) * 100) : 0;

  return {
    total_findings: totalFindings,
    passed_count: passedCount,
    failed_count: failedCount,
    compliance_score: complianceScore,
    findings,
  };
};

const formatComplianceMessage = (data: ComplianceData, entityIdentifier: string): string => {
  if (data.total_findings === 0) {
    return `No compliance findings found for ${entityIdentifier}. This could mean:
- The asset has no compliance scanning enabled
- The asset is not covered by current compliance benchmarks
- The asset identifier may not match records in the compliance index`;
  }

  let message = `# Compliance Status for ${entityIdentifier}\n\n`;
  message += `## Summary\n`;
  message += `- **Total Findings**: ${data.total_findings}\n`;
  message += `- **Compliance Score**: ${data.compliance_score}%\n`;
  message += `- **Passed**: ${data.passed_count} findings\n`;
  message += `- **Failed**: ${data.failed_count} findings\n\n`;

  if (data.failed_count > 0) {
    message += `## ❌ Failed Compliance Checks (${data.failed_count})\n\n`;
    const failedFindings = data.findings.filter((f) => f.evaluation === 'failed');

    failedFindings.forEach((finding, index) => {
      if (index < 10) {
        // Limit to first 10 failed findings
        message += `### ${finding.rule_name}\n`;
        message += `- **Benchmark**: ${finding.benchmark}\n`;
        message += `- **Section**: ${finding.section}\n`;
        message += `- **Resource**: ${finding.resource_name} (${finding.resource_type})\n`;
        message += `- **Description**: ${finding.description.substring(0, 200)}${
          finding.description.length > 200 ? '...' : ''
        }\n`;
        if (finding.remediation && finding.remediation !== 'No remediation available') {
          message += `- **Remediation**: ${finding.remediation.substring(0, 300)}${
            finding.remediation.length > 300 ? '...' : ''
          }\n`;
        }
        message += `- **Last Seen**: ${finding.last_seen}\n\n`;
      }
    });

    if (failedFindings.length > 10) {
      message += `... and ${failedFindings.length - 10} more failed findings.\n\n`;
    }
  }

  if (data.passed_count > 0) {
    message += `## ✅ Passed Compliance Checks (${data.passed_count})\n\n`;
    const passedFindings = data.findings.filter((f) => f.evaluation === 'passed');
    const samplePassed = passedFindings.slice(0, 5);

    samplePassed.forEach((finding) => {
      message += `- ${finding.rule_name} (${finding.benchmark})\n`;
    });

    if (passedFindings.length > 5) {
      message += `- ... and ${passedFindings.length - 5} more passed checks\n`;
    }
  }

  // Add benchmark summary
  const benchmarkCounts = data.findings.reduce((acc, finding) => {
    acc[finding.benchmark] = (acc[finding.benchmark] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (Object.keys(benchmarkCounts).length > 0) {
    message += `\n## 📊 Benchmarks Coverage\n`;
    Object.entries(benchmarkCounts).forEach(([benchmark, count]) => {
      message += `- **${benchmark}**: ${count} findings\n`;
    });
  }

  return message;
};

const complianceSchema = z.object({
  entityIdentifier: z
    .string()
    .describe('The identifier for the asset (hostname, IP address, user name, service name, etc.)'),
  entityType: z
    .enum(['host', 'user', 'service', 'generic'])
    .default('host')
    .describe('The type of entity to search for compliance findings'),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .describe('Maximum number of compliance findings to return'),
});

const DESCRIPTION = `Call this tool to get detailed compliance and misconfiguration information about a specific asset. This includes CIS benchmarks, security misconfigurations, and compliance status.

Use this tool when users ask about:
- Asset compliance status 
- Security misconfigurations for an asset
- CIS benchmark results
- Compliance score for a host/user/service
- Failed security configurations
- Remediation guidance for compliance issues

The tool searches across Cloud Security Posture (CSP) findings to provide comprehensive compliance insights.`;

export const ASSET_COMPLIANCE_TOOL: AssistantTool = {
  id: 'asset-compliance-tool',
  name: 'AssetComplianceTool',
  description: DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is AssistantToolParams => {
    const { request } = params;
    return requestHasRequiredAnonymizationParams(request);
  },
  async getTool(params: AssistantToolParams) {
    return tool(
      async ({ entityIdentifier, entityType = 'host', maxResults = 50 }) => {
        const { esClient, logger } = params;

        try {
          logger?.info(
            `AssetComplianceTool: Searching compliance findings for ${entityIdentifier} (type: ${entityType})`
          );

          const query = buildComplianceQuery(entityIdentifier, entityType, maxResults);
          logger?.debug(`AssetComplianceTool: Query: ${JSON.stringify(query)}`);

          const searchResults = await esClient.search(query);
          logger?.debug(
            `AssetComplianceTool: Raw search results structure: ${JSON.stringify(
              Object.keys(searchResults)
            )}`
          );

          const complianceData = formatComplianceData(searchResults);
          logger?.info(
            `AssetComplianceTool: Found ${complianceData.total_findings} compliance findings for ${entityIdentifier} (passed: ${complianceData.passed_count}, failed: ${complianceData.failed_count})`
          );

          const responseMessage = formatComplianceMessage(complianceData, entityIdentifier);
          return responseMessage;
        } catch (error) {
          logger?.error(`AssetComplianceTool error: ${error.message}`);
          logger?.error(`AssetComplianceTool error stack: ${error.stack}`);
          return `Error retrieving compliance information for ${entityIdentifier}: ${error.message}`;
        }
      },
      {
        name: 'AssetComplianceTool',
        description: DESCRIPTION,
        schema: complianceSchema,
      }
    );
  },
};
