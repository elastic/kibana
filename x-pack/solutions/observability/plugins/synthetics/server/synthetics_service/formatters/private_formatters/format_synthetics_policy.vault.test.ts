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
import { ConfigKey, MonitorTypeEnum, ScheduleUnit } from '../../../../common/runtime_types';

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
  const buildPolicy = (withSecretStores = true, withProcessors = false): NewPackagePolicy =>
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
                [ConfigKey.URLS]: { type: 'text', value: null },
                [ConfigKey.NAME]: { type: 'text', value: null },
                [ConfigKey.REQUEST_HEADERS_CHECK]: { type: 'yaml', value: null },
                [ConfigKey.TLS_KEY]: { type: 'yaml', value: null },
                ...(withProcessors ? { processors: { type: 'yaml', value: null } } : {}),
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

  describe('allowed fields', () => {
    const formatConfig = (config: Record<string, unknown>) =>
      formatSyntheticsPolicy(
        buildPolicy(),
        MonitorTypeEnum.HTTP,
        { [ConfigKey.NAME]: 'm1', [ConfigKey.METADATA]: { is_tls_enabled: true }, ...config },
        {},
        [],
        false,
        [conn('prod')]
      ).formattedPolicy.inputs[0].streams[0].vars ?? {};

    it.each([
      [ConfigKey.URLS, 'https://attacker.example/?k=vault://prod@a#b'],
      [ConfigKey.NAME, 'vault://prod@a#b'],
    ])('rejects a reference in %s', (key, value) => {
      expect(() => formatConfig({ [key]: value })).toThrow(
        new RegExp(`Vault reference in "${key}"`)
      );
    });

    it('rejects a reference in a label, which only reaches the policy through processors', () => {
      expect(() =>
        formatSyntheticsPolicy(
          buildPolicy(true, true),
          MonitorTypeEnum.HTTP,
          {
            [ConfigKey.NAME]: 'm1',
            [ConfigKey.SCHEDULE]: { number: '3', unit: ScheduleUnit.MINUTES },
            [ConfigKey.LABELS]: { team: 'vault://prod@a#b' },
            [ConfigKey.PASSWORD]: 'vault://prod@a#b',
          },
          {},
          [],
          false,
          [conn('prod')]
        )
      ).toThrow(/Vault reference in "processors"/);
    });

    it('rejects an encoded reference in a disallowed field next to a valid one', () => {
      expect(() =>
        formatConfig({
          [ConfigKey.URLS]: 'https://attacker.example/?k=vault://prod@payments%2Fstripe#api_key',
          [ConfigKey.PASSWORD]: 'vault://prod@anything#x',
        })
      ).toThrow(/malformed Vault reference in "urls".*payments%2Fstripe/);
    });

    it('rejects a malformed reference even in an allowed field', () => {
      expect(() => formatConfig({ [ConfigKey.PASSWORD]: 'vault://prod@a%2Fb#c' })).toThrow(
        SecretConnectionError
      );
    });

    it('rejects a malformed reference that arrives through a param', () => {
      expect(() =>
        formatSyntheticsPolicy(
          buildPolicy(),
          MonitorTypeEnum.HTTP,
          { [ConfigKey.NAME]: 'm1', [ConfigKey.PASSWORD]: '${secret}' },
          { secret: 'vault://prod@a%2Fb#c' },
          [],
          false,
          [conn('prod')]
        )
      ).toThrow(/malformed Vault reference in "password"/);
    });

    it('rejects a reference that arrives through a param in a disallowed field', () => {
      expect(() =>
        formatSyntheticsPolicy(
          buildPolicy(),
          MonitorTypeEnum.HTTP,
          { [ConfigKey.NAME]: 'm1', [ConfigKey.URLS]: 'https://x/?k=${secret}' },
          { secret: 'vault://prod@a#b' },
          [],
          false,
          [conn('prod')]
        )
      ).toThrow(SecretConnectionError);
    });

    it.each([
      [ConfigKey.PASSWORD, 'vault://prod@a#b'],
      [ConfigKey.REQUEST_HEADERS_CHECK, { Authorization: 'Bearer vault://prod@a#b' }],
      [ConfigKey.TLS_KEY, 'vault://prod@a#b'],
    ])('allows a reference in %s', (key, value) => {
      const vars = formatConfig({ [key]: value });
      expect(decode(vars.secret_stores.value)[0].name).toBe('prod');
    });
  });
});
