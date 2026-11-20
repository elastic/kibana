/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_ESQL_TIME_FIELD, STARTER_QUERY_TIME_RANGE } from './constants';
import type { AnalyticsEventSource } from './types';

export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';

export type SnippetLanguage = 'curl' | 'javascript' | 'python';

export interface CodeSnippet {
  language: SnippetLanguage;
  /** The language `EuiCodeBlock` highlights the code as. */
  codeBlockLanguage: string;
  code: string;
}

export interface SnippetConnection {
  elasticsearchUrl: string;
  /** The encoded API key; a placeholder is shown without one. */
  apiKey?: string;
  isServerless?: boolean;
}

/** A single-quoted shell word: nothing in it is expanded, and a quote ends and reopens it. */
export const toShellString = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/** A single-quoted JavaScript string on one line. */
export const toJavaScriptString = (value: string): string =>
  `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, `\\'`)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`;

/** A JavaScript template literal, which keeps the line breaks of the text readable. */
export const toJavaScriptTemplate = (value: string): string =>
  `\`${value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/\r/g, '\\r')}\``;

/** A double-quoted Python string on one line. */
export const toPythonString = (value: string): string =>
  `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')}"`;

/**
 * A triple-quoted Python string, which keeps the line breaks of the text readable. A double quote
 * is escaped only where it would otherwise help to close the string: before another one, and last.
 */
export const toPythonMultilineString = (value: string): string =>
  `"""${value
    .replace(/\\/g, '\\\\')
    .replace(/"(?="|$)/g, '\\"')
    .replace(/\r/g, '\\r')}"""`;

/**
 * The field a starter query's request has to filter on to return what Discover shows: Discover
 * applies its time range to `@timestamp` and to no other field.
 */
export const getStarterQueryTimeField = ({
  timeField,
}: Pick<AnalyticsEventSource, 'timeField'>): string | undefined =>
  timeField === DISCOVER_ESQL_TIME_FIELD ? timeField : undefined;

const { from: RANGE_START, to: RANGE_END } = STARTER_QUERY_TIME_RANGE;

const getQueryUrl = (elasticsearchUrl: string): string =>
  `${elasticsearchUrl.replace(/\/+$/, '')}/_query`;

const buildCurlSnippet = (
  esql: string,
  { elasticsearchUrl, apiKey = API_KEY_PLACEHOLDER }: SnippetConnection,
  timeField: string | undefined
): string =>
  [
    `curl -X POST ${toShellString(getQueryUrl(elasticsearchUrl))} \\`,
    `  --header ${toShellString(`Authorization: ApiKey ${apiKey}`)} \\`,
    `  --header 'Content-Type: application/json' \\`,
    `  --data-raw ${toShellString(
      JSON.stringify(
        {
          query: esql,
          ...(timeField !== undefined && {
            filter: { range: { [timeField]: { gte: RANGE_START, lte: RANGE_END } } },
          }),
        },
        null,
        2
      )
    )}`,
  ].join('\n');

const buildJavaScriptSnippet = (
  esql: string,
  { elasticsearchUrl, apiKey = API_KEY_PLACEHOLDER, isServerless = false }: SnippetConnection,
  timeField: string | undefined
): string =>
  [
    `import { Client } from '@elastic/elasticsearch';`,
    '',
    'const client = new Client({',
    `  node: ${toJavaScriptString(elasticsearchUrl)},`,
    `  auth: { apiKey: ${toJavaScriptString(apiKey)} },`,
    ...(isServerless ? [`  serverMode: 'serverless',`] : []),
    '});',
    '',
    'const { columns, values } = await client.esql.query({',
    `  query: ${toJavaScriptTemplate(esql)},`,
    ...(timeField === undefined
      ? []
      : [
          `  filter: { range: { ${toJavaScriptString(timeField)}: { gte: ${toJavaScriptString(
            RANGE_START
          )}, lte: ${toJavaScriptString(RANGE_END)} } } },`,
        ]),
    '});',
    '',
    'console.log(columns, values);',
  ].join('\n');

const buildPythonSnippet = (
  esql: string,
  { elasticsearchUrl, apiKey = API_KEY_PLACEHOLDER }: SnippetConnection,
  timeField: string | undefined
): string =>
  [
    'from elasticsearch import Elasticsearch',
    '',
    'client = Elasticsearch(',
    `    ${toPythonString(elasticsearchUrl)},`,
    `    api_key=${toPythonString(apiKey)},`,
    ')',
    '',
    'response = client.esql.query(',
    `    query=${toPythonMultilineString(esql)},`,
    ...(timeField === undefined
      ? []
      : [
          `    filter={"range": {${toPythonString(timeField)}: {"gte": ${toPythonString(
            RANGE_START
          )}, "lte": ${toPythonString(RANGE_END)}}}},`,
        ]),
    ')',
    '',
    'print(response["columns"], response["values"])',
  ].join('\n');

/**
 * The ES|QL query API request for a query, as it is written in each language. With a time field,
 * the request covers the time range a starter query is opened with in Discover.
 */
export const buildQuerySnippets = (
  esql: string,
  connection: SnippetConnection,
  timeField?: string
): readonly CodeSnippet[] => [
  {
    language: 'curl',
    codeBlockLanguage: 'bash',
    code: buildCurlSnippet(esql, connection, timeField),
  },
  {
    language: 'javascript',
    codeBlockLanguage: 'javascript',
    code: buildJavaScriptSnippet(esql, connection, timeField),
  },
  {
    language: 'python',
    codeBlockLanguage: 'python',
    code: buildPythonSnippet(esql, connection, timeField),
  },
];
