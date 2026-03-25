/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const iocTypeEnum = z.enum(['ip', 'domain', 'hash', 'url']);

const threatIntelEnrichSchema = z.object({
  ioc_type: iocTypeEnum.describe(
    'The type of indicator of compromise: ip (IP address), domain (domain name), hash (file hash - MD5, SHA1, or SHA256), url (URL)'
  ),
  ioc_value: z
    .string()
    .min(1)
    .max(2048)
    .describe('The value of the indicator to look up (e.g., "1.2.3.4", "evil.com", "abc123...")'),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of specific threat intel source names to filter by (e.g., ["AbuseCH", "AlienVault OTX"])'
    ),
});

export const SECURITY_THREAT_INTEL_ENRICH_TOOL_ID = securityTool('threat_intel_enrich');

/** Threat intel index patterns to search */
const TI_INDEX_PATTERNS = ['.ds-logs-ti_*', 'logs-ti_*-*', 'filebeat-*'];

/**
 * Builds the appropriate ES query field path based on the IOC type
 */
const getIocFieldPaths = (iocType: z.infer<typeof iocTypeEnum>): string[] => {
  switch (iocType) {
    case 'ip':
      return ['threat.indicator.ip'];
    case 'domain':
      return ['threat.indicator.url.domain'];
    case 'hash':
      return [
        'threat.indicator.file.hash.md5',
        'threat.indicator.file.hash.sha1',
        'threat.indicator.file.hash.sha256',
      ];
    case 'url':
      return ['threat.indicator.url.full'];
  }
};

export const threatIntelEnrichTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof threatIntelEnrichSchema> => {
  return {
    id: SECURITY_THREAT_INTEL_ENRICH_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Enrich indicators of compromise (IOCs) against configured threat intelligence sources. Queries TI indicator indices for matching threat intelligence with severity, source, and last-seen timestamp.',
    schema: threatIntelEnrichSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ ioc_type: iocType, ioc_value: iocValue, sources }, { esClient }) => {
      logger.debug(
        `${SECURITY_THREAT_INTEL_ENRICH_TOOL_ID} tool called with ioc_type: ${iocType}, ioc_value: ${iocValue}`
      );

      try {
        const fieldPaths = getIocFieldPaths(iocType);

        // Build a should query to match the IOC value across all relevant fields
        const shouldClauses = fieldPaths.map((field) => ({
          term: { [field]: iocValue },
        }));

        const filterClauses: Array<Record<string, unknown>> = [
          {
            bool: {
              should: shouldClauses,
              minimum_should_match: 1,
            },
          },
        ];

        // Optionally filter by source names
        if (sources && sources.length > 0) {
          filterClauses.push({
            terms: { 'threat.indicator.provider': sources },
          });
        }

        const response = await esClient.asCurrentUser.search({
          index: TI_INDEX_PATTERNS.join(','),
          ignore_unavailable: true,
          allow_no_indices: true,
          size: 20,
          query: {
            bool: {
              filter: filterClauses,
            },
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          _source: [
            '@timestamp',
            'threat.indicator.type',
            'threat.indicator.ip',
            'threat.indicator.url.domain',
            'threat.indicator.url.full',
            'threat.indicator.file.hash.*',
            'threat.indicator.provider',
            'threat.indicator.confidence',
            'threat.indicator.description',
            'threat.indicator.first_seen',
            'threat.indicator.last_seen',
            'threat.indicator.marking.tlp',
            'threat.feed.name',
            'tags',
          ],
        });

        const hits = response.hits.hits;

        if (hits.length === 0) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  ioc_type: iocType,
                  ioc_value: iocValue,
                  match_count: 0,
                  matches: [],
                  message: `No threat intelligence found for ${iocType}: ${iocValue}`,
                },
              },
            ],
          };
        }

        const matches = hits.map((hit) => {
          const source = hit._source as Record<string, unknown>;
          return {
            index: hit._index,
            ...source,
          };
        });

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                ioc_type: iocType,
                ioc_value: iocValue,
                match_count: hits.length,
                total_matches:
                  typeof response.hits.total === 'number'
                    ? response.hits.total
                    : response.hits.total?.value ?? hits.length,
                matches,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${SECURITY_THREAT_INTEL_ENRICH_TOOL_ID} tool: ${errorMessage}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error enriching threat intelligence: ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'threat-intelligence', 'enrichment'],
  };
};
