/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  HUNT_FOR_THREAT_INDEX_PATTERNS,
  IOC_TYPES,
  type IocType,
  THREAT_INTEL_TOOL_IDS,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common';

const huntForThreatSchema = z.object({
  report_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Document id in `threat-reports-*` whose extracted IOCs + ATT&CK technique IDs should be ' +
        'searched against the environment. Either `report_id` or explicit `iocs[]` / `techniques[]` ' +
        'must be provided.'
    ),
  iocs: z
    .array(
      z.object({
        type: z.enum(IOC_TYPES),
        value: z.string().min(1),
      })
    )
    .optional()
    .describe(
      'Explicit list of IOCs to search for. Overrides anything extracted from `report_id`.'
    ),
  techniques: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Optional list of ATT&CK technique IDs (e.g. ["T1566.001"]) to additionally search for ' +
        'against `.alerts-security.*` via `kibana.alert.rule.threat.technique.id`.'
    ),
  time_range: z
    .object({
      from: z.string().describe('ISO-8601 timestamp (inclusive).'),
      to: z.string().describe('ISO-8601 timestamp (inclusive).'),
    })
    .optional()
    .describe(
      'Window of environment data to hunt across. Defaults to the last 30 days when omitted.'
    ),
  size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe('Maximum number of hit documents to return.'),
  max_assets: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(50)
    .describe('Maximum number of affected hosts/users to return in the aggregation block.'),
});

interface ResolvedHuntInput {
  iocs: Array<{ type: IocType; value: string }>;
  techniques: string[];
}

/**
 * Build the per-IOC `should` clause. Each IOC value is searched across the
 * ECS fields where it might reasonably appear in event/alert data — we do not
 * narrow by event source because the same IOC type can land in several
 * different ECS slots depending on which integration produced the document
 * (e.g. a hash hits `file.hash.sha256` for endpoint and `dll.hash.sha256` for
 * sysmon; a domain hits `dns.question.name`, `destination.domain`, and
 * `url.domain`).
 */
const termClause = (field: string, value: string): Record<string, unknown> => ({
  term: { [field]: value },
});

const buildIocShould = (iocs: ResolvedHuntInput['iocs']): Array<Record<string, unknown>> => {
  const clauses: Array<Record<string, unknown>> = [];
  for (const { type, value } of iocs) {
    switch (type) {
      case 'ip':
        clauses.push(
          termClause('source.ip', value),
          termClause('destination.ip', value),
          termClause('host.ip', value),
          termClause('client.ip', value),
          termClause('server.ip', value)
        );
        break;
      case 'domain':
        clauses.push(
          termClause('dns.question.name', value),
          termClause('destination.domain', value),
          termClause('url.domain', value)
        );
        break;
      case 'url':
        clauses.push(termClause('url.full', value), termClause('url.original', value));
        break;
      case 'hash': {
        const hashLen = value.length;
        const field =
          hashLen === 32
            ? 'file.hash.md5'
            : hashLen === 40
            ? 'file.hash.sha1'
            : hashLen === 64
            ? 'file.hash.sha256'
            : null;
        if (field) {
          clauses.push(
            termClause(field, value),
            termClause(field.replace('file.', 'process.'), value),
            termClause(field.replace('file.', 'dll.'), value)
          );
        }
        break;
      }
      default:
        break;
    }
  }
  return clauses;
};

const buildTechniqueShould = (techniques: string[]): Array<Record<string, unknown>> =>
  techniques.length === 0
    ? []
    : [{ terms: { 'kibana.alert.rule.threat.technique.id': techniques } }];

const DEFAULT_LOOKBACK_DAYS = 30;

