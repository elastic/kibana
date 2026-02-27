/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition, BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common/tools';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { z } from '@kbn/zod';
import type { OsqueryPluginSetup } from '@kbn/osquery-plugin/server';

import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

interface OsquerySchemaColumn {
  name: string;
  type: string;
  description: string;
}

interface OsquerySchemaTable {
  name: string;
  description: string;
  platforms: string[];
  columns: OsquerySchemaColumn[];
}

let osquerySchemaCache: OsquerySchemaTable[] | null = null;

const getOsquerySchema = (): OsquerySchemaTable[] => {
  if (!osquerySchemaCache) {
    osquerySchemaCache = require('@kbn/osquery-plugin/public/common/schemas/osquery/v5.20.0.json');
  }
  return osquerySchemaCache as OsquerySchemaTable[];
};

const OSQUERY_RESULTS_INDEX = 'logs-osquery_manager.result*';
const OSQUERY_ACTION_RESPONSES_INDEX =
  'logs-osquery_manager.action.responses*,.logs-osquery_manager.action.responses*,.fleet-actions-results*';

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

## CRITICAL: Never Pause — Always Complete the Full Workflow

**After dispatching a live query, you MUST immediately call osquery_get_results to fetch the results.** Do NOT:
- Ask the user if they want to wait for results
- Tell the user the query is running and ask what to do next
- Pause to describe what you plan to do with the results
- Output intermediate status updates before fetching results
- Output a summary of "what's happening now" or "next steps after results"

