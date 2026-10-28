/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { cloneDeep } from 'lodash';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { processorsFormatter } from './processors_formatter';
import { LegacyConfigKey } from '../../../../common/constants/monitor_management';
import type { MonitorTypeEnum, MonitorFields } from '../../../../common/runtime_types';
import { ConfigKey } from '../../../../common/runtime_types';
import { throttlingFormatter } from './browser_formatters';
import {
  formatMWs,
  handleMultilineStringFormatter,
  replaceStringWithParams,
  resolveHttpAuthParams,
} from '../formatting_utils';
import {
  findMalformedVaultReferences,
  malformedVaultReferencesMessage,
  referencedConnectionNames,
} from '../vault_param_formatter';
import { SecretConnectionError, type HeartbeatVaultConfig } from '../../get_secret_connection';
import { syntheticsPolicyFormatters } from './formatters';
import { PARAMS_KEYS_TO_SKIP } from '../common';

export const VAULT_SECRET_STORAGE_DISABLED_MESSAGE =
  'Vault secret references require Fleet secret storage, which is not enabled. Enable Fleet secret storage and try again.';

export const VAULT_PACKAGE_UPGRADE_MESSAGE =
  'Vault secret references require the Synthetics integration version 1.13.0 or later. Upgrade the Synthetics package in Fleet and try again.';

/**
 * The only fields a Vault reference may resolve in: credentials and request content, never
 * where a request goes (url, hosts, proxy) or what is stored in results (name, tags). The TLS
 * key material is only used locally by the agent.
 */
export const VAULT_REFERENCE_FIELDS: ReadonlySet<string> = new Set([
  ConfigKey.USERNAME,
  ConfigKey.PASSWORD,
  ConfigKey.KERBEROS,
  ConfigKey.NTLM,
  ConfigKey.REQUEST_HEADERS_CHECK,
  ConfigKey.REQUEST_BODY_CHECK,
  ConfigKey.REQUEST_SEND_CHECK,
  ConfigKey.PARAMS,
  ConfigKey.TLS_CERTIFICATE,
  ConfigKey.TLS_KEY,
  ConfigKey.TLS_KEY_PASSPHRASE,
]);

/**
 * Picks the connections a monitor references, by name. Fails closed: a reference
 * without a connection name (`undefined`) or naming an unknown connection throws
 * instead of shipping the wrong credentials.
 */
export const selectSecretConnections = (
  all: HeartbeatVaultConfig[],
  referenced: Set<string | undefined>,
  monitorName?: string
): HeartbeatVaultConfig[] => {
  const byName = new Map(all.map((c) => [c.name, c]));
  const available = all.length ? all.map((c) => `"${c.name}"`).join(', ') : 'none configured';
  const selected = new Map<string, HeartbeatVaultConfig>();
  for (const name of referenced) {
    if (name === undefined) {
      throw new SecretConnectionError(
        `Monitor "${
          monitorName ?? ''
        }" has a Vault reference without a connection name. Use vault://<connection>@<path>#<field>; available connections: ${available}`
      );
    }
    const conn = byName.get(name);
    if (!conn) {
      throw new SecretConnectionError(
        `Monitor "${
          monitorName ?? ''
        }" references Vault connection "${name}", which is not configured (or its host is not in xpack.synthetics.secretConnections.allowedHosts); available connections: ${available}`
      );
    }
    selected.set(conn.name, conn);
  }
  return [...selected.values()];
};

export interface ProcessorFields {
  location_name: string;
  location_id: string;
  'monitor.project.name': string;
  'monitor.project.id': string;
  'monitor.id': string;
  test_run_id: string;
  run_once: boolean;
  space_id: string;
  kibanaUrl?: string;
}

const HTTP_AUTH_PACKAGE_KEYS = [ConfigKey.KERBEROS, ConfigKey.NTLM] as const;

export const HTTP_AUTH_PACKAGE_UPGRADE_MESSAGE =
  'Kerberos and NTLM authentication require the Synthetics integration version 1.12.0 or later. Upgrade the Synthetics package in Fleet and try again.';

/**
 * Enabled Kerberos/NTLM must map onto package vars. Older synthetics packages
 * omit these keys; writing would silently drop auth and leave the monitor
 * unauthenticated.
 */
