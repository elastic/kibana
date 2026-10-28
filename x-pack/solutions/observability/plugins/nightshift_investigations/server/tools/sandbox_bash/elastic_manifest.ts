/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { SANDBOX_BASH_TOOL_ID } from './tool';

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

/** How to query cluster telemetry from the sandbox. Names env vars; never embeds secrets. */
export const renderElasticManifest = (
  credentials: ElasticCredentials,
  { readableIndices }: { readableIndices?: string } = {}
): string => {
  const { urlVar, authVar, authDescription, authHeader, parameterName, parameter } =
    describeCredentials(credentials);
  const url = `$${urlVar}`;
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
    readableIndices?.trim() || 'Readable indices: `logs-*`, `metrics-*`, `traces-*`.',
    '',
    '## Discover what telemetry exists',
    '',
    'Logs are one kind of telemetry. Metrics and traces are separate data streams, and on a cluster',
    'that reaches its data through remotes they are often on different remotes from the logs. Do not',
    'assume that the one remote you were pointed at holds everything, and do not say that data does',
    'not exist until you have looked for it as below.',
    '',
    '1. List the remotes with `GET /_remote/info` (the keys are the remote names). If it fails with a',
    '   security error, the key has no cluster privileges: go to step 3.',
    '2. Read the names. They usually combine a kind of data with a place, such as',
    '   `<kind>-<cloud>-<region>`. For the region the question is about, note which kinds of remote',
    '   exist (logs, metrics, traces, or others). A rule above that limits you to one remote applies to',
    '   the kind of data it names; it does not hide the other kinds.',
    '3. List what a remote holds with `GET /_resolve/index/<remote>:*`, narrowed by a keyword when the',
    '   answer is long (`<remote>:*kubernetes*`, `<remote>:*cpu*`). Group the data stream names by',
    '   prefix: `logs-*`, `metrics-*`, `traces-*`, `service-*`. Without `_remote/info`, probe likely',
    '   names directly: build `<kind>-<cloud>-<region>` for each kind you have seen and resolve it. A',
    '   `no_such_remote_cluster_exception` means that name does not exist, not that the data is',
    '   missing: try the next naming variant.',
    '4. Check the fields of a stream with `_field_caps?fields=<field>&include_unmapped=true` before',
    '   you query it.',
    '',
    'Reach for the kind of data that can answer the question. Logs hold messages, errors and events a',
    'service chose to write. Metrics hold resource use, saturation, restarts and container or node',
    'state, including causes that leave no log line, such as a process killed from outside. Traces',
    'hold request paths and latency across services. Say in your answer which kinds you checked and',
    'which you could not reach.',
    '',
    '## Query guidance',
    '',
    '- Use the readable patterns above in place of `logs-*` in the example below.',
    '- Name each remote explicitly as `remote:index`; never use wildcard remote names in',
    '  `_resolve/cluster`, `_cat/indices` or searches. Use `GET /_remote/info` when remote names',
    '  are not supplied above, or to find the other kinds of telemetry for a region (see above). To',
    '  check many remotes, query them in parallel with a short',
    '  per-request timeout, as in the last example below: a sequential loop over dozens of remotes',
    '  exceeds the sandbox command timeout and returns nothing.',
    '- Query a specific data stream, not a broad `logs-*`: on large clusters a broad pattern scans',
    '  every data stream and times out. Find candidates with',
    '  `GET /_resolve/index/<remote>:logs-*<keyword>*`, then query the one you need.',
    '- Add `?format=txt` to `_query` for a compact text table instead of JSON. Build the body with',
    "  `jq -n --arg q '<ES|QL>' '{query: $q}' | curl … -d @-` so the query needs no JSON escaping,",
    '  and put regexes (`GROK`, `RLIKE`) in triple-quoted `"""…"""` strings so backslashes stay',
    '  literal.',
    '- Bound every telemetry query with a `@timestamp` range and every curl with `--max-time 120`.',
    '  If a query times out, filter on a structured field (`data_stream.dataset`, `host.name`) before',
    '  any text match, or split the window into hours or days.',
    '- Never hide a failure: no `2>/dev/null`, `|| true`, or piping a response straight into `jq`.',
    '  A failed request then looks like no data. Check for `.error` first.',
    '- The sandbox has `jq` and `python3`; there is no `python`.',
    '- Common ES|QL mistakes: `LIKE` wildcards are `*`, not `%`; string comparisons are',
    '  case-sensitive; use `MATCH_PHRASE(message, "…")` for text; count conditionally with',
    '  `COUNT(*) WHERE …`; `first` and `last` are reserved; convert fields with conflicting types with',
    '  `TO_STRING`; `KEEP` only the columns you need when fetching rows.',
    '- More ES|QL traps: numeric-looking fields such as `http.response.status_code` may be `keyword`',
    '  (compare with `TO_INTEGER(…)`); integer division truncates, so write `100.0 * a / b`; `==` and',
    '  `!=` never match null, so count nulls with `IS NULL`; quote field names containing `/` or `-`',
    '  in backticks; without `LIMIT`, results stop at 1000 rows.',
    '- Before querying a field, check which streams map it with',
    '  `_field_caps?fields=<field>&include_unmapped=true`: the response then lists the indices for',
    '  each type, including `unmapped`. `Unknown column [x]` means no index in the `FROM` pattern',
    '  maps `x`: pick another stream instead of retrying. Prefer `_count` or ES|QL `STATS` for',
    '  totals and a small `LIMIT` for raw documents.',
    '',
    '```bash',
    `# ${parameterName} must be set on every one of these commands`,
    `curl --fail-with-body -sS --max-time 120 -H "Authorization: ${authHeader}" \\`,
    `  "${url}/_remote/info"`,
    '',
    `curl --fail-with-body -sS --max-time 120 -H "Authorization: ${authHeader}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  "${url}/_query?format=txt" \\`,
    '  -d \'{"query":"FROM logs-* | WHERE @timestamp >= \\"2026-01-01T00:00:00Z\\" AND @timestamp < \\"2026-01-01T01:00:00Z\\" | STATS count = COUNT(*) BY service.name | SORT count DESC | LIMIT 20"}\'',
    '',
    '# Find the data streams that match a keyword on one remote',
    `curl --fail-with-body -sS --max-time 120 -H "Authorization: ${authHeader}" \\`,
    `  "${url}/_resolve/index/<remote>:logs-*nginx*"`,
    '',
    '# Count one data stream on every remote whose name starts with logging-, 8 at a time, each line',
    '# prefixed with its remote; failed requests print their error',
    'q() {',
    `  curl --fail-with-body -sS --max-time 30 -H "Authorization: ${authHeader}" \\`,
    `    -H "Content-Type: application/json" "${url}/_query?format=txt" \\`,
    '    -d "{\\"query\\":\\"FROM $1:logs-nginx.error-* | WHERE @timestamp >= \\\\\\"2026-01-01T00:00:00Z\\\\\\" AND @timestamp < \\\\\\"2026-01-01T06:00:00Z\\\\\\" | STATS count = COUNT(*)\\"}" \\',
    '    2>&1 | sed "s/^/$1\\t/"',
    '}',
    'export -f q',
    `curl --fail-with-body -sS --max-time 120 -H "Authorization: ${authHeader}" \\`,
    `  "${url}/_remote/info" | jq -r 'keys[] | select(startswith("logging-"))' \\`,
    '  | xargs -P 8 -n 1 bash -c \'q "$0"\'',
    '```',
    '',
  ].join('\n');
};

export const writeElasticManifest = async ({
  session,
  credentials,
  readableIndices,
  logger,
}: {
  session: SandboxSession;
  credentials: ElasticCredentials;
  readableIndices?: string;
  logger: Logger;
}): Promise<void> => {
  logger.debug(`Writing Elasticsearch manifest`);

  const [result] = await session.writeFiles([
    {
      path: '/workspace/elastic.md',
      content: Buffer.from(renderElasticManifest(credentials, { readableIndices }), 'utf8'),
    },
  ]);
  if (!result?.success) throw new Error('Failed to write sandbox telemetry guidance');
};