The get_results tool handles all waiting internally (up to 90 seconds). It will return final results directly. Call it, then analyze the results in your response. The user expects a complete answer, not a status update.

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
- Filter by policy: \`osquery_get_agents({ policyId: "<policy_uuid>" })\`
- List all: \`osquery_get_agents({})\`
Returns: id (agent ID), hostname, status, platform, policy_id, policy_name

### osquery_get_table_schema (REQUIRED before querying unknown tables)
Discover available tables and their schemas. Two modes:
- **List tables:** \`osquery_get_table_schema({})\` — returns ALL available osquery tables. Filter with \`platform\` (linux/darwin/windows) and/or \`search\` (keyword to match table names/descriptions, e.g., "browser", "chrome", "process", "network").
- **Get columns for a table:** \`osquery_get_table_schema({ tableName: "<table>", agentId: "<id>" })\` — returns columns and types via live PRAGMA query on the agent.
- **IMPORTANT: If you don't know the exact table name, LIST tables first with a search keyword.** Do NOT guess table names — search for them.
- **You MUST call this before querying ANY table starting with \`elastic_\` (e.g., \`elastic_browser_history\`). Do NOT guess columns.**

### osquery_run_live_query (requires explicit confirmation from user)
Execute a live osquery SQL query against agents.
- **ALWAYS use agent IDs from osquery_get_agents, NOT hostnames!**
- **For cross-endpoint sweeps, use \`agentAll: true\` instead of listing every agent ID** — this is simpler and targets all osquery-enabled agents automatically.
- **For targeted queries on specific hosts**, pass \`agentIds\` with UUIDs.
- **For policy-scoped queries**, pass \`agentPolicyIds\` to target agents in specific policies.
- Returns: **action_id** (parent), queries[].action_id (per-query), agent_count, **online_agent_count**, agents
- **Use online_agent_count (not agent_count) as expectedAgents** when calling get_results — agent_count includes offline agents that will never respond.
- **Use queries[].action_id as actionId AND action_id as parentActionId** when calling get_results

### osquery_get_results
Fetch results from a live query. Waits internally for up to 90 seconds for all online agents to respond — no need to retry manually.
- Pass the per-query action_id from queries[].action_id as \`actionId\`
- **ALWAYS pass parentActionId** (the top-level action_id from run_live_query response) — this is needed to track agent responses.
- **ALWAYS pass expectedAgents using online_agent_count from run_live_query response** (NOT agent_count — that includes offline agents).
- The tool handles waiting internally — just call it once and it returns final results.
- Returns: rows of query data, status, agents_responded, agents_expected, errors

### osquery_list_saved_queries
List saved osquery queries with pagination.

### osquery_list_packs
List osquery packs with pagination.

## Live Query Workflow (MANDATORY ORDER)

1. **Get agent ID first:** \`osquery_get_agents({ hostname: "..." })\`
2. **MANDATORY - Discover the right table:** If you're unsure of the exact table name, search for it: \`osquery_get_table_schema({ search: "browser", platform: "linux" })\`. This returns matching table names so you don't have to guess.
3. **MANDATORY - Get table schema for custom/Elastic tables:** Before querying any custom or Elastic-specific table (e.g., \`elastic_browser_history\`, \`elastic_*\`), you MUST first discover the actual columns using \`osquery_get_table_schema({ tableName: "<table_name>", agentId: "<agent_id>" })\`. Standard osquery tables (e.g., \`processes\`, \`users\`, \`file\`) can be queried directly.
4. **Run query:**
   - **For cross-endpoint sweeps / IOC hunts**: \`osquery_run_live_query({ query: "SELECT ...", agentAll: true })\` — **ALWAYS prefer agentAll for multi-endpoint queries**
   - **For single-endpoint analysis**: \`osquery_run_live_query({ query: "SELECT ...", agentIds: ["<agent_id>"] })\`
   - Response includes queries[].action_id (per-query), action_id (parent), and **online_agent_count**
5. **MANDATORY - Fetch results IMMEDIATELY:** \`osquery_get_results({ actionId: "<queries[0].action_id>", parentActionId: "<action_id>", expectedAgents: <online_agent_count> })\`
   - **ALWAYS pass parentActionId** (the top-level action_id) — agent responses are tracked under this ID.
   - **ALWAYS pass expectedAgents using online_agent_count (NOT agent_count)** — agent_count includes offline agents that will never respond, causing the tool to wait forever.
   - **Do NOT stop to ask the user if they want to wait — ALWAYS fetch results immediately.**
   - The tool waits internally for up to 90 seconds for all agents to respond. Just call it once.
   - If the result status is "error", analyze the error message and fix the query (e.g., wrong column name, table not found). Do NOT ask the user to rerun — fix it yourself and rerun.
6. **Analyze results:** Report findings from actual data. Never output partial status — wait for complete results then present analysis.
   - **CRITICAL: Check unique_agents_with_results** — this tells you how many DISTINCT hosts returned data. If > 1, multiple hosts are affected. Do NOT claim "no spread" when multiple agents have results.

## CRITICAL: Table Schema Discovery

**If you don't know the exact table name, SEARCH first:**
\`\`\`
osquery_get_table_schema({ search: "browser" })          // Find tables related to browsers
osquery_get_table_schema({ search: "chrome", platform: "linux" })  // Chrome tables on Linux
osquery_get_table_schema({})                              // List ALL tables
\`\`\`

**Before querying ANY table that starts with \`elastic_\` (e.g., \`elastic_browser_history\`), you MUST call \`security.osquery.get_table_schema\` with the tableName and agentId to discover the actual columns.**
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

## Cross-Endpoint Queries

When investigating whether other endpoints are affected (e.g., "did other users visit this domain?"), **ALWAYS use \`agentAll: true\`**. Do NOT collect individual agent IDs and pass them as \`agentIds\` — that is slower, error-prone, and unnecessary.

### Sweeping ALL Agents (REQUIRED for blast radius / IOC hunts)
**ALWAYS use \`agentAll: true\` for any multi-endpoint query:**
\`\`\`
osquery_run_live_query({
  query: "SELECT ... FROM elastic_browser_history WHERE url LIKE '%malicious.com%'",
  agentAll: true
})
\`\`\`

### Querying a Single Specific Agent
For targeted queries on a known specific host, pass its UUID:
\`\`\`
osquery_run_live_query({
  query: "SELECT ... FROM elastic_browser_history WHERE url LIKE '%malicious.com%'",
  agentIds: ["<id1>", "<id2>", "<id3>"]
})
\`\`\`

### Identifying Results Per Agent
Each row returned by \`osquery_get_results\` includes an \`_agent_id\` field. Match this back to the agent list from \`osquery_get_agents\` to determine which endpoint produced each result.

### Identifying Endpoint Protection Levels
The \`osquery_get_agents\` tool returns \`policy_name\` for each agent. Use this to distinguish:
- **Fully protected endpoints**: Policy name includes "Defend" (Elastic Defend + Osquery)
- **Osquery-only endpoints**: Policy name does NOT include "Defend" (no endpoint protection)

When reporting cross-endpoint findings, always highlight which affected endpoints lack Elastic Defend and recommend deploying it for complete visibility.

## Read-Only Limitations
This skill cannot create, modify, or delete packs, saved queries, or configurations.

## FORBIDDEN RESPONSES
- "Osquery is a tool that allows you to..."
- "To configure osquery, you need to..."
- "Would you like me to retrieve the results now?"
- "The query is running. Would you like to wait?"
- "The query has been dispatched, let me know when you'd like to check results"
- "What's happening now..." / "Current status..." / "Next steps after results..."
- Any message that describes what the tool is doing instead of calling it
- Any message that pauses execution to ask the user whether to continue
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
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`osquery get_status error: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error checking osquery status: ${message}` },
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
    'List or search for osquery-enabled agents. Use to find agent IDs before running queries. Returns policy_name to identify endpoint protection level.',
  schema: z.object({
    hostname: z.string().optional().describe('Search by hostname (partial match)'),
    agentId: z.string().optional().describe('Search by specific agent ID'),
    policyId: z.string().optional().describe('Filter by agent policy ID'),
    status: z
      .enum(['online', 'offline', 'inactive', 'unenrolling'])
      .optional()
      .describe('Filter by agent status'),
    platform: z.enum(['windows', 'darwin', 'linux']).optional().describe('Filter by platform'),
    perPage: z.number().optional().describe('Number of results (default: 100, max: 100)'),
  }),
  handler: async (
    { hostname, agentId, policyId, status, platform, perPage = 100 },
    { spaceId, logger }
  ) => {
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
      if (policyId) {
        kueryParts.push(`policy_id:"${policyId}"`);
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

      const uniquePolicyIds = [
        ...new Set(result.agents.map((a) => a.policy_id).filter(Boolean)),
      ] as string[];

      const policyNameMap = new Map<string, string>();
      if (uniquePolicyIds.length > 0) {
        const soClient = fleetServices.getSoClient();
        await Promise.all(
          uniquePolicyIds.map(async (pid) => {
            try {
              const policy = await fleetServices.agentPolicy.get(soClient, pid, false);
              if (policy) {
                policyNameMap.set(pid, policy.name);
              }
            } catch {
              // Policy may have been deleted; skip
            }
          })
        );
      }

      const agents = result.agents.map((agent) => ({
        id: agent.id,
        hostname:
          (agent.local_metadata as Record<string, Record<string, unknown>>)?.host?.hostname ??
          'unknown',
        status: agent.status,
        platform:
          (agent.local_metadata as Record<string, Record<string, unknown>>)?.os?.platform ??
          'unknown',
        policy_id: agent.policy_id,
        policy_name: agent.policy_id ? policyNameMap.get(agent.policy_id) ?? 'unknown' : 'unknown',
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
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`osquery get_agents error: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error fetching agents: ${message}` },
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
    'Discover osquery tables and their schemas. Call WITHOUT tableName to list all available tables (filtered by platform/search). Call WITH tableName + agentId to get live column details for a specific table.',
  schema: z.object({
    tableName: z
      .string()
      .optional()
      .describe(
        'Table name to get schema for (e.g., "elastic_browser_history", "processes"). Omit to list all available tables.'
      ),
    agentId: z
      .string()
      .optional()
      .describe(
        'Agent ID (UUID) to query live schema from. Required when tableName is provided. Use osquery_get_agents to find IDs first.'
      ),
    platform: z
      .enum(['linux', 'darwin', 'windows'])
      .optional()
      .describe('Filter tables by OS platform. Only used when listing tables (no tableName).'),
    search: z
      .string()
      .optional()
      .describe(
        'Search keyword to filter table names and descriptions (e.g., "browser", "chrome", "process"). Only used when listing tables (no tableName).'
      ),
  }),
  handler: async ({ tableName, agentId, platform, search }, { esClient, spaceId, logger }) => {
    try {
      if (!tableName) {
        const schema = getOsquerySchema();
        let tables = schema;

        if (platform) {
          tables = tables.filter((t) => t.platforms.includes(platform));
        }

        if (search) {
          const term = search.toLowerCase();
          tables = tables.filter(
            (t) => t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term)
          );
        }

        const result = tables.map((t) => ({
          name: t.name,
          description: t.description,
          platforms: t.platforms,
          columns_count: t.columns?.length ?? 0,
        }));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: JSON.stringify({
                  total: result.length,
                  tables: result,
                  message:
                    result.length > 0
                      ? `Found ${result.length} table(s).${search ? ` Filtered by "${search}".` : ''
                      }${platform ? ` Platform: ${platform}.` : ''
                      } Call again with tableName and agentId to get full column details for a specific table.`
                      : `No tables found${search ? ` matching "${search}"` : ''}${platform ? ` for platform ${platform}` : ''
                      }.`,
                }),
              },
            },
          ],
        };
      }

      if (!agentId) {
        const schema = getOsquerySchema();
        const staticTable = schema.find((t) => t.name === tableName);
        if (staticTable) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: JSON.stringify({
                    table: staticTable.name,
                    description: staticTable.description,
                    platforms: staticTable.platforms,
                    columns: staticTable.columns.map((c) => ({
                      name: c.name,
                      type: c.type,
                      description: c.description,
                    })),
                    source: 'static_schema',
                    message: `Table "${staticTable.name}" has ${staticTable.columns.length} columns (from static schema v5.20.0). For custom/Elastic tables, provide an agentId to query live schema.`,
                  }),
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Table "${tableName}" not found in static schema. If this is a custom/Elastic table (e.g., elastic_browser_history), provide an agentId to query the live schema from an agent.`,
              },
            },
          ],
        };
      }

      const sanitized = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      const { response: osqueryAction } = await osquerySetup.createActionService.create(
        {
          query: `PRAGMA table_info('${sanitized}')`,
          agent_ids: [agentId],
        },
        { space: { id: spaceId } }
      );

      const queryActionId = osqueryAction.queries?.[0]?.action_id ?? osqueryAction.action_id;
      const parentSchemaActionId = osqueryAction.action_id;

      const startTime = Date.now();
      const schemaTimeoutMs = 60_000;

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
            query: { bool: { filter: [{ term: { action_id: parentSchemaActionId } }] } },
          }),
        ]);

        const results = typeof resultCount.count === 'number' ? resultCount.count : 0;
        const responses = typeof responseCount.count === 'number' ? responseCount.count : 0;

        if (responses > 0 && results === 0) {
          const errors = await fetchActionErrors(esClient, parentSchemaActionId);
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

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: JSON.stringify({
                    table: sanitized,
                    columns: [],
                    source: 'live_agent',
                    message: `Agent responded but returned no schema for table "${sanitized}". The table may not exist on this agent.`,
                  }),
                },
              },
            ],
          };
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
                source: 'live_agent',
                message:
                  columns.length > 0
                    ? `Table "${sanitized}" has ${columns.length} columns (live from agent). Use ONLY these column names in your queries.`
                    : `No schema found for table "${sanitized}". The table may not exist on this agent.`,
              }),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`osquery get_table_schema error: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error fetching table schema: ${message}` },
          },
        ],
      };
    }
  },
});

