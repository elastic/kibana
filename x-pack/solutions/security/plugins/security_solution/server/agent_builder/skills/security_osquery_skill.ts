/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition, BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common/tools';
import { z } from '@kbn/zod';
import type { OsqueryPluginSetup } from '@kbn/osquery-plugin/server';

import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

const OSQUERY_RESULTS_INDEX = 'logs-osquery_manager.result*';
const OSQUERY_ACTION_RESPONSES_INDEX = 'logs-osquery_manager.action.responses*';
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 15_000;

const SKILL_CONTENT = `# Osquery

## WHEN TO USE THIS SKILL (REQUIRED)

You MUST use osquery tools when the user mentions ANY of these:
- "osquery" in any context (status, tables, installed, configured, etc.)
- Asking if osquery is installed, configured, or available
- Questions about osquery tables, columns, or schema
- Questions about osquery packs or saved queries
- Any query, live query, or results from osquery

**CRITICAL: If the question contains the word "osquery", you MUST call the relevant tool.**
**NEVER answer an osquery question without calling a tool first.**
**Even for "Is osquery installed?", you MUST call osquery_get_status first.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain ONLY:
1. Direct data from the tool results
2. No explanations or background information
3. No suggestions or setup instructions

## Available Tools

### osquery_get_status
Check osquery integration status and availability.

### osquery_get_agents (REQUIRED before running queries)
List or search for osquery-enabled agents. Use this to find agent IDs by hostname.
- Search by hostname: \`osquery_get_agents({ hostname: "server-name" })\`
- List all: \`osquery_get_agents({})\`
Returns: id (agent ID), hostname, status, platform

### osquery_get_table_schema (REQUIRED for elastic_* tables)
Discover columns and types for any osquery table. Call \`security.osquery.get_table_schema({ tableName: "<table>", agentId: "<id>" })\`.
- Returns: column names and types for the specified table
- **You MUST call this before querying ANY table starting with \`elastic_\` (e.g., \`elastic_browser_history\`). Do NOT guess columns.**

### osquery_run_live_query (requires explicit confirmation from user)
Execute a live osquery SQL query against agents.
- **ALWAYS use agent IDs from osquery_get_agents, NOT hostnames!**
- Returns: action_id, queries[].action_id, agents
- **Use queries[].action_id for fetching results**

### osquery_get_results
Fetch results from a live query. Automatically polls until results are ready.
- Pass the per-query action_id from queries[].action_id
- Returns: rows of query data, status, aggregations

### osquery_list_saved_queries
List saved osquery queries with pagination.

### osquery_list_packs
List osquery packs with pagination.

## Live Query Workflow (MANDATORY ORDER)

1. **Get agent ID first:** \`osquery_get_agents({ hostname: "..." })\`
2. **MANDATORY - Get table schema for custom/Elastic tables:** Before querying any custom or Elastic-specific table (e.g., \`elastic_browser_history\`, \`elastic_*\`), you MUST first discover the actual columns using \`osquery_get_table_schema({ tableName: "<table_name>", agentId: "<agent_id>" })\`. Standard osquery tables (e.g., \`processes\`, \`users\`, \`file\`) can be queried directly.
3. **Run query:** \`osquery_run_live_query({ query: "SELECT ...", agentIds: ["<agent_id>"] })\`
   - Response includes queries[].action_id
4. **MANDATORY - Fetch results:** \`osquery_get_results({ actionId: "<queries[0].action_id>" })\`
   - If the result status is "error", analyze the error message and fix the query (e.g., wrong column name, table not found). Do NOT ask the user to rerun — fix it yourself and rerun.
5. **Analyze results:** Report findings from actual data

## CRITICAL: Table Schema Discovery

**Before querying ANY table that starts with \`elastic_\` (e.g., \`elastic_browser_history\`), you MUST call \`security.osquery.get_table_schema\` first to discover the actual columns.**
- These are custom Elastic tables whose columns are NOT standard osquery columns
- Do NOT guess column names — they WILL fail with "no such column" errors
- Only standard osquery tables (processes, users, file, hash, etc.) can be queried without schema discovery

## CRITICAL: Agent ID vs Hostname

**WRONG:** \`osquery_run_live_query({ agentIds: ["my-server-hostname"], ... })\`
**CORRECT:** First get agent ID via osquery_get_agents, then use the UUID

## Key osquery Tables Reference

### Process Analysis
- \`processes\` - Running processes
- \`process_open_sockets\` - Network connections by process
- \`process_open_files\` - Files opened by processes

### Persistence
- \`crontab\` - Cron jobs (Linux)
- \`systemd_units\` - Systemd services (Linux)
- \`launchd\` - Launch daemons (macOS)
- \`services\` - Windows services
- \`scheduled_tasks\` - Windows scheduled tasks

### Network
- \`listening_ports\` - Open listening ports
- \`arp_cache\` - ARP table

### Users & Auth
- \`users\` - User accounts
- \`logged_in_users\` - Currently logged-in users
- \`last\` - Login history (Linux/macOS)
- \`shell_history\` - Command history

### Files & Filesystem
- \`file\` - File metadata
- \`hash\` - File hashes (md5, sha1, sha256)

### Browser (CUSTOM - MUST get schema first)
- \`elastic_browser_history\` - Unified browser history (**custom Elastic table — columns vary by version, ALWAYS call osquery_get_table_schema first**)
- \`chrome_extensions\` - Chrome extensions

## Read-Only Limitations
This skill cannot create, modify, or delete packs, saved queries, or configurations.

## FORBIDDEN RESPONSES
- "Osquery is a tool that allows you to..."
- "To configure osquery, you need to..."
- Any explanation not directly from tool results
- Any setup instructions or suggestions`;

