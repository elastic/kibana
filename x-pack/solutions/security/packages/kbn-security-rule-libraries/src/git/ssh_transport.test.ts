/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, generateKeyPairSync } from 'node:crypto';
import { loadPrivateKey, parseSshUrl, verifyHostKey } from './ssh_transport';

const u32 = (value: number): Buffer => {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value);
  return out;
};
const str = (value: Buffer | string): Buffer => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return Buffer.concat([u32(bytes.length), bytes]);
};

const buildOpenSshKey = ({ cipher = 'none', type = 'ssh-ed25519' } = {}) => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const seed = Buffer.from(privateKey.export({ format: 'jwk' }).d ?? '', 'base64url');
  const pub = Buffer.from(publicKey.export({ format: 'jwk' }).x ?? '', 'base64url');
  const publicBlob = Buffer.concat([str(type), str(pub)]);
  const check = Buffer.from([1, 2, 3, 4]);
  let privateBlock = Buffer.concat([
    check,
    check,
    str(type),
    str(pub),
    str(Buffer.concat([seed, pub])),
    str('test'),
  ]);
  const padding = 8 - (privateBlock.length % 8);
  privateBlock = Buffer.concat([
    privateBlock,
    Buffer.from(Array.from({ length: padding }, (_, i) => i + 1)),
  ]);
  const body = Buffer.concat([
    Buffer.from('openssh-key-v1\0', 'latin1'),
    str(cipher),
    str('none'),
    str(''),
    u32(1),
    str(publicBlob),
    str(privateBlock),
  ]);
  const lines = body.toString('base64').match(/.{1,70}/g) ?? [];
  const pem = [
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    ...lines,
    '-----END OPENSSH PRIVATE KEY-----',
  ].join('\n');
  return { pem, pub };
};

describe('parseSshUrl', () => {
  it('parses ssh:// urls with user, port and path', () => {
    expect(parseSshUrl('ssh://deploy@git.example.com:2222/org/repo.git')).toEqual({
      user: 'deploy',
      host: 'git.example.com',
      port: 2222,
      path: '/org/repo.git',
    });
  });

  it('defaults the user to git and the port to 22', () => {
    expect(parseSshUrl('ssh://github.com/org/repo.git')).toEqual({
      user: 'git',
      host: 'github.com',
      port: 22,
      path: '/org/repo.git',
    });
  });

  it('parses scp-like urls', () => {
    expect(parseSshUrl('git@github.com:org/repo.git')).toEqual({
      user: 'git',
      host: 'github.com',
      port: 22,
      path: 'org/repo.git',
    });
  });

  it('returns null for http and https urls', () => {
    expect(parseSshUrl('https://github.com/org/repo')).toBeNull();
    expect(parseSshUrl('http://localhost:3000/org/repo')).toBeNull();
  });
});

describe('loadPrivateKey', () => {
  it('loads an unencrypted ed25519 OpenSSH key', () => {
    const { pem, pub } = buildOpenSshKey();
    const key = loadPrivateKey(pem);
    expect(key.publicKey.equals(pub)).toBe(true);
    expect(key.privateKey.asymmetricKeyType).toBe('ed25519');
  });

  it('rejects text that is not an OpenSSH key', () => {
    expect(() => loadPrivateKey('not a key')).toThrow('OpenSSH-format');
  });

  it('rejects encrypted keys', () => {
    expect(() => loadPrivateKey(buildOpenSshKey({ cipher: 'aes256-ctr' }).pem)).toThrow(
      'Encrypted private keys'
    );
  });

  it('rejects other key types', () => {
    expect(() => loadPrivateKey(buildOpenSshKey({ type: 'ssh-rsa' }).pem)).toThrow('not supported');
  });
});

describe('verifyHostKey', () => {
  const blob = Buffer.from('server host key blob');
  const base64 = blob.toString('base64');
  const other = Buffer.from('another host key blob').toString('base64');

  it('accepts a host key listed in known hosts', () => {
    expect(() =>
      verifyHostKey({
        host: 'git.example.com',
        port: 22,
        blob,
        knownHosts: `git.example.com ssh-ed25519 ${base64}`,
      })
    ).not.toThrow();
  });

  it('matches non-default ports with the bracketed form', () => {
    expect(() =>
      verifyHostKey({
        host: 'git.example.com',
        port: 2222,
        blob,
        knownHosts: `[git.example.com]:2222 ssh-ed25519 ${base64}`,
      })
    ).not.toThrow();
  });

  it('matches hashed host entries', () => {
    const salt = Buffer.from('0123456789abcdefghij');
    const hash = createHmac('sha1', salt).update('git.example.com').digest('base64');
    expect(() =>
      verifyHostKey({
        host: 'git.example.com',
        port: 22,
        blob,
        knownHosts: `|1|${salt.toString('base64')}|${hash} ssh-ed25519 ${base64}`,
      })
    ).not.toThrow();
  });

  it('refuses an unknown host and tells how to add it', () => {
    expect(() =>
      verifyHostKey({ host: 'git.example.com', port: 22, blob, knownHosts: '' })
    ).toThrow('Unknown host key for git.example.com');
  });

  it('refuses a host whose key changed', () => {
    expect(() =>
      verifyHostKey({
        host: 'git.example.com',
        port: 22,
        blob,
        knownHosts: `git.example.com ssh-ed25519 ${other}`,
      })
    ).toThrow('Host key changed');
  });

  it('ignores comments and entries for other hosts', () => {
    expect(() =>
      verifyHostKey({
        host: 'git.example.com',
        port: 22,
        blob,
        knownHosts: `# comment\nother.example.com ssh-ed25519 ${other}`,
      })
    ).toThrow('Unknown host key');
  });
});