const createRunLiveQueryTool = (
  osquerySetup: OsqueryPluginSetup,
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.run_live_query',
  type: ToolType.builtin,
  description:
    'Run a live osquery query against agents. Use agentIds for specific agents, or agentAll=true to target every agent. IMPORTANT: agentIds must be UUIDs from osquery_get_agents, not hostnames.',
  schema: z.object({
    query: z.string().describe('Osquery SQL query string'),
    agentIds: z
      .array(z.string())
      .optional()
      .describe(
        'Agent IDs (UUIDs) to target. Use osquery_get_agents to find IDs first. Omit if using agentAll.'
      ),
    agentAll: z
      .boolean()
      .optional()
      .describe('Run query on ALL osquery-enabled agents. Use for cross-endpoint sweeps.'),
    agentPolicyIds: z
      .array(z.string())
      .optional()
      .describe('Filter agents by policy IDs. Useful for targeting specific policy groups.'),
    timeout: z.number().optional().describe('Query timeout in seconds'),
  }),
  handler: async ({ query, agentIds, agentAll, agentPolicyIds, timeout }, { spaceId, logger }) => {
    try {
      const actionParams: Record<string, unknown> = { query, timeout };

      if (agentAll) {
        actionParams.agent_all = true;
      } else if (agentPolicyIds?.length) {
        actionParams.agent_policy_ids = agentPolicyIds;
      } else if (agentIds?.length) {
        actionParams.agent_ids = agentIds;
      } else {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'You must specify agentIds, agentAll, or agentPolicyIds to target agents.',
              },
            },
          ],
        };
      }

      const { response: osqueryAction } = await osquerySetup.createActionService.create(
        actionParams,
        { space: { id: spaceId } }
      );

      const agentCount = osqueryAction.agents?.length ?? 0;
      const queryActionIds =
        osqueryAction.queries?.map((q: Record<string, unknown>) => ({
          action_id: q.action_id as string,
          query_id: q.id as string | undefined,
          query: q.query as string | undefined,
          agent_count: (q.agents as string[] | undefined)?.length ?? agentCount,
        })) ?? [];

      let onlineAgentCount = agentCount;
      if (agentAll && agentCount > 0) {
        try {
          const fleetServices = endpointAppContextService.getInternalFleetServices(spaceId);
          const agentClient = fleetServices.agent;
          const onlineResult = await agentClient.listAgents({
            perPage: 0,
            kuery: 'status:"online"',
            showInactive: false,
          });
          onlineAgentCount = Math.min(onlineResult.total, agentCount);
        } catch (e) {
          logger.warn(`Could not determine online agent count: ${e}`);
        }
      }

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
                online_agent_count: onlineAgentCount,
                queries: queryActionIds,
                message: agentAll
                  ? `Live query dispatched to ${agentCount} agent(s) (${onlineAgentCount} online). Use online_agent_count (${onlineAgentCount}) as expectedAgents — offline agents will never respond.`
                  : `Live query dispatched to ${agentCount} agent(s).`,
                next_step: primaryQueryActionId
                  ? `IMMEDIATELY call osquery_get_results with actionId="${primaryQueryActionId}", parentActionId="${osqueryAction.action_id}", and expectedAgents=${onlineAgentCount} to fetch the results. Do NOT ask the user — fetch now.`
                  : `This dispatched ${queryActionIds.length} queries. For each, IMMEDIATELY call osquery_get_results with the corresponding action_id, parentActionId="${osqueryAction.action_id}", and expectedAgents=${onlineAgentCount}. Do NOT ask the user — fetch now.`,
              }),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`osquery run_live_query error: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error running live query: ${message}` },
          },
        ],
      };
    }
  },
});