const createGetStatusTool = (): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.get_status',
  type: ToolType.builtin,
  description: 'Check osquery integration installation and availability status',
  schema: z.object({}),
  handler: async (_, { savedObjectsClient, logger }) => {
    try {
      const packagePolicies = await savedObjectsClient.find({
        type: 'ingest-package-policies',
        filter: 'ingest-package-policies.attributes.package.name: osquery_manager',
        perPage: 1000,
      });

      const policyCount = packagePolicies.total;

      if (policyCount === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify({
                  install_status: 'not_installed',
                  message: 'No osquery package policies found',
                  package_policies_count: 0,
                }),
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: JSON.stringify({
                install_status: 'installed',
                package_policies_count: policyCount,
                message: `Osquery is installed with ${policyCount} package policy(s)`,
              }),
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`osquery get_status error: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error checking osquery status: ${error.message}` },
          },
        ],
      };
    }
  },
});

const createGetAgentsTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.get_agents',
  type: ToolType.builtin,
  description:
    'List or search for osquery-enabled agents. Use to find agent IDs before running queries.',
  schema: z.object({
    hostname: z.string().optional().describe('Search by hostname (partial match)'),
    agentId: z.string().optional().describe('Search by specific agent ID'),
    status: z
      .enum(['online', 'offline', 'inactive', 'unenrolling'])
      .optional()
      .describe('Filter by agent status'),
    platform: z.enum(['windows', 'darwin', 'linux']).optional().describe('Filter by platform'),
    perPage: z.number().optional().describe('Number of results (default: 100, max: 100)'),
  }),
  handler: async ({ hostname, agentId, status, platform, perPage = 100 }, { spaceId, logger }) => {
    try {
      const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);
      const agentClient = fleetServices.agent;

      const kueryParts: string[] = [];
      if (hostname) {
        kueryParts.push(`local_metadata.host.hostname.keyword:*${hostname}*`);
      }
      if (agentId) {
        kueryParts.push(`_id:"${agentId}"`);
      }
      if (status) {
        kueryParts.push(`status:"${status}"`);
      }
      if (platform) {
        kueryParts.push(`local_metadata.os.platform:"${platform}"`);
      }

      const kuery = kueryParts.length > 0 ? kueryParts.join(' AND ') : undefined;
      const result = await agentClient.listAgents({
        perPage: Math.min(perPage, 100),
        kuery,
        showInactive: false,
      });

      const agents = result.agents.map((agent) => ({
        id: agent.id,
        hostname: (agent.local_metadata as Record<string, any>)?.host?.hostname ?? 'unknown',
        status: agent.status,
        platform: (agent.local_metadata as Record<string, any>)?.os?.platform ?? 'unknown',
        policy_id: agent.policy_id,
        last_checkin: agent.last_checkin,
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: JSON.stringify({
                total: result.total,
                agents,
                message:
                  agents.length > 0
                    ? `Found ${agents.length} agent(s). Use the 'id' field when running queries.`
                    : 'No agents found matching the criteria.',
              }),
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`osquery get_agents error: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error fetching agents: ${error.message}` },
          },
        ],
      };
    }
  },
});

