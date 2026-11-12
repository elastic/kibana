/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { MANAGED_BLOCK_START } from './constants';
import {
  ENCRYPTION_KEY_SETTING,
  getLocalDevSettings,
  planManagedBlock,
  redactManagedBlock,
  removeManagedBlock,
} from './managed_block';

const settings = getLocalDevSettings({
  host: 'sandbox.example',
  port: 9090,
  apiKey: 'kibana-local-dev:s3cret-password',
});
const key = () => 'k'.repeat(64);

describe('planManagedBlock', () => {
  it('appends a block that Kibana reads, and re-running it changes nothing', () => {
    const original = 'server.port: 5601\n';
    const { content, addsEncryptionKey } = planManagedBlock(original, settings, key);

    expect(content.startsWith('server.port: 5601\n\n# >>>')).toBe(true);
    expect(parse(content)).toMatchObject({
      'server.port': 5601,
      'xpack.sandbox.api_key': 'kibana-local-dev:s3cret-password',
      [ENCRYPTION_KEY_SETTING]: key(),
    });
    expect(addsEncryptionKey).toBe(true);
    expect(planManagedBlock(content, settings, () => 'other'.repeat(10)).content).toBe(content);
    expect(removeManagedBlock(content)).toBe(original);
  });

  it('replaces the key of an earlier block in place, after a rotation', () => {
    const { content } = planManagedBlock('a: 1\n', settings, key);
    const rotated = planManagedBlock(
      `${content}b: 2\n`,
      { ...settings, 'xpack.sandbox.api_key': 'kibana-local-dev:rotated' },
      key
    ).content;

    expect(rotated.split(MANAGED_BLOCK_START)).toHaveLength(2);
    expect(rotated.endsWith('b: 2\n')).toBe(true);
    expect(parse(rotated)['xpack.sandbox.api_key']).toBe('kibana-local-dev:rotated');
  });

  it('leaves out settings the file sets to the same value, nested or dotted, and keeps its encryption key', () => {
    const existing = [
      'xpack.sandbox:',
      '  enabled: true',
      'feature_flags.overrides:',
      '  nightshift.enabled: true',
      `${ENCRYPTION_KEY_SETTING}: mine`,
    ].join('\n');
    const { content, alreadySet, addsEncryptionKey } = planManagedBlock(existing, settings, key);

    expect(alreadySet).toEqual([
      'feature_flags.overrides.nightshift.enabled',
      'xpack.sandbox.enabled',
    ]);
    expect(addsEncryptionKey).toBe(false);
    expect(() => parse(content)).not.toThrow();
  });

  it('stops on a setting the file sets to another value, naming the key but not either value', () => {
    const existing = 'xpack.sandbox:\n  api_key: someone:else\n';
    const error = (() => {
      try {
        planManagedBlock(existing, settings, key);
      } catch (e) {
        return e as Error;
      }
    })();

    expect(error?.message).toContain('xpack.sandbox.api_key');
    expect(error?.message).not.toMatch(/someone|s3cret/);
  });
});

describe('redactManagedBlock', () => {
  it('hides the sandbox and encryption keys', () => {
    const { content } = planManagedBlock('', settings, key);
    const redacted = redactManagedBlock(content);

    expect(redacted).not.toMatch(/s3cret|kkkk/);
    expect(redacted).toContain('xpack.sandbox.api_key: <redacted>');
    expect(redacted).toContain('xpack.sandbox.host: sandbox.example');
  });
});