const fetchActionErrors = async (
  esClient: Pick<IScopedClusterClient, 'asInternalUser'>,
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

const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 5_000;

const createGetResultsTool = (): BuiltinSkillBoundedTool => ({
  id: 'security.osquery.get_results',
  type: ToolType.builtin,
  description:
    'Fetch results from a live osquery query. Waits up to 90 seconds for all online agents to respond, then returns final results. Always call this immediately after run_live_query — it handles the waiting internally.',
  schema: z.object({
    actionId: z
      .string()
      .describe('The per-query action_id from queries[].action_id in the run_live_query response'),
    parentActionId: z
      .string()
      .optional()
      .describe(
        'The parent action_id from run_live_query response (top-level action_id, NOT queries[].action_id). Required for tracking agent responses.'
      ),
    expectedAgents: z
      .number()
      .optional()
      .describe(
        'Number of ONLINE agents expected to respond (use online_agent_count from run_live_query, NOT agent_count which includes offline agents).'
      ),
    pageSize: z.number().optional().describe('Number of results per page (default: 100)'),
  }),
  handler: async (
    { actionId, parentActionId, expectedAgents, pageSize = 100 },
    { esClient, logger }
  ) => {
    try {
      const startTime = Date.now();
      const responseActionId = parentActionId ?? actionId;

      while (Date.now() - startTime < POLL_TIMEOUT_MS) {
        const [resultCount, responseCount] = await Promise.all([
          esClient.asInternalUser.count({
            index: OSQUERY_RESULTS_INDEX,
            ignore_unavailable: true,
            query: { bool: { filter: [{ term: { action_id: actionId } }] } },
          }),
          esClient.asInternalUser.count({
            index: OSQUERY_ACTION_RESPONSES_INDEX,
            ignore_unavailable: true,
            query: { bool: { filter: [{ term: { action_id: responseActionId } }] } },
          }),
        ]);

        const results = typeof resultCount.count === 'number' ? resultCount.count : 0;
        const responses = typeof responseCount.count === 'number' ? responseCount.count : 0;
        const allAgentsResponded = expectedAgents ? responses >= expectedAgents : false;

        if (responses > 0 && results === 0 && allAgentsResponded) {
          const errors = await fetchActionErrors(esClient, responseActionId);
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: JSON.stringify({
                    status: errors.length > 0 ? 'partial_error' : 'completed',
                    total_rows: 0,
                    rows: [],
                    agents_responded: responses,
                    agents_expected: expectedAgents ?? 'unknown',
                    errors: errors.length > 0 ? errors : undefined,
                    message:
                      errors.length > 0
                        ? `All ${responses} agent(s) responded. ${errors.length} had errors, the rest returned 0 rows.`
                        : `All ${responses} agent(s) responded with 0 results. The queried data does not exist on any agent.`,
                  }),
                },
              },
            ],
          };
        }

        if (responses > 0 && results === 0) {
          const errors = await fetchActionErrors(esClient, responseActionId);
          if (errors.length > 0 && errors.length >= responses) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: JSON.stringify({
                      status: 'error',
                      total_rows: 0,
                      rows: [],
                      agents_responded: responses,
                      agents_expected: expectedAgents ?? 'unknown',
                      errors,
                      message: `All ${responses} responding agent(s) returned errors.`,
                    }),
                  },
                },
              ],
            };
          }
        }

        if (results > 0 && responses > 0 && allAgentsResponded) {
          return await fetchAndReturnResults(
            esClient,
            actionId,
            responseActionId,
            expectedAgents,
            responses,
            pageSize
          );
        }

        if (results > 0 && responses > 0 && !expectedAgents) {
          return await fetchAndReturnResults(
            esClient,
            actionId,
            responseActionId,
            expectedAgents,
            responses,
            pageSize
          );
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      const finalResponseCount = await esClient.asInternalUser.count({
        index: OSQUERY_ACTION_RESPONSES_INDEX,
        ignore_unavailable: true,
        query: { bool: { filter: [{ term: { action_id: responseActionId } }] } },
      });
      const finalResponses =
        typeof finalResponseCount.count === 'number' ? finalResponseCount.count : 0;

      const finalResultCount = await esClient.asInternalUser.count({
        index: OSQUERY_RESULTS_INDEX,
        ignore_unavailable: true,
        query: { bool: { filter: [{ term: { action_id: actionId } }] } },
      });
      const finalResults =
        typeof finalResultCount.count === 'number' ? finalResultCount.count : 0;

      if (finalResults > 0) {
        return await fetchAndReturnResults(
          esClient,
          actionId,
          responseActionId,
          expectedAgents,
          finalResponses,
          pageSize
        );
      }

      const errors = await fetchActionErrors(esClient, responseActionId);
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: JSON.stringify({
                status: finalResponses > 0 ? 'completed' : 'timeout',
                total_rows: 0,
                rows: [],
                agents_responded: finalResponses,
                agents_expected: expectedAgents ?? 'unknown',
                errors: errors.length > 0 ? errors : undefined,
                message:
                  finalResponses > 0
                    ? `${finalResponses} agent(s) responded with 0 results after ${Math.round((Date.now() - startTime) / 1000)}s.`
                    : `Timed out after ${Math.round((Date.now() - startTime) / 1000)}s. ${finalResponses}/${expectedAgents ?? '?'} agents responded. Call again to check if more results arrived.`,
              }),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`osquery get_results error: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error fetching results: ${message}` },
          },
        ],
      };
    }
  },
});

