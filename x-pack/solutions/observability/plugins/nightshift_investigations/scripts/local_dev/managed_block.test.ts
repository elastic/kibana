/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { MANAGED_BLOCK_START } from './constants';
import {
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

describe('planManagedBlock', () => {
  it('appends a block that Kibana reads, and re-running it changes nothing', () => {
    const original = 'server.port: 5601\n';
    const { content } = planManagedBlock(original, settings);

    expect(content.startsWith('server.port: 5601\n\n# >>>')).toBe(true);
    expect(parse(content)).toMatchObject({
      'server.port': 5601,
      'xpack.sandbox.api_key': 'kibana-local-dev:s3cret-password',
    });
    expect(planManagedBlock(content, settings).content).toBe(content);
    expect(removeManagedBlock(content)).toBe(original);
  });

  it('replaces the key of an earlier block in place, after a rotation', () => {
    const { content } = planManagedBlock('a: 1\n', settings);
    const rotated = planManagedBlock(`${content}b: 2\n`, {
      ...settings,
      'xpack.sandbox.api_key': 'kibana-local-dev:rotated',
    }).content;

    expect(rotated.split(MANAGED_BLOCK_START)).toHaveLength(2);
    expect(rotated.endsWith('b: 2\n')).toBe(true);
    expect(parse(rotated)['xpack.sandbox.api_key']).toBe('kibana-local-dev:rotated');
  });

  it('leaves out settings the file sets to the same value, nested or dotted', () => {
    const existing = [
      'xpack.sandbox:',
      '  enabled: true',
      'feature_flags.overrides:',
      '  nightshift.enabled: true',
    ].join('\n');
    const { content, alreadySet } = planManagedBlock(existing, settings);

    expect(alreadySet).toEqual([
      'feature_flags.overrides.nightshift.enabled',
      'xpack.sandbox.enabled',
    ]);
    expect(() => parse(content)).not.toThrow();
  });

  it('stops on a setting the file sets to another value, naming the key but not either value', () => {
    const existing = 'xpack.sandbox:\n  api_key: someone:else\n';
    const error = (() => {
      try {
        planManagedBlock(existing, settings);
      } catch (e) {
        return e as Error;
      }
    })();

    expect(error?.message).toContain('xpack.sandbox.api_key');
    expect(error?.message).not.toMatch(/someone|s3cret/);
  });
});

describe('redactManagedBlock', () => {
  it('hides the sandbox key', () => {
    const { content } = planManagedBlock('', settings);
    const redacted = redactManagedBlock(content);

    expect(redacted).not.toMatch(/s3cret/);
    expect(redacted).toContain('xpack.sandbox.api_key: <redacted>');
    expect(redacted).toContain('xpack.sandbox.host: sandbox.example');
  });
});