export const assertHttpAuthPackageVarsAvailable = (
  config: Partial<MonitorFields & ProcessorFields>,
  vars: NewPackagePolicy['inputs'][number]['streams'][number]['vars'] | undefined
) => {
  for (const key of HTTP_AUTH_PACKAGE_KEYS) {
    const auth = config[key];
    if (auth && typeof auth === 'object' && 'enabled' in auth && auth.enabled && !vars?.[key]) {
      throw new Error(HTTP_AUTH_PACKAGE_UPGRADE_MESSAGE);
    }
  }
};

export { resolveHttpAuthParams };

export const formatSyntheticsPolicy = (
  newPolicy: NewPackagePolicy,
  monitorType: MonitorTypeEnum,
  config: Partial<MonitorFields & ProcessorFields>,
  params: Record<string, string>,
  mws: MaintenanceWindow[],
  isLegacy?: boolean,
  secretConnections?: HeartbeatVaultConfig[],
  secretStorageEnabled = true
) => {
  const resolvedConfig = resolveHttpAuthParams(config, params);
  const configKeys = Object.keys(resolvedConfig) as ConfigKey[];

  const formattedPolicy = cloneDeep(newPolicy);

  const currentInput = formattedPolicy.inputs.find(
    (input) => input.type === `synthetics/${monitorType}`
  );
  const dataStream = currentInput?.streams.find(
    (stream) => stream.data_stream.dataset === monitorType
  );
  formattedPolicy.inputs.forEach((input) => (input.enabled = false));

  if (currentInput && dataStream) {
    // reset all data streams to enabled false
    formattedPolicy.inputs.forEach((input) => (input.enabled = false));
    // enable only the input type and data stream that matches the monitor type.
    currentInput.enabled = true;
    dataStream.enabled = true;

    if (monitorType === 'browser') {
      currentInput.streams.forEach((stream) => {
        if (
          stream.data_stream.dataset === 'browser.network' ||
          stream.data_stream.dataset === 'browser.screenshot'
        ) {
          stream.enabled = true;
        }
      });
    }
    // API monitors emit a companion `synthetics.api.network` document per
    // request via Heartbeat's enrichSynthEvent → SetEventDataset path.
    // Enabling the `api.network` stream here is what causes Fleet to include
    // the matching index privileges in the generated agent API key. Without
    // it, journey/network_info events are produced and routed correctly by
    // Heartbeat but rejected at the bulk indexing layer with a 403, leaving
    // the api.network data stream silently empty.
    if (monitorType === 'api') {
      currentInput.streams.forEach((stream) => {
        if (stream.data_stream.dataset === 'api.network') {
          stream.enabled = true;
        }
      });
    }
  }

  assertHttpAuthPackageVarsAvailable(resolvedConfig, dataStream?.vars);

  configKeys.forEach((key) => {
    const configItem = dataStream?.vars?.[key];
    if (configItem) {
      if (syntheticsPolicyFormatters[key]) {
        configItem.value = syntheticsPolicyFormatters[key]?.(resolvedConfig, key);
      } else if (key === ConfigKey.MONITOR_SOURCE_TYPE && isLegacy) {
        configItem.value = undefined;
      } else {
        configItem.value =
          resolvedConfig[key] === undefined || resolvedConfig[key] === null
            ? null
            : resolvedConfig[key];
      }
      if (!PARAMS_KEYS_TO_SKIP.includes(key)) {
        configItem.value = replaceStringWithParams(configItem.value, params);
      }
      // if value contains a new line we need to add extra \n to escape it
      if (typeof configItem.value === 'string' && configItem.value.includes('\n')) {
        configItem.value = handleMultilineStringFormatter(configItem.value);
      }
    }
  });

  // Heartbeat decodes inline scripts when source.inline.encoding=base64.
  // synthetics 1.10.0 added this var to the API input with the same name as
  // browser, so encode whenever the installed package exposes it.
  const encodingVar = dataStream?.vars?.['source.inline.encoding'];
  if (encodingVar && resolvedConfig[ConfigKey.SOURCE_INLINE]) {
    encodingVar.value = 'base64';
    const inlineScript = dataStream.vars?.[ConfigKey.SOURCE_INLINE];
    if (inlineScript && typeof inlineScript.value === 'string') {
      inlineScript.value = Buffer.from(inlineScript.value).toString('base64');
    }
  }

  const processorItem = dataStream?.vars?.processors;
  if (processorItem) {
    processorItem.value = processorsFormatter(resolvedConfig as MonitorFields & ProcessorFields);
  }

  const mwItem = dataStream?.vars?.[ConfigKey.MAINTENANCE_WINDOWS];
  if (resolvedConfig[ConfigKey.MAINTENANCE_WINDOWS]?.length && mwItem) {
    const maintenanceWindows = resolvedConfig[ConfigKey.MAINTENANCE_WINDOWS];
    const formattedVal = formatMWs(
      maintenanceWindows.map((window) => {
        if (typeof window === 'string') {
          return mws.find((m) => m.id === window);
        }
        return window;
      }) as MaintenanceWindow[]
    );
    if (formattedVal) {
      mwItem.value = formattedVal;
    }
  }

  // TODO: remove this once we remove legacy support
  const throttling = dataStream?.vars?.[LegacyConfigKey.THROTTLING_CONFIG];
  if (throttling) {
    throttling.value = throttlingFormatter?.(resolvedConfig, ConfigKey.THROTTLING_CONFIG);
  }

  // Drop disabled inputs so we persist only the single active input. Disabled inputs never
  // contribute to the compiled agent policy and only bloat the saved object. A guard in Fleet's
  // `updatePackageInputs` keeps them from being re-added on package upgrade. Only strip once the
  // active input is resolved, so an unknown monitor type still yields the template.
  if (currentInput && dataStream) {
    formattedPolicy.inputs = formattedPolicy.inputs.filter((input) => input.enabled);
  }

  // Collect the vault connections this monitor references. Runs on the finished vars so
  // generated ones (e.g. labels in `processors`) are covered. Heartbeat does not resolve
  // references in the inline script, so it is left alone.
  const referencedSecretConnections = new Set<string | undefined>();
  Object.entries(dataStream?.vars ?? {}).forEach(([key, item]) => {
    if (!item || key === ConfigKey.SOURCE_INLINE) return;
    // Heartbeat also resolves references our strict grammar does not recognise (percent-encoded
    // paths), which would slip past the field allowlist below.
    const malformed = findMalformedVaultReferences(item.value);
    if (malformed.length > 0) {
      throw new SecretConnectionError(
        `Monitor "${
          config[ConfigKey.NAME] ?? ''
        }" has a malformed Vault reference in "${key}": ${malformedVaultReferencesMessage(
          malformed
        )}`
      );
    }
    const names = referencedConnectionNames(item.value);
    if (names.size > 0 && !VAULT_REFERENCE_FIELDS.has(key)) {
      throw new SecretConnectionError(
        `Monitor "${
          config[ConfigKey.NAME] ?? ''
        }" uses a Vault reference in "${key}". References are only allowed in: ${[
          ...VAULT_REFERENCE_FIELDS,
        ].join(', ')}`
      );
    }
    names.forEach((name) => referencedSecretConnections.add(name));
  });

  // Vault: when this monitor references a vault secret (vault://<name>@<path>#<field>
  // in any resolved field) attach the connections it uses to the `secret_stores`
  // var, base64-encoded. That var is `secret: true` in the package, so Fleet stores
  // it as a Fleet secret and the compiled policy carries only a
  // $co.elastic.secret{...} reference.
  if (dataStream && referencedSecretConnections.size > 0) {
    const secretStoresItem = dataStream.vars?.secret_stores;
    if (!secretStoresItem) {
      throw new SecretConnectionError(VAULT_PACKAGE_UPGRADE_MESSAGE);
    }
    // Without Fleet secret storage the var would be stored (and shipped) in plaintext.
    if (secretConnections && !secretStorageEnabled) {
      throw new SecretConnectionError(VAULT_SECRET_STORAGE_DISABLED_MESSAGE);
    }
    // `undefined` means no connections were loaded for this call (inspect path); an empty
    // list is real, so an unknown connection fails instead of being dropped.
    const connections = secretConnections
      ? selectSecretConnections(
          secretConnections,
          referencedSecretConnections,
          config[ConfigKey.NAME]
        )
      : [];
    if (connections.length) {
      secretStoresItem.value = Buffer.from(JSON.stringify(connections)).toString('base64');
    }
  }

  return { formattedPolicy, hasDataStream: Boolean(dataStream), hasInput: Boolean(currentInput) };
};
