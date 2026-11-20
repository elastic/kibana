/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import { runInNewContext } from 'vm';
import {
  API_KEY_PLACEHOLDER,
  buildQuerySnippets,
  getStarterQueryTimeField,
  toJavaScriptString,
  toJavaScriptTemplate,
  toPythonMultilineString,
  toPythonString,
  toShellString,
} from './query_snippets';
import type { SnippetLanguage } from './query_snippets';

const AWKWARD_QUERY = [
  'FROM "app-events"',
  `| WHERE user.name == "O'Brien" AND path LIKE "C:\\\\temp\\\\*"`,
  '| EVAL label = CONCAT("`", status, "` ${not_a_variable} $HOME $(id) !!"), tail = "ends with \\\\"',
  '| STATS events = COUNT(*) BY label',
].join('\n');

const AWKWARD_VALUES = [
  AWKWARD_QUERY,
  `'`,
  `''`,
  `"""`,
  '\\',
  'ends with a backslash \\',
  'ends with a quote "',
  'carriage\r\nreturn',
  'line\u2028separator',
  '`${x}` \\${y} \\n',
];

const AWKWARD_FIELD = `it's "when" \\ \`\${x}\``;
const LAST_7_DAYS = { gte: 'now-7d', lte: 'now' };

const getCurlBody = (code: string): unknown =>
  JSON.parse(evaluateShell(code.slice(code.indexOf('--data-raw ') + '--data-raw '.length)));

const getJavaScriptRequest = (code: string): unknown => {
  const request = code.slice(code.indexOf('client.esql.query(') + 'client.esql.query('.length);
  return evaluateJavaScript(request.slice(0, request.indexOf('\n});') + '\n}'.length));
};

const evaluateJavaScript = (literal: string): unknown => runInNewContext(`(${literal})`);

/** What a POSIX shell passes to a program for the word. */
const evaluateShell = (word: string): string =>
  execFileSync('sh', ['-c', `printf '%s' ${word}`], { encoding: 'utf8' });

const getSnippet = (
  language: SnippetLanguage,
  esql: string,
  connection: Parameters<typeof buildQuerySnippets>[1] = {
    elasticsearchUrl: 'https://my-project.es.example.com:443',
  },
  timeField?: string
): string => {
  const snippet = buildQuerySnippets(esql, connection, timeField).find(
    (candidate) => candidate.language === language
  );
  if (snippet === undefined) {
    throw new Error(`No ${language} snippet`);
  }
  return snippet.code;
};

describe('string literals', () => {
  it.each(AWKWARD_VALUES)('keeps %j intact as a shell word', (value) => {
    expect(evaluateShell(toShellString(value))).toBe(value);
  });

  it.each(AWKWARD_VALUES)('keeps %j intact as a JavaScript string', (value) => {
    expect(evaluateJavaScript(toJavaScriptString(value))).toBe(value);
    expect(toJavaScriptString(value)).not.toMatch(/[\n\r]/);
  });

  it.each(AWKWARD_VALUES)('keeps %j intact as a JavaScript template literal', (value) => {
    expect(evaluateJavaScript(toJavaScriptTemplate(value))).toBe(value);
  });

  it('writes Python strings with every backslash, double quote and line break escaped', () => {
    expect(toPythonString('a "b" \\ c\nd\re')).toBe('"a \\"b\\" \\\\ c\\nd\\re"');
    expect(toPythonString(`it's`)).toBe(`"it's"`);
  });

  it('writes Python multi-line strings that cannot end early or swallow a line break', () => {
    expect(toPythonMultilineString('a """ b\nc \\\nd "')).toBe('"""a \\"\\"" b\nc \\\\\nd \\""""');
    expect(toPythonMultilineString('status == "paid" OR note == ""')).toBe(
      '"""status == "paid" OR note == \\"\\""""'
    );
    expect(toPythonMultilineString('x\r\ny')).toBe('"""x\\r\ny"""');
  });
});

