/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';

const pciFieldMapperSchema = z.object({
  indexPattern: z
    .string()
    .describe('Index pattern to inspect for field mapping (e.g. "logs-custom-myapp*").'),
  targetFields: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      'Optional list of ECS fields to map to. Defaults to common PCI-relevant ECS fields.'
    ),
});

export const PCI_FIELD_MAPPER_TOOL_ID = securityTool('pci_field_mapper');

const SENSITIVE_FIELD_PATTERNS = [
  /card/i,
  /pan/i,
  /\bcvv\b/i,
  /\bcvc\b/i,
  /account.?number/i,
  /credit/i,
  /ssn/i,
  /social.?security/i,
  /secret/i,
  /password/i,
  /token/i,
];

const DEFAULT_ECS_TARGETS = [
  'user.name',
  'source.ip',
  'destination.ip',
  'event.outcome',
  'event.action',
  'event.category',
  'host.name',
  'tls.version',
  'process.name',
  'vulnerability.id',
  'vulnerability.severity',
];

const FIELD_MAPPING_HINTS: Record<string, string[]> = {
  'user.name': ['username', 'user_name', 'login', 'account', 'principal', 'actor', 'userid', 'user_id'],
  'source.ip': ['src_ip', 'src_addr', 'source_ip', 'client_ip', 'remote_addr', 'remote_ip', 'origin_ip'],
  'destination.ip': ['dst_ip', 'dst_addr', 'dest_ip', 'server_ip', 'target_ip'],
  'event.outcome': ['outcome', 'result', 'status', 'success', 'auth_result', 'login_result'],
  'event.action': ['action', 'event_type', 'operation', 'activity', 'method', 'api_call'],
  'event.category': ['category', 'event_class', 'log_type', 'event_group'],
  'host.name': ['hostname', 'server', 'host', 'machine', 'device', 'device_name', 'computer'],
  'tls.version': ['ssl_version', 'tls_ver', 'protocol_version', 'ssl_protocol'],
  'process.name': ['process', 'proc', 'program', 'exe', 'executable', 'binary'],
  'vulnerability.id': ['vuln_id', 'cve', 'cve_id', 'vulnerability', 'finding_id'],
  'vulnerability.severity': ['severity', 'risk_level', 'vuln_severity', 'criticality', 'risk'],
};

function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

function matchFieldToEcs(
  fieldName: string,
  ecsTarget: string
): { score: number; reason: string } | null {
  const lowerField = fieldName.toLowerCase();
  const hints = FIELD_MAPPING_HINTS[ecsTarget];
  if (!hints) return null;

  for (const hint of hints) {
    const lowerHint = hint.toLowerCase();
    if (lowerField === lowerHint) {
      return { score: 1.0, reason: `Exact match: "${fieldName}" matches hint "${hint}"` };
    }

    const wordBoundary = new RegExp(`(^|[._\\-])${lowerHint}($|[._\\-])`, 'i');
    if (wordBoundary.test(lowerField)) {
      return {
        score: 0.8,
        reason: `Word-boundary match: "${fieldName}" contains "${hint}"`,
      };
    }
  }

  const ecsLeaf = ecsTarget.split('.').pop()?.toLowerCase();
  if (ecsLeaf && lowerField.includes(ecsLeaf) && lowerField.length < ecsLeaf.length + 10) {
    return {
      score: 0.5,
      reason: `Partial match: "${fieldName}" resembles ECS leaf "${ecsLeaf}"`,
    };
  }

  return null;
}

export const pciFieldMapperTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof pciFieldMapperSchema> => {
  return {
    id: PCI_FIELD_MAPPER_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Inspect non-ECS index fields and suggest mappings to ECS fields for PCI compliance queries. ' +
      'Use this when the scope discovery tool reports low ECS coverage for an index.',
    schema: pciFieldMapperSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ indexPattern, targetFields }, { esClient }) => {
      const ecsTargets = targetFields ?? DEFAULT_ECS_TARGETS;

      let allFields: string[];
      try {
        const fieldCaps = await esClient.asCurrentUser.fieldCaps({
          index: indexPattern,
          fields: ['*'],
          ignore_unavailable: true,
          allow_no_indices: true,
        });
        allFields = Object.keys(fieldCaps.fields ?? {});
      } catch {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Unable to inspect fields for index pattern "${indexPattern}".` },
            },
          ],
        };
      }

      const nonEcsFields = allFields.filter(
        (f) => !f.startsWith('@') && !f.startsWith('_') && !f.includes('.')
      );

      const ecsFieldsPresent = allFields.filter((f) => ecsTargets.includes(f));
      const ecsMissing = ecsTargets.filter((f) => !allFields.includes(f));

      const mappings: Array<{
        sourceField: string;
        suggestedEcsField: string;
        confidence: number;
        reason: string;
      }> = [];

      for (const field of nonEcsFields) {
        if (isSensitiveField(field)) continue;

        for (const ecsTarget of ecsMissing) {
          const match = matchFieldToEcs(field, ecsTarget);
          if (match && match.score >= 0.5) {
            mappings.push({
              sourceField: field,
              suggestedEcsField: ecsTarget,
              confidence: match.score,
              reason: match.reason,
            });
          }
        }
      }

      mappings.sort((a, b) => b.confidence - a.confidence);

      let sampleFields: string[] = [];
      try {
        const sampleResponse = await esClient.asCurrentUser.search({
          index: indexPattern,
          size: 3,
          _source_includes: nonEcsFields
            .filter((f) => !isSensitiveField(f))
            .slice(0, 20),
        });
        if (sampleResponse.hits?.hits?.length) {
          sampleFields = [
            ...new Set(
              sampleResponse.hits.hits.flatMap((hit) => Object.keys(hit._source ?? {}))
            ),
          ];
        }
      } catch {
        // Sample retrieval is best-effort
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              indexPattern,
              totalFields: allFields.length,
              ecsFieldsPresent,
              ecsMissing,
              ecsCoveragePercent: Math.round(
                (ecsFieldsPresent.length / ecsTargets.length) * 100
              ),
              suggestedMappings: mappings.slice(0, 20),
              sampleFieldNames: sampleFields.slice(0, 30),
              guidance:
                mappings.length > 0
                  ? 'Use the generateEsql tool to create adapted queries using the suggested field mappings above. ' +
                    'For example, if "username" maps to "user.name", use RENAME or reference the source field directly.'
                  : 'No automatic mappings found. Inspect the sample field names and create manual field mappings.',
            },
          },
        ],
      };
    },
    tags: ['security', 'compliance', 'pci', 'field-mapping'],
  };
};
