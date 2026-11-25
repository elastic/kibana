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
  hasRelayConfig,
  planManagedBlock,
  redactManagedBlock,
  removeManagedBlock,
} from './managed_block';

const sandbox = {
  host: 'sandbox.example',
  port: 9090,
  apiKey: 'kibana-local-dev:s3cret-password',
};
const settings = getLocalDevSettings(sandbox);

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

describe('relay settings', () => {
  const relay = { url: 'http://localhost:3000' };
  const uiam = { certificate: '/certs/kibana.crt', key: '/certs/kibana.key' };

  it('writes the relay url into the block, and only when a relay is given', () => {
    const withRelay = planManagedBlock('', getLocalDevSettings(sandbox, relay));
    expect(parse(withRelay.content)['xpack.actions.relay.url']).toBe('http://localhost:3000');
    expect(withRelay.content).not.toContain('uiam');
    expect(planManagedBlock('', settings).content).not.toContain('xpack.actions.relay');
  });

  it('sets the Kibana URL the Relay calls back', () => {
    const { content } = planManagedBlock(
      '',
      getLocalDevSettings(sandbox, { ...relay, kibanaUrl: 'http://host.docker.internal:5601' })
    );
    expect(parse(content)['xpack.actions.relay.kibanaUrl']).toBe(
      'http://host.docker.internal:5601'
    );
  });

  it('enables UIAM with the certificate Relay needs for it, when asked', () => {
    const { content } = planManagedBlock('', getLocalDevSettings(sandbox, { ...relay, uiam }));
    expect(parse(content)).toMatchObject({
      'xpack.actions.relay.uiam.enabled': true,
      'xpack.actions.relay.ssl.certificate': '/certs/kibana.crt',
      'xpack.actions.relay.ssl.key': '/certs/kibana.key',
    });
  });

  it('sees a relay configured outside the block, dotted or nested, but not the block itself', () => {
    expect(hasRelayConfig('xpack.actions.relay.url: https://relay.example\n')).toBe(true);
    expect(
      hasRelayConfig('xpack:\n  actions:\n    relay:\n      url: https://relay.example\n')
    ).toBe(true);
    expect(hasRelayConfig('server.port: 5601\n')).toBe(false);

    const { content } = planManagedBlock('', getLocalDevSettings(sandbox, { ...relay, uiam }));
    expect(hasRelayConfig(content)).toBe(false);
  });
});
