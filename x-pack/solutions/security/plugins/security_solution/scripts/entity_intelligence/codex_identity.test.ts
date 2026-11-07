/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCodexLocalOwner } from './codex_identity';

describe('Codex local source ownership', () => {
  it('retains the actual account name with a stable installation-scoped opaque ID', () => {
    const account = { uid: 501, username: 'james' };
    const owner = createCodexLocalOwner(account, 501, 'installation-salt');
    expect(owner).toEqual({
      id: expect.stringMatching(/^local-os:[a-f0-9]{64}$/),
      name: 'james',
      provenance: 'local_os_account',
    });
    expect(createCodexLocalOwner(account, 501, 'installation-salt')).toEqual(owner);
    expect(createCodexLocalOwner(account, 501, 'other-installation')?.id).not.toBe(owner?.id);
    expect(owner).not.toHaveProperty('uid');
    expect(owner).not.toHaveProperty('actor');
  });

  it('does not attach the collector account to files owned by another account', () => {
    expect(createCodexLocalOwner({ uid: 501, username: 'james' }, 502, 'salt')).toBeUndefined();
  });

  it.each([
    { uid: -1, username: 'james' },
    { uid: 501, username: '' },
    { uid: 501, username: 'private\ncontent' },
    { uid: 501, username: '/private/path' },
  ])('omits unavailable or invalid OS account metadata', (account) => {
    expect(createCodexLocalOwner(account, account.uid, 'salt')).toBeUndefined();
  });
});
