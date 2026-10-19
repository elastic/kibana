/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import {
  formatSyntheticsPolicy,
  selectSecretConnections,
  VAULT_PACKAGE_UPGRADE_MESSAGE,
  VAULT_SECRET_STORAGE_DISABLED_MESSAGE,
} from './format_synthetics_policy';
import { SecretConnectionError, type HeartbeatVaultConfig } from '../../get_secret_connection';
import { ConfigKey, MonitorTypeEnum } from '../../../../common/runtime_types';

const conn = (name: string): HeartbeatVaultConfig => ({
  type: 'vault',
  name,
  address: `http://${name}:8200`,
  auth: { token: `${name}-token` },
});

describe('selectSecretConnections', () => {
  const conns = [conn('prod'), conn('staging')];

  it('returns only the referenced connections', () => {
    expect(selectSecretConnections(conns, new Set(['staging'])).map((c) => c.name)).toEqual([
      'staging',
    ]);
  });

  it('returns every referenced connection', () => {
    expect(selectSecretConnections(conns, new Set(['prod', 'staging'])).map((c) => c.name)).toEqual(
      ['prod', 'staging']
    );
  });

  it('rejects a reference without a connection name, listing the available ones', () => {
    expect(() => selectSecretConnections(conns, new Set([undefined]), 'm1')).toThrow(
      /without a connection name.*"prod", "staging"/
    );
    expect(() => selectSecretConnections([conn('only')], new Set([undefined, 'only']))).toThrow(
      /without a connection name/
    );
  });

  it('fails closed on a reference to a connection that is not configured', () => {
    expect(() => selectSecretConnections(conns, new Set(['nope']), 'm1')).toThrow(
      /references Vault connection "nope", which is not configured/
    );
    expect(() => selectSecretConnections([], new Set(['nope']))).toThrow(/none configured/);
  });

  it('throws SecretConnectionError', () => {
    expect(() => selectSecretConnections(conns, new Set(['nope']))).toThrow(SecretConnectionError);
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

  it('keeps the connection name in the value and ships only the referenced connection', () => {
    const vars = format('Bearer vault://staging@myapp/api#token', [conn('prod'), conn('staging')]);

    expect(vars[ConfigKey.PASSWORD].value).toBe('"Bearer vault://staging@myapp/api#token"');
    expect(decode(vars.secret_stores.value)).toEqual([
      {
        type: 'vault',
        name: 'staging',
        address: 'http://staging:8200',
        auth: { token: 'staging-token' },
      },
    ]);
  });

  it('ships every connection a monitor references', () => {
    const vars = format('vault://prod@a#b vault://staging@c#d', [conn('prod'), conn('staging')]);
    expect(decode(vars.secret_stores.value).map((c: { name: string }) => c.name)).toEqual([
      'prod',
      'staging',
    ]);
  });

  it('rejects an unnamed reference, even with a single connection', () => {
    expect(() => format('vault://myapp/api#token', [conn('only')])).toThrow(
      /without a connection name/
    );
  });

  it('fails when the referenced connection no longer exists', () => {
    expect(() => format('vault://gone@a#b', [])).toThrow(/"gone", which is not configured/);
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
    const { formattedPolicy } = formatSyntheticsPolicy(
      buildPolicy(),
      MonitorTypeEnum.HTTP,
      { [ConfigKey.NAME]: 'm1', [ConfigKey.PASSWORD]: 'vault://prod@a#b' },
      {},
      []
    );
    expect(formattedPolicy.inputs[0].streams[0].vars?.secret_stores.value).toBeNull();
  });

  it('fails when the installed package has no secret_stores var', () => {
    expect(() => format('vault://prod@a#b', [conn('prod')], buildPolicy(false))).toThrow(
      VAULT_PACKAGE_UPGRADE_MESSAGE
    );
  });

  it('fails closed when Fleet secret storage is disabled', () => {
    expect(() =>
      formatSyntheticsPolicy(
        buildPolicy(),
        MonitorTypeEnum.HTTP,
        { [ConfigKey.NAME]: 'm1', [ConfigKey.PASSWORD]: 'vault://prod@a#b' },
        {},
        [],
        false,
        [conn('prod')],
        false
      )
    ).toThrow(VAULT_SECRET_STORAGE_DISABLED_MESSAGE);
  });
});
