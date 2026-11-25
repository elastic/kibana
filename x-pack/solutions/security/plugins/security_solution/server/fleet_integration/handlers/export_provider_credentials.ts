/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import { getFlattenedObject } from '@kbn/std';
import type { Logger } from '@kbn/core/server';
import type { NewPackagePolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { EXPORT_PROVIDER_KEY_ROUTE } from '../../../common/endpoint/constants';
import type { PolicyConfig } from '../../../common/endpoint/types';
import { getExportProviderKeyIds } from '../../../common/endpoint/models/export_providers';
import {
  EXPORT_PROVIDER_KEY_MIN_AGE_MS,
  type ExportProviderKeyClientInterface,
  type ExportProviderKeyMetadata,
} from '../../endpoint/lib/export_provider_keys';
import { EndpointIntegrationFleetError } from './errors';
import {
  POLICY_OPERATING_SYSTEMS,
  RESPONSE_ACTIONS_CONFIG_PATH_PATTERN,
  getExportProviderCredentialsReferenceMessage,
  getProviderLabel,
  isExportProviderCredentialsReference,
} from './validate_export_providers';

type PolicyOperatingSystem = (typeof POLICY_OPERATING_SYSTEMS)[number];
type PolicyOsConfig = PolicyConfig['windows'] | PolicyConfig['mac'] | PolicyConfig['linux'];

/** The `export_providers` array of one (possibly malformed) OS config, `[]` when absent or malformed */
const getOsExportProviders = (osConfig: unknown): unknown[] => {
  if (!isPlainObject(osConfig)) {
    return [];
  }

  const responseActions = (osConfig as Record<string, unknown>).response_actions;

  if (!isPlainObject(responseActions)) {
    return [];
  }

  const exportProviders = (responseActions as Record<string, unknown>).export_providers;

  return Array.isArray(exportProviders) ? exportProviders : [];
};

/** Same as `getOsExportProviders`, starting from the (possibly malformed) policy value itself */
const getOsExportProvidersFrom = (policyValue: unknown, os: PolicyOperatingSystem): unknown[] => {
  if (!isPlainObject(policyValue)) {
    return [];
  }

  return getOsExportProviders((policyValue as Record<string, unknown>)[os]);
};

/**
 * Recursively replaces every own-enumerable *empty* plain object with a sentinel value.
 * `getFlattenedObject` emits no leaf for an empty object (its loop over the object's entries
 * never runs), so a bare `response_actions: {}` override would otherwise flatten to nothing and
 * slip past the path check below.
 */
const markEmptyObjects = (value: unknown): unknown => {
  if (!isPlainObject(value)) {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>);

  if (entries.length === 0) {
    return { __empty__: true };
  }

  return Object.fromEntries(entries.map(([key, child]) => [key, markEmptyObjects(child)]));
};

/**
 * Whether an override `input` sets `response_actions` on any OS, in nested form
 * (`{ policy: { windows: { response_actions: ... } } }`) or through a literal dotted key, at any
 * depth (`{ 'policy.windows.response_actions': ... }`, `{ policy: { 'windows.response_actions': ... } }`,
 * `{ policy: { windows: { 'response_actions.export_providers': ... } } }`, ...): `getFlattenedObject`
 * joins both forms into the same dot-separated paths, so a single regex catches every case. An
 * explicit `undefined` leaf is treated the same as "not set" (the pre-existing behaviour).
 */
const hasResponseActionsOverride = (input: Record<string, unknown>): boolean => {
  const flattened = getFlattenedObject(markEmptyObjects(input) as Record<string, unknown>);

  return Object.entries(flattened).some(
    ([path, value]) => value !== undefined && RESPONSE_ACTIONS_CONFIG_PATH_PATTERN.test(path)
  );
};

/**
 * Rejects (400) a package policy whose `overrides` set `response_actions` on any OS: `overrides`
 * are merged into the agent input as is, after every other check
 * (`x-pack/platform/plugins/shared/fleet/server/services/agent_policies/package_policies_to_agent_inputs.ts`
 * ~l.185), and Elastic Agent expands any dotted override key into its nested form before applying it
 * (`x-pack/platform/plugins/shared/fleet/common/services/agent_policy_overrides.ts` ~l.22), so a
 * literal `'policy.windows.response_actions'` key is exactly as dangerous as the nested one. This
 * is the only place that catches it. `overrides` is loosely typed and may come from an unvalidated
 * API payload, so every level is checked before it is read; its values are never echoed.
 */
export const rejectResponseActionsInOverrides = (
  packagePolicy: Pick<NewPackagePolicy, 'overrides'>
): void => {
  const inputs = packagePolicy.overrides?.inputs;

  if (!isPlainObject(inputs)) {
    return;
  }

  const hasOverride = Object.values(inputs as Record<string, unknown>).some(
    (input) => isPlainObject(input) && hasResponseActionsOverride(input as Record<string, unknown>)
  );

  if (hasOverride) {
    throw new EndpointIntegrationFleetError(`Package policy overrides can't set response_actions`);
  }
};

/**
 * Rejects (400) `credentials` on any export provider of a newly created policy: a new policy can't
 * own a key yet, so the admin must set it through the key route once the policy exists. Tolerates
 * malformed input (part 1 validation reports structure problems elsewhere).
 */
export const rejectExportProviderCredentialsOnCreate = (policyValue: unknown): void => {
  const messages = new Set<string>();

  for (const os of POLICY_OPERATING_SYSTEMS) {
    getOsExportProvidersFrom(policyValue, os).forEach((provider, index) => {
      if (isPlainObject(provider) && 'credentials' in (provider as Record<string, unknown>)) {
        const label = getProviderLabel(index, (provider as Record<string, unknown>).id);

        messages.add(
          `${label}: credentials can't be set when the policy is created; set the key with PUT ${EXPORT_PROVIDER_KEY_ROUTE}`
        );
      }
    });
  }

  if (messages.size > 0) {
    throw new EndpointIntegrationFleetError(Array.from(messages).join('; '));
  }
};

/**
 * Rejects (400) a policy update whose export provider `credentials` are not exactly a key
 * reference, or that reference the same `key_id` from two providers of the same OS list. Runs
 * before `filterExportProviderKeyReferences`, so it sees every reference the caller sent, not only
 * the ones this package policy may keep.
 */
export const validateExportProviderCredentials = (policy: PolicyConfig): void => {
  const messages = new Set<string>();

  for (const os of POLICY_OPERATING_SYSTEMS) {
    const providers = getOsExportProviders(policy[os]);
    const keyIdCounts = new Map<string, number>();

    for (const provider of providers) {
      const credentials = isPlainObject(provider)
        ? (provider as Record<string, unknown>).credentials
        : undefined;

      if (isExportProviderCredentialsReference(credentials)) {
        keyIdCounts.set(credentials.key_id, (keyIdCounts.get(credentials.key_id) ?? 0) + 1);
      }
    }

    providers.forEach((provider, index) => {
      if (!isPlainObject(provider) || !('credentials' in (provider as Record<string, unknown>))) {
        return;
      }

      const record = provider as Record<string, unknown>;
      const label = getProviderLabel(index, record.id);
      const credentials = record.credentials;

      if (!isExportProviderCredentialsReference(credentials)) {
        messages.add(getExportProviderCredentialsReferenceMessage(label));
        return;
      }

      if ((keyIdCounts.get(credentials.key_id) ?? 0) > 1) {
        messages.add(`${label}: credentials.key_id must be unique within the policy`);
      }
    });
  }

  if (messages.size > 0) {
    throw new EndpointIntegrationFleetError(Array.from(messages).join('; '));
  }
};

/** Drops `credentials` from `provider` when its `key_id` is one of `keyIdsToDrop`; otherwise unchanged */
const dropKeyReferenceIfMatching = (
  provider: unknown,
  keyIdsToDrop: ReadonlySet<string>
): unknown => {
  if (!isPlainObject(provider)) {
    return provider;
  }

  const record = provider as Record<string, unknown>;
  const credentials = record.credentials;
  const keyId = isPlainObject(credentials)
    ? (credentials as Record<string, unknown>).key_id
    : undefined;

  if (typeof keyId !== 'string' || !keyIdsToDrop.has(keyId)) {
    return provider;
  }

  const { credentials: _credentials, ...rest } = record;

  return rest;
};

const dropExportProviderKeyReferencesFromOs = <OsConfig extends PolicyOsConfig>(
  os: OsConfig,
  keyIdsToDrop: ReadonlySet<string>
): OsConfig => {
  const providers = getOsExportProviders(os);

  if (providers.length === 0) {
    return os;
  }

  const responseActions = (os as unknown as Record<string, unknown>).response_actions;

  // The OS config may come from an unvalidated API payload, so the shape is rebuilt tolerantly
  // and the result is asserted back to `OsConfig` rather than inferred.
  return {
    ...os,
    response_actions: {
      ...(isPlainObject(responseActions) ? (responseActions as Record<string, unknown>) : {}),
      export_providers: providers.map((provider) =>
        dropKeyReferenceIfMatching(provider, keyIdsToDrop)
      ),
    },
  } as unknown as OsConfig;
};

/** Returns a copy of `policy` with the given `credentials.key_id`s removed from every OS list */
const dropExportProviderKeyReferences = (
  policy: PolicyConfig,
  keyIdsToDrop: ReadonlySet<string>
): PolicyConfig => ({
  ...policy,
  windows: dropExportProviderKeyReferencesFromOs(policy.windows, keyIdsToDrop),
  mac: dropExportProviderKeyReferencesFromOs(policy.mac, keyIdsToDrop),
  linux: dropExportProviderKeyReferencesFromOs(policy.linux, keyIdsToDrop),
});

/**
 * Whether any provider (on any OS list) that references `keyId` has an `account_name` other than
 * `accountName`. A non-string `account_name` counts as different.
 */
const isReferencedForAnotherAccount = (
  policy: PolicyConfig,
  keyId: string,
  accountName: string
): boolean =>
  POLICY_OPERATING_SYSTEMS.some((os) =>
    getOsExportProviders(policy[os]).some((provider) => {
      if (!isPlainObject(provider)) {
        return false;
      }

      const record = provider as Record<string, unknown>;
      const credentials = record.credentials;
      const referencedKeyId = isPlainObject(credentials)
        ? (credentials as Record<string, unknown>).key_id
        : undefined;

      return referencedKeyId === keyId && record.account_name !== accountName;
    })
  );

export interface FilterExportProviderKeyReferencesOptions {
  policy: PolicyConfig;
  packagePolicyId: string;
  /** The package policy as currently stored, or `undefined` when there isn't one (e.g. not found) */
  getStoredPolicy: () => Promise<Pick<PackagePolicy, 'inputs'> | undefined>;
  keyClient: ExportProviderKeyClientInterface;
  logger: Logger;
  /** Injected so tests can use a fixed clock */
  now: number;
}

/**
 * Drops an export provider `credentials` reference this package policy may not keep: the key
 * object must exist, belong to this package policy, and either already be referenced by the stored
 * policy or be new enough that the key route could have just created it, and have been saved for the
 * `account_name` of every provider that references it. Everything else about the
 * provider is kept. Returns `policy` unchanged, without reading anything, when it references no key.
 */
export const filterExportProviderKeyReferences = async ({
  policy,
  packagePolicyId,
  getStoredPolicy,
  keyClient,
  logger,
  now,
}: FilterExportProviderKeyReferencesOptions): Promise<PolicyConfig> => {
  const keyIds = getExportProviderKeyIds(policy);

  if (keyIds.size === 0) {
    return policy;
  }

  let keyMetadata: Map<string, ExportProviderKeyMetadata>;
  let storedKeyIds: Set<string>;

  try {
    const [metadata, storedPolicy] = await Promise.all([
      keyClient.getKeyMetadata(Array.from(keyIds)),
      getStoredPolicy(),
    ]);

    keyMetadata = metadata;
    storedKeyIds = getExportProviderKeyIds(
      (storedPolicy?.inputs?.[0]?.config?.policy?.value ?? {}) as PolicyConfig
    );
  } catch (error) {
    logger.error(
      `Unable to check export provider key references of package policy [${packagePolicyId}]: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    throw new EndpointIntegrationFleetError(
      'Unable to check the export provider key references; try again',
      500
    );
  }

  const keyIdsToDrop = new Set<string>();

  for (const keyId of keyIds) {
    const metadata = keyMetadata.get(keyId);
    const isOwned = metadata !== undefined && metadata.package_policy_id === packagePolicyId;
    const isStoredOrYoung =
      isOwned &&
      (storedKeyIds.has(keyId) ||
        now - Date.parse(metadata.created_at) < EXPORT_PROVIDER_KEY_MIN_AGE_MS);
    const isForAnotherAccount =
      isStoredOrYoung && isReferencedForAnotherAccount(policy, keyId, metadata.account_name);
    const isKept = isStoredOrYoung && !isForAnotherAccount;

    if (!isKept) {
      keyIdsToDrop.add(keyId);
      logger.debug(
        () =>
          `Dropping export provider key reference [key_id=${keyId}] of package policy [${packagePolicyId}]: ${
            metadata === undefined
              ? 'key object not found'
              : !isOwned
              ? 'key object belongs to another package policy'
              : isForAnotherAccount
              ? 'key object was saved for another storage account'
              : 'reference is not yet in the stored policy and the key is older than the minimum age'
          }`
      );
    }
  }

  return keyIdsToDrop.size === 0 ? policy : dropExportProviderKeyReferences(policy, keyIdsToDrop);
};
