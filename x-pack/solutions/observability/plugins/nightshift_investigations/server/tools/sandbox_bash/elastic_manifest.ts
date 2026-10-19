/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { SANDBOX_BASH_TOOL_ID } from './tool';

/** How to query cluster telemetry from the sandbox. Names env vars; never embeds secrets. */
export const renderElasticManifest = (
  connectorId: string,
  { readableIndices }: { readableIndices?: string } = {}
): string =>
  [
    '# Elasticsearch telemetry',
    '',
    `Query this cluster by passing \`connector_id: "${connectorId}"\` to \`${SANDBOX_BASH_TOOL_ID}\`.`,
    'Credentials are not stored here: for that single command only, the environment contains',
    '',
    '- `CONNECTOR_CONFIG_URL` — Elasticsearch URL',
    '- `CONNECTOR_SECRET_PASSWORD` — Elasticsearch API key, used as `Authorization: ApiKey <key>`',
    '',
    'Reference those variables directly and never hard-code their values. A command that omits',
    '`connector_id` gets no credentials and cannot reach Elasticsearch.',
    '',
    readableIndices?.trim() || 'Readable indices: `logs-*`, `metrics-*`, `traces-*`.',
    '',
    '## Query guidance',
    '',
    '- Use the readable patterns above in place of `logs-*` in the example below.',
    '- Name each remote explicitly as `remote:index`; never use wildcard remote names in',
    '  `_resolve/cluster`, `_cat/indices` or searches. Use `GET /_remote/info` only if remote names',
    '  are not supplied above. To check many remotes, query them in parallel with a short',
    '  per-request timeout, as in the last example below: a sequential loop over dozens of remotes',
    '  exceeds the sandbox command timeout and returns nothing.',
    '- Add `?format=txt` to `_query` for a compact text table instead of JSON.',
    '- Bound every telemetry query with a `@timestamp` range and every curl with `--max-time 120`.',
    '  If a query times out, filter on a structured field (`data_stream.dataset`, `host.name`) before',
    '  any text match, or split the window into hours or days.',
    '- Never hide a failure: no `2>/dev/null`, `|| true`, or piping a response straight into `jq`.',
    '  A failed request then looks like no data. Check for `.error` first.',
    '- Common ES|QL mistakes: `LIKE` wildcards are `*`, not `%`; string comparisons are',
    '  case-sensitive; use `MATCH_PHRASE(message, "…")` for text; count conditionally with',
    '  `COUNT(*) WHERE …`; `first` and `last` are reserved; convert fields with conflicting types with',
    '  `TO_STRING`; `KEEP` only the columns you need when fetching rows.',
    '- Discover fields with `_field_caps` on a narrow index pattern. Prefer `_count` or ES|QL',
    '  `STATS` for totals and a small `LIMIT` for raw documents.',
    '',
    '```bash',
    '# connector_id must be set on every one of these commands',
    'curl --fail-with-body -sS --max-time 120 -H "Authorization: ApiKey $CONNECTOR_SECRET_PASSWORD" \\',
    '  "$CONNECTOR_CONFIG_URL/_remote/info"',
    '',
    'curl --fail-with-body -sS --max-time 120 -H "Authorization: ApiKey $CONNECTOR_SECRET_PASSWORD" \\',
    '  -H "Content-Type: application/json" \\',
    '  "$CONNECTOR_CONFIG_URL/_query?format=txt" \\',
    '  -d \'{"query":"FROM logs-* | WHERE @timestamp >= \\"2026-01-01T00:00:00Z\\" AND @timestamp < \\"2026-01-01T01:00:00Z\\" | STATS count = COUNT(*) BY service.name | SORT count DESC | LIMIT 20"}\'',
    '',
    '# Same query on every remote whose name starts with logging-, 8 at a time, each line prefixed',
    '# with its remote; failed requests print their error',
    'q() {',
    '  curl --fail-with-body -sS --max-time 30 -H "Authorization: ApiKey $CONNECTOR_SECRET_PASSWORD" \\',
    '    -H "Content-Type: application/json" "$CONNECTOR_CONFIG_URL/_query?format=txt" \\',
    '    -d "{\\"query\\":\\"FROM $1:logs-* | WHERE @timestamp >= \\\\\\"2026-01-01T00:00:00Z\\\\\\" AND @timestamp < \\\\\\"2026-01-01T06:00:00Z\\\\\\" | STATS count = COUNT(*)\\"}" \\',
    '    2>&1 | sed "s/^/$1\\t/"',
    '}',
    'export -f q',
    'curl --fail-with-body -sS --max-time 120 -H "Authorization: ApiKey $CONNECTOR_SECRET_PASSWORD" \\',
    '  "$CONNECTOR_CONFIG_URL/_remote/info" | jq -r \'keys[] | select(startswith("logging-"))\' \\',
    '  | xargs -P 8 -n 1 bash -c \'q "$0"\'',
    '```',
    '',
  ].join('\n');

export const writeElasticManifest = async ({
  session,
  connectorId,
  readableIndices,
  logger,
}: {
  session: SandboxSession;
  connectorId: string;
  readableIndices?: string;
  logger: Logger;
}): Promise<void> => {
  logger.debug(`Writing Elasticsearch manifest`);

  const [result] = await session.writeFiles([
    {
      path: '/workspace/elastic.md',
      content: Buffer.from(renderElasticManifest(connectorId, { readableIndices }), 'utf8'),
    },
  ]);
  if (!result?.success) throw new Error('Failed to write sandbox telemetry guidance');
};
