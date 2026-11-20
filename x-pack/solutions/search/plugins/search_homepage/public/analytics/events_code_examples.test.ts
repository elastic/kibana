/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_KEY_PLACEHOLDER,
  EVENTS_CODE_LANGUAGES,
  buildEventsCodeExample,
} from './events_code_examples';
import type { EventsCodeExampleParams } from './events_code_examples';
import { buildExampleEvents } from './events_request_example';

const NOW = Date.parse('2026-05-04T12:00:00.000Z');

const PARAMS: EventsCodeExampleParams = {
  indexName: 'app-events',
  elasticsearchUrl: 'https://my-project.es.example.com',
  apiKey: API_KEY_PLACEHOLDER,
  isServerless: false,
  now: NOW,
};

describe('buildEventsCodeExample', () => {
  it('offers curl, JavaScript and Python', () => {
    expect(EVENTS_CODE_LANGUAGES).toEqual(['curl', 'javascript', 'python']);
  });

  it.each(EVENTS_CODE_LANGUAGES)(
    'names the endpoint, the key and every event in %s',
    (language) => {
      const code = buildEventsCodeExample(language, PARAMS);

      expect(code).toContain('https://my-project.es.example.com');
      expect(code).toContain('YOUR_API_KEY');
      expect(code).toContain('app-events');
      for (const action of ['page_view', 'add_to_cart', 'purchase']) {
        expect(code).toContain(action);
      }
      expect(code).toContain('2026-05-04T11:48:00.000Z');
    }
  );

  it('sends the events as one bulk request with curl', () => {
    expect(buildEventsCodeExample('curl', PARAMS)).toBe(
      [
        `curl -X POST 'https://my-project.es.example.com/app-events/_bulk' \\`,
        `  --header 'Authorization: ApiKey YOUR_API_KEY' \\`,
        `  --header 'Content-Type: application/x-ndjson' \\`,
        `  --data-binary '{ "index": {} }`,
        `{"@timestamp":"2026-05-04T11:48:00.000Z","event":{"action":"page_view"},"user":{"id":"u-1001"},"url":{"path":"/"}}`,
        `{ "index": {} }`,
        `{"@timestamp":"2026-05-04T11:53:00.000Z","event":{"action":"add_to_cart"},"user":{"id":"u-1001"},"url":{"path":"/cart"}}`,
        `{ "index": {} }`,
        `{"@timestamp":"2026-05-04T11:58:00.000Z","event":{"action":"purchase"},"user":{"id":"u-1001"},"order":{"total":89.5}}`,
        `'`,
      ].join('\n')
    );
  });

  it('uses the JavaScript client, in serverless mode on serverless only', () => {
    const code = buildEventsCodeExample('javascript', PARAMS);

    expect(code).toContain('// npm install @elastic/elasticsearch');
    expect(code).toContain('node: "https://my-project.es.example.com"');
    expect(code).toContain('auth: { apiKey: "YOUR_API_KEY" }');
    expect(code).toContain('onDocument: () => ({ index: { _index: "app-events" } })');
    expect(code).toContain(
      [
        'const events = [',
        '  {',
        '    "@timestamp": "2026-05-04T11:48:00.000Z",',
        '    "event": { "action": "page_view" },',
        '    "user": { "id": "u-1001" },',
        '    "url": { "path": "/" }',
        '  },',
      ].join('\n')
    );
    expect(code).not.toContain('serverMode');
    expect(buildEventsCodeExample('javascript', { ...PARAMS, isServerless: true })).toContain(
      `auth: { apiKey: "YOUR_API_KEY" },\n  serverMode: 'serverless',\n});`
    );
  });

  it('uses the Python client', () => {
    const code = buildEventsCodeExample('python', PARAMS);

    expect(code).toContain('# pip install elasticsearch');
    expect(code).toContain('    "https://my-project.es.example.com",\n    api_key="YOUR_API_KEY",');
    expect(code).toContain('print(helpers.bulk(client, events, index="app-events"))');
    expect(code).toContain(
      [
        '    {',
        '        "@timestamp": "2026-05-04T11:58:00.000Z",',
        '        "event": { "action": "purchase" },',
        '        "user": { "id": "u-1001" },',
        '        "order": { "total": 89.5 }',
        '    }',
        ']',
      ].join('\n')
    );
  });

  it('writes events that are Python literals as well as JSON', () => {
    expect(JSON.stringify(buildExampleEvents(NOW))).not.toMatch(/\b(true|false|null)\b/);
  });

  it('writes the given API key', () => {
    for (const language of EVENTS_CODE_LANGUAGES) {
      expect(buildEventsCodeExample(language, { ...PARAMS, apiKey: 'c2VjcmV0' })).toContain(
        'c2VjcmV0'
      );
    }
  });

  it('quotes an index name that would end a string', () => {
    const params = { ...PARAMS, indexName: `it's-"$x` };

    expect(buildEventsCodeExample('curl', params)).toContain(
      `'https://my-project.es.example.com/it'\\''s-%22%24x/_bulk'`
    );
    expect(buildEventsCodeExample('javascript', params)).toContain(`_index: "it's-\\"$x"`);
    expect(buildEventsCodeExample('python', params)).toContain(`index="it's-\\"$x"`);
  });
});
