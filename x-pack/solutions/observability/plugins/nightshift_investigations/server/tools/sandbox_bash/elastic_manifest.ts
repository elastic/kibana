/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { SANDBOX_BASH_TOOL_ID } from './tool';
import { ELASTIC_MANIFEST_PATH } from './connector_docs';

/** Where the sandbox gets Elasticsearch credentials: the telemetry connector. */
export interface ElasticCredentials {
  kind: 'connector';
  connectorId: string;
}

const describeCredentials = (credentials: ElasticCredentials) => ({
  urlVar: 'CONNECTOR_CONFIG_URL',
  authVar: 'CONNECTOR_HEADER_AUTHORIZATION',
  authDescription: 'full Authorization header value (`ApiKey <key>`)',
  authHeader: '$CONNECTOR_HEADER_AUTHORIZATION',
  parameterName: 'connector_id',
  parameter: `connector_id: "${credentials.connectorId}"`,
});

const DEFAULT_REMOTE_GUIDANCE = [
  'This cluster may reach other clusters through cross-cluster search (CCS). Address a remote',
  'index as `<remote>:<index>`, in `_resolve/index`, `_field_caps`, `_count`, `_search` and ES|QL',
  '`FROM` alike. List the remote names with `GET /_remote/info`; if that is forbidden, use the',
  'names the operator gives you. Which indices you may read depends on the API key: discover them',
  'with the workflow below rather than assuming names.',
].join('\n');

/**
 * Operator text says where to look, never what the data contains. Local indices (stored in the
 * queried cluster, no remote prefix) and remote clusters (`remote:index`) get separate sections
 * when both are configured, so a question naming a data stream is not answered from a same-named
 * remote one.
 */
const renderDataSources = ({
  readableIndices,
  localIndices,
}: {
  readableIndices?: string;
  localIndices?: string;
}): string[] => {
  const remote = readableIndices?.trim() || DEFAULT_REMOTE_GUIDANCE;
  const local = localIndices?.trim();
  return [
    ...(local
      ? [
          '## Local indices',
          '',
          'Stored in the queried cluster itself: query them without a remote prefix. A data stream',
          'named without a remote refers to the local one; a remote can hold a stream with the same',
          'name and different data.',
          '',
          local,
          '',
        ]
      : []),
    '## Remote clusters',
    '',
    remote,
    '',
  ];
};

