/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('Code Intelligence configuration', () => {
  it('is disabled, reads from the sandbox, and has no token by default', () => {
    expect(config.schema.validate({})).toEqual({
      enabled: false,
      catalogIndex: 'code-intelligence-catalog',
      settingsIndex: 'code-intelligence-settings',
      source: 'sandbox',
      github: {},
      repositories: [],
    });
  });

  it('never exposes the GitHub token to the browser or usage collection', () => {
    expect(config.exposeToBrowser).toEqual({});
    expect(config.exposeToUsage).toEqual({ github: { token: false } });
  });

  it('rejects an unknown source', () => {
    expect(() => config.schema.validate({ source: 'ssh' })).toThrow();
  });

  it('rejects repository allowlists beyond the configured maximum', () => {
    const repository = {
      repository: 'elastic/example',
      bareRepositoryPath: '/tmp/example.git',
      remoteName: 'origin',
      expectedRemoteUrl: 'https://github.com/elastic/example.git',
    };
    expect(() =>
      config.schema.validate({ repositories: Array.from({ length: 33 }, () => repository) })
    ).toThrow();
  });
});