describe('buildQuerySnippets', () => {
  it('offers curl, JavaScript and Python in that order', () => {
    expect(
      buildQuerySnippets('FROM events', { elasticsearchUrl: 'https://es' }).map(
        ({ language, codeBlockLanguage }) => [language, codeBlockLanguage]
      )
    ).toEqual([
      ['curl', 'bash'],
      ['javascript', 'javascript'],
      ['python', 'python'],
    ]);
  });

  it('writes the curl request against the query API with a placeholder key', () => {
    expect(getSnippet('curl', 'FROM events\n| STATS events = COUNT(*)')).toBe(
      [
        `curl -X POST 'https://my-project.es.example.com:443/_query' \\`,
        `  --header 'Authorization: ApiKey ${API_KEY_PLACEHOLDER}' \\`,
        `  --header 'Content-Type: application/json' \\`,
        `  --data-raw '{`,
        `  "query": "FROM events\\n| STATS events = COUNT(*)"`,
        `}'`,
      ].join('\n')
    );
  });

  it('does not double the slash of an endpoint that ends with one', () => {
    expect(getSnippet('curl', 'FROM events', { elasticsearchUrl: 'https://es:9200/' })).toContain(
      `'https://es:9200/_query'`
    );
  });

  it('sends an awkward query unchanged through the shell', () => {
    expect(getCurlBody(getSnippet('curl', AWKWARD_QUERY))).toEqual({ query: AWKWARD_QUERY });
  });

  it('writes the JavaScript client call', () => {
    expect(getSnippet('javascript', 'FROM events\n| LIMIT 10')).toBe(
      [
        `import { Client } from '@elastic/elasticsearch';`,
        '',
        'const client = new Client({',
        `  node: 'https://my-project.es.example.com:443',`,
        `  auth: { apiKey: '${API_KEY_PLACEHOLDER}' },`,
        '});',
        '',
        'const { columns, values } = await client.esql.query({',
        '  query: `FROM events',
        '| LIMIT 10`,',
        '});',
        '',
        'console.log(columns, values);',
      ].join('\n')
    );
  });

  it('sets the serverless mode of the JavaScript client on serverless only', () => {
    const connection = { elasticsearchUrl: 'https://es' };

    expect(
      getSnippet('javascript', 'FROM events', { ...connection, isServerless: true })
    ).toContain(`  auth: { apiKey: '${API_KEY_PLACEHOLDER}' },\n  serverMode: 'serverless',\n});`);
    expect(getSnippet('javascript', 'FROM events', connection)).not.toContain('serverMode');
  });

  it('passes an awkward query unchanged to the JavaScript client', () => {
    expect(getJavaScriptRequest(getSnippet('javascript', AWKWARD_QUERY))).toEqual({
      query: AWKWARD_QUERY,
    });
  });

  it('writes the Python client call', () => {
    expect(getSnippet('python', 'FROM events\n| WHERE status == "paid"')).toBe(
      [
        'from elasticsearch import Elasticsearch',
        '',
        'client = Elasticsearch(',
        '    "https://my-project.es.example.com:443",',
        `    api_key="${API_KEY_PLACEHOLDER}",`,
        ')',
        '',
        'response = client.esql.query(',
        '    query="""FROM events',
        '| WHERE status == "paid\\"""",',
        ')',
        '',
        'print(response["columns"], response["values"])',
      ].join('\n')
    );
  });

  it('puts the API key in every snippet once there is one', () => {
    for (const { code } of buildQuerySnippets('FROM events', {
      elasticsearchUrl: 'https://es',
      apiKey: 'ZW5jb2RlZA==',
    })) {
      expect(code).toContain('ZW5jb2RlZA==');
      expect(code).not.toContain(API_KEY_PLACEHOLDER);
    }
  });

  describe('with a time field', () => {
    const QUERY = 'FROM events\n| STATS events = COUNT(*)';

    it('limits the curl request to the last 7 days without touching the query', () => {
      expect(getSnippet('curl', QUERY, undefined, '@timestamp')).toBe(
        [
          `curl -X POST 'https://my-project.es.example.com:443/_query' \\`,
          `  --header 'Authorization: ApiKey ${API_KEY_PLACEHOLDER}' \\`,
          `  --header 'Content-Type: application/json' \\`,
          `  --data-raw '{`,
          `  "query": "FROM events\\n| STATS events = COUNT(*)",`,
          `  "filter": {`,
          `    "range": {`,
          `      "@timestamp": {`,
          `        "gte": "now-7d",`,
          `        "lte": "now"`,
          `      }`,
          `    }`,
          `  }`,
          `}'`,
        ].join('\n')
      );
    });

    it('passes the same filter to the JavaScript client', () => {
      const code = getSnippet('javascript', QUERY, undefined, '@timestamp');

      expect(code).toContain(
        [
          'const { columns, values } = await client.esql.query({',
          '  query: `FROM events',
          '| STATS events = COUNT(*)`,',
          `  filter: { range: { '@timestamp': { gte: 'now-7d', lte: 'now' } } },`,
          '});',
        ].join('\n')
      );
      expect(getJavaScriptRequest(code)).toEqual({
        query: QUERY,
        filter: { range: { '@timestamp': LAST_7_DAYS } },
      });
    });

    it('passes the same filter to the Python client', () => {
      expect(getSnippet('python', QUERY, undefined, '@timestamp')).toContain(
        [
          'response = client.esql.query(',
          '    query="""FROM events',
          '| STATS events = COUNT(*)""",',
          '    filter={"range": {"@timestamp": {"gte": "now-7d", "lte": "now"}}},',
          ')',
        ].join('\n')
      );
    });

    it('keeps an awkward query and field name intact in curl and JavaScript', () => {
      const expected = {
        query: AWKWARD_QUERY,
        filter: { range: { [AWKWARD_FIELD]: LAST_7_DAYS } },
      };

      expect(getCurlBody(getSnippet('curl', AWKWARD_QUERY, undefined, AWKWARD_FIELD))).toEqual(
        expected
      );
      expect(
        getJavaScriptRequest(getSnippet('javascript', AWKWARD_QUERY, undefined, AWKWARD_FIELD))
      ).toEqual(expected);
    });

    it('escapes an awkward field name for Python', () => {
      expect(getSnippet('python', QUERY, undefined, 'a "b" \\ c')).toContain(
        '    filter={"range": {"a \\"b\\" \\\\ c": {"gte": "now-7d", "lte": "now"}}},'
      );
    });
  });

  describe('without a time field', () => {
    it.each<SnippetLanguage>(['curl', 'javascript', 'python'])(
      'sends the bare query from %s',
      (language) => {
        const code = getSnippet(language, 'FROM events');

        expect(code).not.toContain('filter');
        expect(code).not.toContain('now-7d');
      }
    );
  });
});

describe('getStarterQueryTimeField', () => {
  it('is the field Discover applies its time range to', () => {
    expect(getStarterQueryTimeField({ timeField: '@timestamp' })).toBe('@timestamp');
  });

  it.each([null, 'timestamp', 'order_date'])(
    'is undefined for %p, which Discover does not filter on',
    (timeField) => {
      expect(getStarterQueryTimeField({ timeField })).toBeUndefined();
    }
  );
});