const createGetTableSchemaTool = (osquerySetup: OsqueryPluginSetup): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.get_table_schema',
  type: ToolType.builtin,
  description:
    'Discover columns and types for any osquery table. ALWAYS use before querying custom or Elastic-specific tables (e.g., elastic_browser_history) to avoid "no such column" errors.',
  schema: z.object({
    tableName: z
      .string()
      .describe('The osquery table name (e.g., "elastic_browser_history", "processes")'),
    agentId: z
      .string()
      .describe('Agent ID (UUID) to query schema from. Use osquery_get_agents to find IDs first.'),
  }),
  handler: async ({ tableName, agentId }, { esClient, spaceId, logger }) => {
    try {
      const sanitized = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      const { response: osqueryAction } = await osquerySetup.createActionService.create(
        {
          query: `PRAGMA table_info('${sanitized}')`,
          agent_ids: [agentId],
        },
        { space: { id: spaceId } }
      );

      const queryActionId = osqueryAction.queries?.[0]?.action_id ?? osqueryAction.action_id;

      const startTime = Date.now();
      const schemaTimeoutMs = 30_000;

      while (Date.now() - startTime < schemaTimeoutMs) {
        const [resultCount, responseCount] = await Promise.all([
          esClient.asInternalUser.count({
            index: OSQUERY_RESULTS_INDEX,
            ignore_unavailable: true,
            query: { bool: { filter: [{ term: { action_id: queryActionId } }] } },
          }),
          esClient.asInternalUser.count({
            index: OSQUERY_ACTION_RESPONSES_INDEX,
            ignore_unavailable: true,
            query: { bool: { filter: [{ term: { action_id: queryActionId } }] } },
          }),
        ]);

        const results = typeof resultCount.count === 'number' ? resultCount.count : 0;
        const responses = typeof responseCount.count === 'number' ? responseCount.count : 0;

        if (responses > 0 && results === 0) {
          const errors = await fetchActionErrors(esClient, queryActionId);
          if (errors.length > 0) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: JSON.stringify({
                      table: sanitized,
                      status: 'error',
                      errors,
                    }),
                  },
                },
              ],
            };
          }
        }

        if (results > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      const searchResponse = await esClient.asInternalUser.search({
        index: OSQUERY_RESULTS_INDEX,
        ignore_unavailable: true,
        size: 500,
        query: { bool: { filter: [{ term: { action_id: queryActionId } }] } },
      });

      const columns = searchResponse.hits.hits
        .map((hit) => {
          const source = (hit._source as Record<string, unknown>)?.osquery as
            | Record<string, unknown>
            | undefined;
          return {
            name: source?.name,
            type: source?.type,
          };
        })
        .filter((col) => col.name);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: JSON.stringify({
                table: sanitized,
                columns,
                message:
                  columns.length > 0
                    ? `Table "${sanitized}" has ${columns.length} columns. Use ONLY these column names in your queries.`
                    : `No schema found for table "${sanitized}". The table may not exist on this agent.`,
              }),
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`osquery get_table_schema error: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error fetching table schema: ${error.message}` },
          },
        ],
      };
    }
  },
});

