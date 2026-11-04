/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { SANDBOX_BASH_TOOL_ID } from './tool';
import { CONNECTOR_MANIFEST_PATH, ELASTIC_MANIFEST_PATH } from './connector_docs';

/** The deployment's configured telemetry connector, which the agent is allowed to use. */
export interface ElasticCredentials {
  kind: 'connector';
  connectorId: string;
}

const DEFAULT_READABLE_INDICES = 'Readable indices: `logs-*`, `metrics-*`, `traces-*`.';

const describeTelemetry = (
  credentials: ElasticCredentials | undefined,
  readableIndices: string | undefined
): string[] =>
  credentials
    ? [
        '## Investigation telemetry',
        '',
        `This deployment's telemetry cluster is \`connector_id: "${credentials.connectorId}"\`. Use it`,
        'for incident telemetry unless the question names another cluster.',
        '',
        readableIndices?.trim() || DEFAULT_READABLE_INDICES,
        '',
      ]
    : [
        'Telemetry usually lives in `logs-*`, `metrics-*` and `traces-*`, locally or on remote',
        'clusters. Check what a cluster holds before querying it, as shown below.',
        '',
      ];

/**
 * How to query Elasticsearch from the sandbox through any Elasticsearch connector, plus the
 * configured telemetry connector when there is one. Names env vars; never embeds secrets.
 */
export const renderElasticManifest = (
  credentials?: ElasticCredentials,
  { readableIndices }: { readableIndices?: string } = {}
): string => {
  const urlVar = 'CONNECTOR_CONFIG_URL';
  const authVar = 'CONNECTOR_HEADER_AUTHORIZATION';
  const authHeader = `$${authVar}`;
  const parameterName = 'connector_id';
  const url = `$${urlVar}`;
  return [
    '# Elasticsearch telemetry',
    '',
    `Query Elasticsearch by passing an Elasticsearch connector's \`${parameterName}\` to`,
    `\`${SANDBOX_BASH_TOOL_ID}\`. Take it from \`${CONNECTOR_MANIFEST_PATH}\`: an External`,
    'Elasticsearch (`.elasticsearch`) connector, or an HTTP (`.http`) connector whose URL is an',
    'Elasticsearch cluster. If several fit, pick the one for the cluster the question is about. If',
    'none is listed, Elasticsearch is not reachable: say so instead of guessing credentials.',
    '',
    'Credentials are not stored here: for that single command only, the environment contains',
    '',
    `- \`${urlVar}\` — Elasticsearch URL`,
    `- \`${authVar}\` — full Authorization header value (\`ApiKey <key>\`)`,
    '',
    'Reference those variables directly and never hard-code their values. A command that omits',
    `\`${parameterName}\` gets no credentials and cannot reach Elasticsearch.`,
    '',
    ...describeTelemetry(credentials, readableIndices),
    '## Query guidance',
    '',
    '- Use the readable patterns above in place of `logs-*` in the example below.',
    '- Name each remote explicitly as `remote:index`; never use wildcard remote names in',
    '  `_resolve/cluster`, `_cat/indices` or searches. Use `GET /_remote/info` only if remote names',
    '  are not supplied above. To check many remotes, query them in parallel with a short',
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
  credentials?: ElasticCredentials;
  readableIndices?: string;
  logger: Logger;
}): Promise<void> => {
  logger.debug(`Writing Elasticsearch manifest`);

  const [result] = await session.writeFiles([
    {
      path: ELASTIC_MANIFEST_PATH,
      content: Buffer.from(renderElasticManifest(credentials, { readableIndices }), 'utf8'),
    },
  ]);
  if (!result?.success) throw new Error('Failed to write sandbox telemetry guidance');
};
