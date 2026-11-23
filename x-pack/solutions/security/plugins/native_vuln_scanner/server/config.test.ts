/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('configSchema feedMirrorUrl', () => {
  it('is unset by default', () => {
    expect(configSchema.validate({}).feedMirrorUrl).toBeUndefined();
  });

  it.each(['https://mirror.corp.example/feeds', 'http://10.0.0.5:8080/'])('accepts %s', (url) => {
    expect(configSchema.validate({ feedMirrorUrl: url }).feedMirrorUrl).toBe(url);
  });

  it.each([
    'ftp://mirror.corp.example/feeds',
    'mirror.corp.example/feeds',
    'https://user:pw@mirror.corp.example/',
    'https://mirror.corp.example/?token=1',
  ])('rejects %s', (url) => {
    expect(() => configSchema.validate({ feedMirrorUrl: url })).toThrow();
  });
});
