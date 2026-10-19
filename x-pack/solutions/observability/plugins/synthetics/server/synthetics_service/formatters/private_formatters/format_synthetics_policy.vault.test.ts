/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import {
  formatSyntheticsPolicy,
  selectSecretConnection,
  VAULT_PACKAGE_UPGRADE_MESSAGE,
} from './format_synthetics_policy';
import type { HeartbeatVaultConfig } from '../../get_secret_connection';
import { ConfigKey, MonitorTypeEnum } from '../../../../common/runtime_types';

const conn = (name: string): HeartbeatVaultConfig => ({
  type: 'vault',
  name,
  address: `http://${name}:8200`,
  auth: { token: `${name}-token` },
});

describe('selectSecretConnection', () => {
  const conns = [conn('prod'), conn('staging')];

  it('returns only the referenced connection (never the others)', () => {
    expect(selectSecretConnection(conns, new Set(['staging']))?.name).toBe('staging');
  });

  it('treats a single connection as the default for an unqualified reference', () => {
    expect(selectSecretConnection([conn('only')], new Set([undefined]))?.name).toBe('only');
  });

  it('does not guess a default when multiple connections exist', () => {
    expect(selectSecretConnection(conns, new Set([undefined]))).toBeUndefined();
  });

  it('fails closed on a reference to a connection that is not configured', () => {
    expect(() => selectSecretConnection(conns, new Set(['nope']), 'm1')).toThrow(
      /references Vault connection "nope", which is not configured/
    );
  });

  it('fails when a monitor references more than one connection', () => {
    expect(() => selectSecretConnection(conns, new Set(['prod', 'staging']), 'm1')).toThrow(
      /references multiple Vault connections \(prod, staging\)/
    );
  });

  it('accepts the default and the same connection by name together', () => {
    expect(selectSecretConnection([conn('only')], new Set([undefined, 'only']))?.name).toBe('only');
  });
});

describe('formatSyntheticsPolicy vault secret_stores', () => {
  const buildPolicy = (withSecretStores = true): NewPackagePolicy =>
    ({
      name: 'policy',
      namespace: 'default',
      enabled: true,
      inputs: [
        {
          type: 'synthetics/http',
          policy_template: 'synthetics',
          enabled: false,
          streams: [
            {
              enabled: false,
              data_stream: { type: 'synthetics', dataset: 'http' },
              vars: {
                [ConfigKey.PASSWORD]: { type: 'text', value: null },
                [ConfigKey.SOURCE_INLINE]: { type: 'text', value: null },
                ...(withSecretStores ? { secret_stores: { type: 'text', value: null } } : {}),
              },
            },
          ],
        },
      ],
    } as unknown as NewPackagePolicy);

  const format = (
    password: string,
    connections: HeartbeatVaultConfig[],
    policy = buildPolicy()
  ) => {
    const { formattedPolicy } = formatSyntheticsPolicy(
      policy,
      MonitorTypeEnum.HTTP,
      { [ConfigKey.NAME]: 'm1', [ConfigKey.PASSWORD]: password },
      {},
      [],
      false,
      connections
    );
    return formattedPolicy.inputs[0].streams[0].vars ?? {};
  };

  const decode = (value: unknown) =>
    JSON.parse(Buffer.from(String(value), 'base64').toString('utf8'));

  it('strips the connection name and ships only that connection as the one secret_stores entry', () => {
    const vars = format('Bearer vault://staging@myapp/api#token', [conn('prod'), conn('staging')]);

    expect(vars[ConfigKey.PASSWORD].value).toBe('"Bearer vault://myapp/api#token"');
    expect(decode(vars.secret_stores.value)).toEqual([
      { type: 'vault', address: 'http://staging:8200', auth: { token: 'staging-token' } },
    ]);
  });

  it('never delivers the Kibana-only connection name', () => {
    const vars = format('vault://prod@a#b', [conn('prod')]);
    expect(decode(vars.secret_stores.value)[0]).not.toHaveProperty('name');
  });

  it('uses the only connection for an unqualified reference', () => {
    const vars = format('vault://myapp/api#token', [conn('only')]);
    expect(vars[ConfigKey.PASSWORD].value).toBe('"vault://myapp/api#token"');
    expect(decode(vars.secret_stores.value)[0].address).toBe('http://only:8200');
  });

  it('leaves secret_stores unset when the monitor references no vault secret', () => {
    const vars = format('plain', [conn('prod')]);
    expect(vars.secret_stores.value).toBeNull();
  });

  it('does not treat the inline script as a reference (Heartbeat does not resolve it)', () => {
    const { formattedPolicy } = formatSyntheticsPolicy(
      buildPolicy(),
      MonitorTypeEnum.HTTP,
      { [ConfigKey.NAME]: 'm1', [ConfigKey.SOURCE_INLINE]: 'vault://prod@a#b' },
      {},
      [],
      false,
      [conn('prod')]
    );
    const vars = formattedPolicy.inputs[0].streams[0].vars ?? {};
    expect(vars.secret_stores.value).toBeNull();
  });

  it('does not attach connections when none are provided (inspect path)', () => {
    const vars = format('vault://prod@a#b', []);
    expect(vars.secret_stores.value).toBeNull();
  });

  it('fails when the installed package has no secret_stores var', () => {
    expect(() => format('vault://a#b', [conn('prod')], buildPolicy(false))).toThrow(
      VAULT_PACKAGE_UPGRADE_MESSAGE
    );
  });

  it('fails when the monitor references two different connections', () => {
    expect(() =>
      format('vault://prod@a#b vault://staging@c#d', [conn('prod'), conn('staging')])
    ).toThrow(/multiple Vault connections/);
  });
});
