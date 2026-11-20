/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExampleEvents } from './events_request_example';
import type { ExampleEventDocument } from './events_request_example';

export const EVENTS_CODE_LANGUAGES = ['curl', 'javascript', 'python'] as const;

export type EventsCodeLanguage = (typeof EVENTS_CODE_LANGUAGES)[number];

/** Stands in for the API key in code that is shown while the key is hidden or missing. */
export { API_KEY_PLACEHOLDER } from './query_snippets';

export interface EventsCodeExampleParams {
  indexName: string;
  elasticsearchUrl: string;
  apiKey: string;
  isServerless: boolean;
  /** The example events are dated within the minutes before this time. */
  now: number;
}

interface SnippetParams extends Omit<EventsCodeExampleParams, 'now'> {
  events: readonly ExampleEventDocument[];
}

// An index name may hold quotes, `$` and backticks, so it is never pasted into code as it is.
const quoteForShell = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

type EventValue = ExampleEventDocument[string];

const formatInline = (value: EventValue | number): string =>
  typeof value === 'object'
    ? `{ ${Object.entries(value)
        .map(([key, nested]) => `${JSON.stringify(key)}: ${formatInline(nested)}`)
        .join(', ')} }`
    : JSON.stringify(value);

/** The events as an array literal with one field of an event per line. */
const formatEvents = (events: readonly ExampleEventDocument[], indent: string): string =>
  [
    '[',
    events
      .map((event) =>
        [
          `${indent}{`,
          Object.entries(event)
            .map(
              ([key, value]) => `${indent}${indent}${JSON.stringify(key)}: ${formatInline(value)}`
            )
            .join(',\n'),
          `${indent}}`,
        ].join('\n')
      )
      .join(',\n'),
    ']',
  ].join('\n');

const buildCurlExample = ({ indexName, elasticsearchUrl, apiKey, events }: SnippetParams): string =>
  [
    `curl -X POST ${quoteForShell(
      `${elasticsearchUrl}/${encodeURIComponent(indexName)}/_bulk`
    )} \\`,
    `  --header ${quoteForShell(`Authorization: ApiKey ${apiKey}`)} \\`,
    `  --header 'Content-Type: application/x-ndjson' \\`,
    `  --data-binary ${quoteForShell(
      events.map((event) => `{ "index": {} }\n${JSON.stringify(event)}\n`).join('')
    )}`,
  ].join('\n');

const buildJavascriptExample = ({
  indexName,
  elasticsearchUrl,
  apiKey,
  isServerless,
  events,
}: SnippetParams): string => `// npm install @elastic/elasticsearch
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: ${JSON.stringify(elasticsearchUrl)},
  auth: { apiKey: ${JSON.stringify(apiKey)} },${isServerless ? `\n  serverMode: 'serverless',` : ''}
});

const events = ${formatEvents(events, '  ')};

const result = await client.helpers.bulk({
  datasource: events,
  onDocument: () => ({ index: { _index: ${JSON.stringify(indexName)} } }),
});

console.log(result);
`;

// The events and the strings are written as JSON, which Python reads as literals as long as the
// events hold no booleans or nulls.
const buildPythonExample = ({
  indexName,
  elasticsearchUrl,
  apiKey,
  events,
}: SnippetParams): string => `# pip install elasticsearch
from elasticsearch import Elasticsearch, helpers

client = Elasticsearch(
    ${JSON.stringify(elasticsearchUrl)},
    api_key=${JSON.stringify(apiKey)},
)

events = ${formatEvents(events, '    ')}

print(helpers.bulk(client, events, index=${JSON.stringify(indexName)}))
`;

const BUILDERS: Readonly<Record<EventsCodeLanguage, (params: SnippetParams) => string>> = {
  curl: buildCurlExample,
  javascript: buildJavascriptExample,
  python: buildPythonExample,
};

/** Code that writes the example events to the index, with the endpoint and key filled in. */
export const buildEventsCodeExample = (
  language: EventsCodeLanguage,
  { now, ...params }: EventsCodeExampleParams
): string => BUILDERS[language]({ ...params, events: buildExampleEvents(now) });
