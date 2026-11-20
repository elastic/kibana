/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCreateLibraryRequest, toLibraryConnection } from './to_library_connection';
import type { NewRuleLibraryInput } from './types';

const input = (overrides: Partial<NewRuleLibraryInput>): NewRuleLibraryInput => ({
  scope: 'shared',
  source: 'git_http',
  url: ' https://github.com/org/library ',
  branch: 'main',
  region: '',
  authType: 'none',
  username: '',
  secret: '',
  knownHosts: '',
  pinnedVersion: '',
  ...overrides,
});

describe('toLibraryConnection', () => {
  it('maps a public git https library', () => {
    expect(toLibraryConnection(input({}))).toEqual({
      provider: {
        type: 'git',
        url: 'https://github.com/org/library',
        branch: 'main',
        auth_type: 'none',
      },
    });
  });

  it('maps a token and a pinned version', () => {
    expect(
      toLibraryConnection(input({ authType: 'token', secret: 'ghp_x', pinnedVersion: '1.2.0' }))
    ).toEqual({
      provider: {
        type: 'git',
        url: 'https://github.com/org/library',
        branch: 'main',
        auth_type: 'token',
      },
      secret: 'ghp_x',
      pinned_version: '1.2.0',
    });
  });

  it('maps git over ssh to the git provider with its username and known hosts', () => {
    const { provider } = toLibraryConnection(
      input({
        source: 'git_ssh',
        url: 'git@github.com:org/library.git',
        authType: 'ssh_key',
        username: 'git',
        secret: 'key',
        knownHosts: 'github.com ssh-ed25519 AAAA',
      })
    );

    expect(provider).toEqual(
      expect.objectContaining({
        type: 'git',
        auth_type: 'ssh_key',
        username: 'git',
        known_hosts: 'github.com ssh-ed25519 AAAA',
      })
    );
  });

  it('maps s3 with its region and leaves out empty fields', () => {
    const connection = toLibraryConnection(
      input({
        source: 's3',
        url: 'https://s3.eu-west-1.amazonaws.com/bucket',
        branch: '',
        region: 'eu-west-1',
      })
    );

    expect(connection.provider).toEqual({
      type: 's3',
      url: 'https://s3.eu-west-1.amazonaws.com/bucket',
      region: 'eu-west-1',
      auth_type: 'none',
    });
    expect(connection.secret).toBeUndefined();
  });

  it('does not send a region for git', () => {
    expect(toLibraryConnection(input({ region: 'eu-west-1' })).provider.region).toBeUndefined();
  });
});

describe('toCreateLibraryRequest', () => {
  it('adds the scope to the connection settings', () => {
    expect(toCreateLibraryRequest(input({ scope: 'space' }))).toEqual({
      ...toLibraryConnection(input({})),
      scope: 'space',
    });
  });
});