/** How to query cluster telemetry from the sandbox. Names env vars; never embeds secrets. */
export const renderElasticManifest = (
  credentials: ElasticCredentials,
  { readableIndices, localIndices }: { readableIndices?: string; localIndices?: string } = {}
): string => {
  const { urlVar, authVar, authDescription, authHeader, parameterName, parameter } =
    describeCredentials(credentials);
  const url = `$${urlVar}`;
  const curl = `curl --fail-with-body -sS --max-time 120 -H "Authorization: ${authHeader}"`;
  return [
    '# Elasticsearch telemetry',
    '',
    `Query this cluster by passing \`${parameter}\` to \`${SANDBOX_BASH_TOOL_ID}\`.`,
    'Credentials are not stored here: for that single command only, the environment contains',
    '',
    `- \`${urlVar}\` — Elasticsearch URL`,
    `- \`${authVar}\` — ${authDescription}`,
    '',
    'Reference those variables directly and never hard-code their values. A command that omits',
    `\`${parameterName}\` gets no credentials and cannot reach Elasticsearch.`,
    '',
    ...renderDataSources({ readableIndices, localIndices }),
    '## Workflow',
    '',
    'This document says where and how to look, not what the data contains. Every name, number or',
    'list you report must come from a query result in this session, never from this document or',
    'from memory.',
    '',
    '1. Find the data stream: `GET /_resolve/index/<pattern>` (`<remote>:<pattern>` for a remote).',
    '   Query one specific data stream, not a broad `logs-*`: on large clusters a broad pattern',
    '   scans every data stream and times out.',
    '2. Check which streams map a field before querying it: `GET /<index>/_field_caps?fields=<field>`',
    '   with `include_unmapped=true`. `Unknown column [x]` means no index in the `FROM` pattern maps',
    '   `x`: pick another stream instead of retrying. Field names differ between ECS data and',
    '   OpenTelemetry data, so confirm them rather than assuming.',
    '3. Query with ES|QL (`POST /_query?format=txt`), or `_count` / `_search` where that is simpler.',
    '   Prefer `STATS` for totals and a small `LIMIT` for raw documents.',
    '',
    '## Query rules',
    '',
    '- Bound every telemetry query with a time range on the timestamp field and every curl with',
    '  `--max-time 120`. If a query times out, filter on a keyword field before any text match, or',
    '  split the window.',
    '- Never hide a failure: no `2>/dev/null`, `|| true`, or piping a response straight into `jq`.',
    '  A failed request then looks like no data. Check for `.error` first.',
    '- With many remotes, name each one explicitly and query them in parallel with a short',
    '  per-request timeout (last example below): a sequential loop over dozens of remotes exceeds',
    '  the sandbox command timeout and returns nothing. Never use wildcard remote names in',
    '  `_resolve/*` or `_cat/*` calls.',
    "- Build ES|QL bodies with `jq -n --arg q '<ES|QL>' '{query: $q}' | curl … -d @-` so the query",
    '  needs no JSON escaping, and put regexes in triple-quoted `"""…"""` strings.',
    '- ES|QL traps: `LIKE` wildcards are `*`, not `%`; string comparison is case-sensitive; use',
    '  `MATCH_PHRASE(message, "…")` for text; count conditionally with `COUNT(*) WHERE …`; numeric',
    '  looking fields may be `keyword` (compare with `TO_INTEGER(…)`); integer division truncates',
    '  (`100.0 * a / b`); `==` and `!=` never match null (use `IS NULL`); quote field names',
    '  containing `/` or `-` in backticks; `first` and `last` are reserved; without `LIMIT`,',
    '  results stop at 1000 rows.',
    '- The sandbox has `jq` and `python3`; there is no `python`.',
    '',
    '## Examples',
    '',
    '```bash',
    `# ${parameterName} must be set on every one of these commands`,
    '# Find data streams matching a keyword (add "<remote>:" for a remote)',
    `${curl} \\`,
    `  "${url}/_resolve/index/*<keyword>*"`,
    '',
    '# Which indices map a field',
    `${curl} \\`,
    `  "${url}/<index>/_field_caps?fields=<field>&include_unmapped=true"`,
    '',
    '# Count and group, bounded in time',
    `${curl} \\`,
    '  -H "Content-Type: application/json" \\',
    `  "${url}/_query?format=txt" \\`,
    '  -d \'{"query":"FROM <index> | WHERE @timestamp >= \\"<START>\\" AND @timestamp < \\"<END>\\" | STATS count = COUNT(*) BY <keyword_field> | SORT count DESC | LIMIT 20"}\'',
    '',
    '# Count one data stream on every remote whose name starts with <prefix>, 8 at a time, each',
    '# line prefixed with its remote; failed requests print their error',
    'q() {',
    `  curl --fail-with-body -sS --max-time 30 -H "Authorization: ${authHeader}" \\`,
    `    -H "Content-Type: application/json" "${url}/_query?format=txt" \\`,
    '    -d "{\\"query\\":\\"FROM $1:<index> | WHERE @timestamp >= \\\\\\"<START>\\\\\\" AND @timestamp < \\\\\\"<END>\\\\\\" | STATS count = COUNT(*)\\"}" \\',
    '    2>&1 | sed "s/^/$1\\t/"',
    '}',
    'export -f q',
    `${curl} \\`,
    `  "${url}/_remote/info" | jq -r 'keys[] | select(startswith("<prefix>"))' \\`,
    '  | xargs -P 8 -n 1 bash -c \'q "$0"\'',
    '```',
    '',
  ].join('\n');
};

export const writeElasticManifest = async ({
  session,
  credentials,
  readableIndices,
  localIndices,
  logger,
}: {
  session: SandboxSession;
  credentials: ElasticCredentials;
  readableIndices?: string;
  localIndices?: string;
  logger: Logger;
}): Promise<void> => {
  logger.debug(`Writing Elasticsearch manifest`);

  const [result] = await session.writeFiles([
    {
      path: ELASTIC_MANIFEST_PATH,
      content: Buffer.from(
        renderElasticManifest(credentials, { readableIndices, localIndices }),
        'utf8'
      ),
    },
  ]);
  if (!result?.success) throw new Error('Failed to write sandbox telemetry guidance');
};
