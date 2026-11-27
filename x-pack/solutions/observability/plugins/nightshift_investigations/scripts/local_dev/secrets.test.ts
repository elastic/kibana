/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLocalDevSecret, createRedactor, parseLocalDevSecret } from './secrets';

describe('local dev secrets', () => {
  it('reads back the secret the rotate script writes', () => {
    const secret = buildLocalDevSecret({ username: 'kibana-local-dev', password: 'pw-1234' });

    expect(parseLocalDevSecret(secret, 'path')).toEqual({
      host: 'eval-sandbox-api.elastic-observability-ocp.elastic.dev',
      port: 9090,
      apiKey: 'kibana-local-dev:pw-1234',
    });
  });

  it('redacts a key, its password half and its base64 form', () => {
    const redactor = createRedactor();
    redactor.add('kibana-local-dev:pw-1234');
    const encoded = Buffer.from('kibana-local-dev:pw-1234').toString('base64');

    expect(redactor.redact(`bad key pw-1234 / kibana-local-dev:pw-1234 / ${encoded}`)).toBe(
      'bad key <redacted> / <redacted> / <redacted>'
    );
  });
});
