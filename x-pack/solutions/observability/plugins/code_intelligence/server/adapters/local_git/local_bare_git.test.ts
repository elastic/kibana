/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocalBareGitRepositoryResolver } from './local_bare_git';

const mapping = {
  repository: 'elastic/example',
  bareRepositoryPath: '/tmp/example.git',
  remoteName: 'origin',
  expectedRemoteUrl: 'https://github.com/elastic/example.git',
};

describe('LocalBareGitRepositoryResolver configuration', () => {
  it('rejects non-absolute repository paths', () => {
    expect(
      () =>
        new LocalBareGitRepositoryResolver({
          cursorSecret: 'a'.repeat(32),
          repositories: [{ ...mapping, bareRepositoryPath: 'example.git' }],
        })
    ).toThrow('path must be absolute');
  });

  it('rejects duplicate repository identities', () => {
    expect(
      () =>
        new LocalBareGitRepositoryResolver({
          cursorSecret: 'a'.repeat(32),
          repositories: [mapping, mapping],
        })
    ).toThrow('must be unique');
  });
});