const createRunLiveQueryTool = (osquerySetup: OsqueryPluginSetup): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.run_live_query',
  type: ToolType.builtin,
  description:
    'Run a live osquery query against agents. IMPORTANT: agentIds must be UUIDs from osquery_get_agents, not hostnames.',
  schema: z.object({
    query: z.string().describe('Osquery SQL query string'),
    agentIds: z
      .array(z.string())
      .describe('Agent IDs (UUIDs) to target. Use osquery_get_agents to find IDs first.'),
    timeout: z.number().optional().describe('Query timeout in seconds'),
  }),
  handler: async ({ query, agentIds, timeout }, { spaceId, logger }) => {
    try {
      const { response: osqueryAction } = await osquerySetup.createActionService.create(
        {
          query,
          agent_ids: agentIds,
          timeout,
        },
        { space: { id: spaceId } }
      );

      const agentCount = osqueryAction.agents?.length ?? 0;
      const queryActionIds =
        osqueryAction.queries?.map(
          (q: { action_id: string; id?: string; query?: string; agents?: string[] }) => ({
            action_id: q.action_id,
            query_id: q.id,
            query: q.query,
            agent_count: q.agents?.length ?? agentCount,
          })
        ) ?? [];

      const primaryQueryActionId = queryActionIds.length === 1 ? queryActionIds[0].action_id : null;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: JSON.stringify({
                action_id: osqueryAction.action_id,
                agents: osqueryAction.agents,
                agent_count: agentCount,
                queries: queryActionIds,
                message: `Live query dispatched to ${agentCount} agent(s).`,
                next_step: primaryQueryActionId
                  ? `Now call osquery_get_results with actionId="${primaryQueryActionId}" to fetch the results.`
                  : `This dispatched ${queryActionIds.length} queries. For each, call osquery_get_results with the corresponding action_id.`,
              }),
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`osquery run_live_query error: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error running live query: ${error.message}` },
          },
        ],
      };
    }
  },
});

const fetchActionErrors = async (
  esClient: { asInternalUser: { search: (...args: any[]) => Promise<any> } },
  actionId: string
): Promise<Array<{ agent_id: string; error: string }>> => {
  const errorsResponse = await esClient.asInternalUser.search({
    index: OSQUERY_ACTION_RESPONSES_INDEX,
    ignore_unavailable: true,
    size: 100,
    query: {
      bool: {
        filter: [{ term: { action_id: actionId } }, { exists: { field: 'error' } }],
      },
    },
  });

  const errors: Array<{ agent_id: string; error: string }> = [];
  for (const hit of errorsResponse.hits.hits) {
    const source = hit._source as Record<string, unknown> | undefined;
    const errorMsg = source?.error as string | undefined;
    if (errorMsg) {
      errors.push({
        agent_id: (source?.agent_id as string) || 'unknown',
        error: errorMsg,
      });
    }
  }
  return errors;
};

const createGetResultsTool = (): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.get_results',
  type: ToolType.builtin,
  description:
    'Fetch results from a live osquery query. Polls until results are ready (up to 5 minutes). Returns errors immediately if the query failed on the agent.',
  schema: z.object({
    actionId: z
      .string()
      .describe('The per-query action_id from queries[].action_id in the run_live_query response'),
    pageSize: z.number().optional().describe('Number of results per page (default: 100)'),
  }),
  handler: async ({ actionId, pageSize = 100 }, { esClient, logger }) => {
    try {
      const startTime = Date.now();
      let settled = false;

      while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
        const [resultCount, responseCount] = await Promise.all([
          esClient.asInternalUser.count({
            index: OSQUERY_RESULTS_INDEX,
            ignore_unavailable: true,
            query: { bool: { filter: [{ term: { action_id: actionId } }] } },
          }),
          esClient.asInternalUser.count({
            index: OSQUERY_ACTION_RESPONSES_INDEX,
            ignore_unavailable: true,
            query: { bool: { filter: [{ term: { action_id: actionId } }] } },
          }),
        ]);

        const results = typeof resultCount.count === 'number' ? resultCount.count : 0;
        const responses = typeof responseCount.count === 'number' ? responseCount.count : 0;

        if (responses > 0 && results === 0) {
          const errors = await fetchActionErrors(esClient, actionId);
          if (errors.length > 0) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: JSON.stringify({
                      status: 'error',
                      total_rows: 0,
                      rows: [],
                      errors,
                    }),
                  },
                },
              ],
            };
          }
        }

        if (results > 0 && responses > 0) {
          settled = true;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      const searchResponse = await esClient.asInternalUser.search({
        index: OSQUERY_RESULTS_INDEX,
        ignore_unavailable: true,
        size: Math.min(pageSize, 500),
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          bool: {
            filter: [{ term: { action_id: actionId } }],
          },
        },
      });

      const hits = searchResponse.hits.hits;
      const total =
        typeof searchResponse.hits.total === 'number'
          ? searchResponse.hits.total
          : searchResponse.hits.total?.value ?? 0;

      const rows = hits.map((hit) => {
        const source = hit._source as Record<string, unknown> | undefined;
        return source?.osquery ?? source ?? {};
      });

      const errors = await fetchActionErrors(esClient, actionId);

      const status = settled ? (errors.length > 0 ? 'error' : 'completed') : 'timeout';

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: JSON.stringify({
                status,
                total_rows: total,
                rows,
                errors: errors.length > 0 ? errors : undefined,
                warning:
                  status === 'timeout'
                    ? `Query timed out after ${Math.round(
                        (Date.now() - startTime) / 1000
                      )}s. Some agents may not have responded.`
                    : undefined,
              }),
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`osquery get_results error: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error fetching results: ${error.message}` },
          },
        ],
      };
    }
  },
});