export const huntForThreatTool: BuiltinSkillBoundedTool<typeof huntForThreatSchema> = {
  id: THREAT_INTEL_TOOL_IDS.huntForThreat,
  type: ToolType.builtin,
  description:
    "Active forward hunt for a threat report's IOCs (and optional ATT&CK technique IDs) " +
    'across the customer environment: `.alerts-security.alerts-*`, `metrics-endpoint.*`, ' +
    '`logs-vulnerability.*`, `logs-aws.*`, `logs-network_traffic.*`. Returns the top matching ' +
    'documents AND an `affected_assets` aggregation (unique hosts + users currently matched). ' +
    'Use when the user asks "are we affected by this advisory?", "is X in our environment?", ' +
    'or "which hosts touched this campaign?". Distinct from `hunt_behavior` (which extracts ' +
    'behaviors from report text into proposed Detection Engine rules) and from the retrospective ' +
    '`hit_provenance_backfill` workflow (which attributes existing alerts back to reports).',
  schema: huntForThreatSchema,
  handler: async (
    {
      report_id: reportId,
      iocs: explicitIocs,
      techniques: explicitTechniques,
      time_range: timeRange,
      size,
      max_assets: maxAssets,
    },
    { esClient, logger }
  ) => {
    let resolved: ResolvedHuntInput = {
      iocs: explicitIocs ?? [],
      techniques: explicitTechniques ?? [],
    };

    if (reportId && (resolved.iocs.length === 0 || resolved.techniques.length === 0)) {
      try {
        const reportResponse = await esClient.asCurrentUser.search({
          index: THREAT_REPORTS_INDEX_PATTERN,
          size: 1,
          query: { ids: { values: [reportId] } },
          _source: ['extracted.iocs', 'extracted.ttps.techniques', 'extracted.behaviors'],
        });
        const reportSource = reportResponse.hits.hits[0]?._source as
          | {
              extracted?: {
                iocs?: Array<{ type: IocType; value: string }>;
                ttps?: { techniques?: string[] };
                behaviors?: Array<{ technique_id?: string }>;
              };
            }
          | undefined;

        if (resolved.iocs.length === 0 && reportSource?.extracted?.iocs) {
          resolved.iocs = reportSource.extracted.iocs;
        }
        if (resolved.techniques.length === 0) {
          const ttpTechniques = reportSource?.extracted?.ttps?.techniques ?? [];
          const behaviorTechniques = (reportSource?.extracted?.behaviors ?? [])
            .map((b) => b.technique_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);
          resolved = {
            ...resolved,
            techniques: Array.from(new Set([...ttpTechniques, ...behaviorTechniques])),
          };
        }
      } catch (err) {
        logger.warn(`hunt_for_threat report lookup failed: ${(err as Error).message}`);
      }
    }

    if (resolved.iocs.length === 0 && resolved.techniques.length === 0) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                'No IOCs or ATT&CK technique IDs to hunt against. Pass `iocs[]` or `techniques[]` ' +
                'explicitly, or pass a `report_id` whose extraction has already run ' +
                '(extracted.iocs / extracted.ttps.techniques).',
            },
          },
        ],
      };
    }

    const iocShould = buildIocShould(resolved.iocs);
    const techniqueShould = buildTechniqueShould(resolved.techniques);
    const should = [...iocShould, ...techniqueShould];

    if (should.length === 0) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              status: 'no_searchable_terms',
              hits: [],
              affected_assets: { hosts: [], users: [] },
              message:
                'IOCs were present but none mapped to a known ECS field (e.g. hashes with ' +
                'non-standard lengths). Re-extract or pass a normalized set and retry.',
            },
          },
        ],
      };
    }

    const from =
      timeRange?.from ??
      new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const to = timeRange?.to ?? new Date().toISOString();

    try {
      const response = await esClient.asCurrentUser.search({
        index: [...HUNT_FOR_THREAT_INDEX_PATTERNS],
        ignore_unavailable: true,
        allow_no_indices: true,
        size,
        track_total_hits: true,
        sort: [{ '@timestamp': { order: 'desc' } }],
        _source: [
          '@timestamp',
          'event.dataset',
          'event.module',
          'host.name',
          'host.os.family',
          'user.name',
          'source.ip',
          'destination.ip',
          'url.full',
          'kibana.alert.rule.name',
          'kibana.alert.rule.threat.technique',
        ],
        query: {
          bool: {
            filter: [{ range: { '@timestamp': { gte: from, lte: to } } }],
            should,
            minimum_should_match: 1,
          },
        },
        aggs: {
          per_index: {
            terms: { field: '_index', size: HUNT_FOR_THREAT_INDEX_PATTERNS.length * 4 },
          },
          affected_hosts: {
            terms: { field: 'host.name', size: maxAssets },
          },
          affected_users: {
            terms: { field: 'user.name', size: maxAssets },
          },
        },
      });

      interface HuntAggregations {
        per_index?: { buckets: Array<{ key: string; doc_count: number }> };
        affected_hosts?: { buckets: Array<{ key: string; doc_count: number }> };
        affected_users?: { buckets: Array<{ key: string; doc_count: number }> };
      }
      const aggs = response.aggregations as HuntAggregations | undefined;

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;
      const hits = (response.hits.hits ?? []).map((hit) => ({
        index: hit._index,
        id: hit._id,
        score: hit._score,
        ...(hit._source as Record<string, unknown>),
      }));

      const hosts = (aggs?.affected_hosts?.buckets ?? []).map((b) => ({
        name: b.key,
        hit_count: b.doc_count,
      }));
      const users = (aggs?.affected_users?.buckets ?? []).map((b) => ({
        name: b.key,
        hit_count: b.doc_count,
      }));
      const perIndex = (aggs?.per_index?.buckets ?? []).map((b) => ({
        index: b.key,
        hit_count: b.doc_count,
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              status: total === 0 ? 'no_environment_hits' : 'environment_hits_found',
              report_id: reportId,
              searched_iocs: resolved.iocs.length,
              searched_techniques: resolved.techniques.length,
              time_range: { from, to },
              counts: {
                total_hits: total,
                returned_hits: hits.length,
                affected_hosts: hosts.length,
                affected_users: users.length,
              },
              hits,
              affected_assets: { hosts, users },
              per_index: perIndex,
              next_step:
                total === 0
                  ? 'No environment matches in the searched time range. Consider widening the ' +
                    'window via `time_range`, or pivot to `threat_intel.hunt_behavior` to propose ' +
                    'durable rules for future detections.'
                  : 'Render the affected_assets block as a short prose summary and, if helpful, ' +
                    'open a Case via the `cases` registry tool with the report_id + top assets ' +
                    'for tracking.',
            },
          },
        ],
      };
    } catch (err) {
      logger.warn(`hunt_for_threat search failed: ${(err as Error).message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                `Failed to hunt threat across environment indices: ${(err as Error).message}. ` +
                `Verify the current user has read privileges on at least one of: ` +
                `${HUNT_FOR_THREAT_INDEX_PATTERNS.join(', ')}.`,
            },
          },
        ],
      };
    }
  },
};
