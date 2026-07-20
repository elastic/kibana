/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSPECT_SECRET_REDACTED_VALUE, redactInspectedSecrets } from './redact_inspected_secrets';

describe('redactInspectedSecrets', () => {
  it('redacts credential secrets in a public config stream', () => {
    const publicConfigs = [
      {
        monitors: [
          {
            streams: [
              {
                type: 'http',
                urls: 'https://example.com',
                username: 'test-username',
                password: 'super-secret',
                'check.request.body': 'body',
                'check.request.headers': { authorization: 'Bearer token' },
                'ssl.key': '-----BEGIN KEY-----',
                'ssl.key_passphrase': 'phrase',
                'check.response.status': ['200'],
              },
            ],
          },
        ],
      },
    ];

    const [{ monitors }] = redactInspectedSecrets(publicConfigs);
    const stream = monitors[0].streams[0];

    expect(stream.username).toBe(INSPECT_SECRET_REDACTED_VALUE);
    expect(stream.password).toBe(INSPECT_SECRET_REDACTED_VALUE);
    expect(stream['check.request.body']).toBe(INSPECT_SECRET_REDACTED_VALUE);
    expect(stream['check.request.headers']).toBe(INSPECT_SECRET_REDACTED_VALUE);
    expect(stream['ssl.key']).toBe(INSPECT_SECRET_REDACTED_VALUE);
    expect(stream['ssl.key_passphrase']).toBe(INSPECT_SECRET_REDACTED_VALUE);
    // non-secret fields are untouched
    expect(stream.urls).toBe('https://example.com');
    expect(stream['check.response.status']).toEqual(['200']);
  });

  it('redacts secrets in the private compiled_stream and vars', () => {
    const privateConfig = {
      inputs: [
        {
          enabled: true,
          vars: {
            password: { value: '"secret"', type: 'password' },
            username: { value: 'user', type: 'text' },
          },
          streams: [
            {
              compiled_stream: {
                type: 'http',
                password: 'secret',
                username: 'user',
              },
            },
          ],
        },
      ],
    };

    const result = redactInspectedSecrets(privateConfig);
    const input = result.inputs[0];

    // Fleet `vars` entries keep their `{ value, type }` shape; only the value is redacted.
    expect(input.vars.password).toEqual({ value: INSPECT_SECRET_REDACTED_VALUE, type: 'password' });
    expect(input.vars.username).toEqual({ value: INSPECT_SECRET_REDACTED_VALUE, type: 'text' });
    expect(input.streams[0].compiled_stream.password).toBe(INSPECT_SECRET_REDACTED_VALUE);
    expect(input.streams[0].compiled_stream.username).toBe(INSPECT_SECRET_REDACTED_VALUE);
  });

  it('does not redact source/script fields shown in the inspect output', () => {
    const publicConfigs = [
      {
        monitors: [
          {
            streams: [
              {
                'source.project.content': 'base64-zip',
                'source.inline.script': 'journey(...)',
              },
            ],
          },
        ],
      },
    ];

    const [{ monitors }] = redactInspectedSecrets(publicConfigs);
    const stream = monitors[0].streams[0];

    expect(stream['source.project.content']).toBe('base64-zip');
    expect(stream['source.inline.script']).toBe('journey(...)');
  });

  it('does not recurse into params (masked separately by hideParams)', () => {
    const publicConfigs = [
      {
        monitors: [
          {
            streams: [
              {
                type: 'browser',
                params: {
                  username: '"********"',
                  password: '"********"',
                  someUrl: '"https://example.com"',
                },
              },
            ],
          },
        ],
      },
    ];

    const [{ monitors }] = redactInspectedSecrets(publicConfigs);
    const { params } = monitors[0].streams[0];

    expect(params).toEqual({
      username: '"********"',
      password: '"********"',
      someUrl: '"https://example.com"',
    });
  });

  it('handles null and primitive values', () => {
    expect(redactInspectedSecrets(null)).toBeNull();
    expect(redactInspectedSecrets(undefined)).toBeUndefined();
    expect(redactInspectedSecrets('value')).toBe('value');
  });
});
