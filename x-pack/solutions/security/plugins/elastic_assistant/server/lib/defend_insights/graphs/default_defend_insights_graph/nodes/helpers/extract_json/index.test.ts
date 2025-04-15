/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractJson } from '.';

describe('extractJson', () => {
  it('returns an empty string if input is undefined', () => {
    const input = undefined;

    expect(extractJson(input)).toBe('');
  });

  it('returns an empty string if input an array', () => {
    const input = ['some', 'array'];

    expect(extractJson(input)).toBe('');
  });

  it('returns an empty string if input is an object', () => {
    const input = {};

    expect(extractJson(input)).toBe('');
  });

  it('returns the JSON text surrounded by ```json and ``` with no whitespace or additional text', () => {
    const input = '```json{"key": "value"}```';

    const expected = '{"key": "value"}';

    expect(extractJson(input)).toBe(expected);
  });

  it('returns the JSON block when surrounded by additional text and whitespace', () => {
    const input =
      'You asked for some JSON, here it is:\n```json\n{"key": "value"}\n```\nI hope that works for you.';

    const expected = '{"key": "value"}';

    expect(extractJson(input)).toBe(expected);
  });

  it('returns the original text if no JSON block is found', () => {
    const input = "There's no JSON here, just some text.";

    expect(extractJson(input)).toBe(input);
  });

  it('trims leading and trailing whitespace from the extracted JSON', () => {
    const input = 'Text before\n```json\n  {"key": "value"}  \n```\nText after';

    const expected = '{"key": "value"}';

    expect(extractJson(input)).toBe(expected);
  });

  it('handles incomplete JSON blocks with no trailing ```', () => {
    const input = 'Text before\n```json\n{"key": "value"'; // <-- no closing ```, because incomplete generation

    expect(extractJson(input)).toBe('{"key": "value"');
  });

  it('handles multiline defend insight json (real world edge case)', () => {
    const input =
      '```json\n{\n  "@timestamp": "2024-02-08T02:54:40.000Z",\n  "created_at": "2024-02-08T02:54:40.000Z",\n  "updated_at": "2024-02-08T02:54:40.000Z",\n  "last_viewed_at": "2024-02-08T02:54:40.000Z",\n  "status": "succeeded",\n  "events_context_count": 1,\n  "endpoint_ids": ["endpoint-1", "endpoint-2"],\n  "insight_type": "incompatible_antivirus",\n  "insights": [\n    {\n      "group": "Windows Defender",\n      "events": [\n        {\n          "id": "event-1",\n          "endpoint_id": "endpoint-1",\n          "value": "/path/to/executable"\n        }\n      ]\n    }\n  ],\n  "api_config": {\n    "connector_id": "connector-1",\n    "action_type_id": "action-1",\n    "provider": "openai",\n    "model": "gpt-4"\n  },\n  "replacements": [\n    {\n      "type": "text",\n      "value": "some-replacement"\n    }\n  ]\n}```';

    const expected =
      '{\n  "@timestamp": "2024-02-08T02:54:40.000Z",\n  "created_at": "2024-02-08T02:54:40.000Z",\n  "updated_at": "2024-02-08T02:54:40.000Z",\n  "last_viewed_at": "2024-02-08T02:54:40.000Z",\n  "status": "succeeded",\n  "events_context_count": 1,\n  "endpoint_ids": ["endpoint-1", "endpoint-2"],\n  "insight_type": "incompatible_antivirus",\n  "insights": [\n    {\n      "group": "Windows Defender",\n      "events": [\n        {\n          "id": "event-1",\n          "endpoint_id": "endpoint-1",\n          "value": "/path/to/executable"\n        }\n      ]\n    }\n  ],\n  "api_config": {\n    "connector_id": "connector-1",\n    "action_type_id": "action-1",\n    "provider": "openai",\n    "model": "gpt-4"\n  },\n  "replacements": [\n    {\n      "type": "text",\n      "value": "some-replacement"\n    }\n  ]\n}';

    expect(extractJson(input)).toBe(expected);
  });

  it('handles "Here is my analysis" with defend insight json (real world edge case)', () => {
    const input =
      'Here is my analysis in JSON format:\n\n```json\n{\n  "@timestamp": "2024-02-08T02:54:40.000Z",\n  "created_at": "2024-02-08T02:54:40.000Z",\n  "updated_at": "2024-02-08T02:54:40.000Z",\n  "last_viewed_at": "2024-02-08T02:54:40.000Z",\n  "status": "succeeded",\n  "events_context_count": 2,\n  "endpoint_ids": ["endpoint-3", "endpoint-4"],\n  "insight_type": "incompatible_antivirus",\n  "insights": [\n    {\n      "group": "McAfee",\n      "events": [\n        {\n          "id": "event-2",\n          "endpoint_id": "endpoint-3",\n          "value": "/usr/local/bin/mcafee"\n        },\n        {\n          "id": "event-3", \n          "endpoint_id": "endpoint-4",\n          "value": "/usr/local/bin/mcafee"\n        }\n      ]\n    }\n  ],\n  "api_config": {\n    "connector_id": "connector-2",\n    "action_type_id": "action-2",\n    "provider": "openai",\n    "model": "gpt-4"\n  },\n  "replacements": [\n    {\n      "type": "text",\n      "value": "another-replacement"\n    }\n  ]\n}```';

    const expected =
      '{\n  "@timestamp": "2024-02-08T02:54:40.000Z",\n  "created_at": "2024-02-08T02:54:40.000Z",\n  "updated_at": "2024-02-08T02:54:40.000Z",\n  "last_viewed_at": "2024-02-08T02:54:40.000Z",\n  "status": "succeeded",\n  "events_context_count": 2,\n  "endpoint_ids": ["endpoint-3", "endpoint-4"],\n  "insight_type": "incompatible_antivirus",\n  "insights": [\n    {\n      "group": "McAfee",\n      "events": [\n        {\n          "id": "event-2",\n          "endpoint_id": "endpoint-3",\n          "value": "/usr/local/bin/mcafee"\n        },\n        {\n          "id": "event-3", \n          "endpoint_id": "endpoint-4",\n          "value": "/usr/local/bin/mcafee"\n        }\n      ]\n    }\n  ],\n  "api_config": {\n    "connector_id": "connector-2",\n    "action_type_id": "action-2",\n    "provider": "openai",\n    "model": "gpt-4"\n  },\n  "replacements": [\n    {\n      "type": "text",\n      "value": "another-replacement"\n    }\n  ]\n}';

    expect(extractJson(input)).toBe(expected);
  });
});