const createListSavedQueriesTool = (): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.list_saved_queries',
  type: ToolType.builtin,
  description: 'List saved osquery queries with pagination',
  schema: z.object({
    page: z.number().optional().describe('Page number (default: 1)'),
    perPage: z.number().optional().describe('Items per page (default: 20)'),
  }),
  handler: async ({ page = 1, perPage = 20 }, { savedObjectsClient, logger }) => {
    try {
      const result = await savedObjectsClient.find({
        type: 'osquery-saved-query',
        page,
        perPage,
        sortField: 'updated_at',
        sortOrder: 'desc',
      });

      const queries = result.saved_objects.map((so) => ({
        id: so.id,
        name: (so.attributes as Record<string, unknown>).id,
        query: (so.attributes as Record<string, unknown>).query,
        description: (so.attributes as Record<string, unknown>).description,
        platform: (so.attributes as Record<string, unknown>).platform,
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: JSON.stringify({
                total: result.total,
                page: result.page,
                per_page: result.per_page,
                data: queries,
              }),
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`osquery list_saved_queries error: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error listing saved queries: ${error.message}` },
          },
        ],
      };
    }
  },
});

const createListPacksTool = (): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.list_packs',
  type: ToolType.builtin,
  description: 'List osquery packs with pagination',
  schema: z.object({
    page: z.number().optional().describe('Page number (default: 1)'),
    perPage: z.number().optional().describe('Items per page (default: 20)'),
  }),
  handler: async ({ page = 1, perPage = 20 }, { savedObjectsClient, logger }) => {
    try {
      const result = await savedObjectsClient.find({
        type: 'osquery-pack',
        page,
        perPage,
        sortField: 'updated_at',
        sortOrder: 'desc',
      });

      const packs = result.saved_objects.map((so) => ({
        id: so.id,
        name: (so.attributes as Record<string, unknown>).name,
        description: (so.attributes as Record<string, unknown>).description,
        enabled: (so.attributes as Record<string, unknown>).enabled,
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: JSON.stringify({
                total: result.total,
                page: result.page,
                per_page: result.per_page,
                data: packs,
              }),
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`osquery list_packs error: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error listing packs: ${error.message}` },
          },
        ],
      };
    }
  },
});

interface CreateOsquerySkillOptions {
  endpointAppContextService: EndpointAppContextService;
  osquerySetup?: OsqueryPluginSetup;
}

export const createSecurityOsquerySkill = ({
  endpointAppContextService,
  osquerySetup,
}: CreateOsquerySkillOptions): SkillDefinition<'osquery', 'skills/security/endpoint'> => {
  return defineSkillType({
    id: 'security.osquery',
    name: 'osquery',
    basePath: 'skills/security/endpoint',
    description:
      'Osquery operations: status checks, agent listing, live queries, packs, saved queries, and result retrieval for endpoint investigation',
    content: SKILL_CONTENT,
    getInlineTools: () => {
      const tools: BuiltinSkillBoundedTool[] = [
        createGetStatusTool(),
        createGetAgentsTool(endpointAppContextService),
        createListSavedQueriesTool(),
        createListPacksTool(),
        createGetResultsTool(),
      ];

      if (osquerySetup) {
        tools.push(createGetTableSchemaTool(osquerySetup));
        tools.push(createRunLiveQueryTool(osquerySetup));
      }

      return tools;
    },
  });
};