const fetchAndReturnResults = async (
  esClient: Pick<IScopedClusterClient, 'asInternalUser'>,
  actionId: string,
  responseActionId: string,
  expectedAgents: number | undefined,
  agentsResponded: number,
  pageSize: number
) => {
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
    const osqueryData = (source?.osquery as Record<string, unknown>) ?? {};
    const agentObj = source?.agent as Record<string, unknown> | undefined;
    return {
      ...osqueryData,
      _agent_id: agentObj?.id ?? source?.agent_id,
    };
  });

  const uniqueAgentIds = [...new Set(rows.map((r) => r._agent_id).filter(Boolean))];
  const errors = await fetchActionErrors(esClient, responseActionId);

  return {
    results: [
      {
        type: ToolResultType.other,
        data: {
          message: JSON.stringify({
            status: errors.length > 0 ? 'partial_error' : 'completed',
            total_rows: total,
            unique_agents_with_results: uniqueAgentIds.length,
            agent_ids_with_results: uniqueAgentIds,
            rows,
            agents_responded: agentsResponded,
            agents_expected: expectedAgents ?? 'unknown',
            errors: errors.length > 0 ? errors : undefined,
          }),
        },
      },
    ],
  };
};

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
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`osquery list_saved_queries error: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error listing saved queries: ${message}` },
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
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`osquery list_packs error: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Error listing packs: ${message}` },
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
        tools.push(createRunLiveQueryTool(osquerySetup, endpointAppContextService));
      }

      return tools;
    },
  });
};
