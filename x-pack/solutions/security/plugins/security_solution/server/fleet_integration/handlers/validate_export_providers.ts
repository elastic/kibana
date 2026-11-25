/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isPlainObject, omitBy } from 'lodash';
import type {
  ExportProvider,
  ExportProviderAccountKeyReference,
  PolicyConfig,
} from '../../../common/endpoint/types';
import type {
  ExportProviderFieldError,
  ExportProviderFieldName,
} from '../../../common/endpoint/service/response_actions/export_providers';
import {
  EXPORT_PROVIDER_ID_MAX_LENGTH,
  EXPORT_PROVIDER_SERVICE_URL_MAX_LENGTH,
  EXPORT_PROVIDER_TYPES,
  MAX_EXPORT_PROVIDERS_PER_POLICY,
  getExportProviderFieldErrors,
} from '../../../common/endpoint/service/response_actions/export_providers';
import { EXPORT_PROVIDER_KEY_ROUTE } from '../../../common/endpoint/constants';
import { EndpointIntegrationFleetError } from './errors';

export const POLICY_OPERATING_SYSTEMS = ['windows', 'mac', 'linux'] as const;

/**
 * `credentials.key_id` is the id of a `security:endpoint-export-provider-key` object (a UUID).
 * Bounded to id-safe characters, so a hand-written value can't break the saved object lookup.
 */
const EXPORT_PROVIDER_KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Field order used for the error messages */
const PROVIDER_FIELDS: readonly ExportProviderFieldName[] = [
  'id',
  'type',
  'account_name',
  'container',
  'service_url',
];

/** Keys that the contract defines but Kibana does not accept yet */
const NOT_YET_SUPPORTED_KEY_MESSAGES: Readonly<Record<string, string>> = {
  ssl: 'ssl is not supported yet',
};

const INVALID_FORMAT_MESSAGES: Readonly<Record<ExportProviderFieldName, string>> = {
  id: 'id must contain only letters, digits, "_" and "-"',
  type: `type must be one of: ${EXPORT_PROVIDER_TYPES.join(', ')}`,
  account_name: 'account_name must be 3-24 lowercase letters and digits',
  container:
    'container must be 3-63 lowercase letters, digits and single hyphens, starting and ending with a letter or digit',
  service_url: 'service_url must be a valid URL without credentials, query or fragment',
};

const MAX_LENGTHS: Readonly<Partial<Record<ExportProviderFieldName, number>>> = {
  id: EXPORT_PROVIDER_ID_MAX_LENGTH,
  service_url: EXPORT_PROVIDER_SERVICE_URL_MAX_LENGTH,
};

const getFieldErrorMessage = (
  field: ExportProviderFieldName,
  error: ExportProviderFieldError
): string => {
  switch (error) {
    case 'required':
      return `${field} is required`;
    case 'too_long':
      return `${field} must be at most ${MAX_LENGTHS[field]} characters`;
    case 'invalid_format':
      return INVALID_FORMAT_MESSAGES[field];
    case 'duplicate':
      return `${field} must be unique within the policy`;
    case 'not_https':
      return `${field} must use https`;
    case 'not_azure_blob_host':
      return `${field} must be an Azure Blob Storage endpoint (*.blob.core.windows.net, *.blob.core.usgovcloudapi.net or *.blob.core.chinacloudapi.cn)`;
    case 'unsupported':
      return `${field} must be one of: ${EXPORT_PROVIDER_TYPES.join(', ')}`;
  }
};

/** Quoted (escapes control characters) and bounded, since the value comes from the request */
const quoteForMessage = (value: string): string =>
  JSON.stringify(
    value.length > EXPORT_PROVIDER_ID_MAX_LENGTH
      ? `${value.slice(0, EXPORT_PROVIDER_ID_MAX_LENGTH)}...`
      : value
  );

export const getProviderLabel = (index: number, id: unknown): string =>
  typeof id === 'string' && id !== ''
    ? `export_providers[${index}] ${quoteForMessage(id)}`
    : `export_providers[${index}]`;

/**
 * Exactly `{ type: 'account_key', key_id: <1-64 letters, digits, "_" and "-"> }`, no other
 * keys. Single source so the policy update pre-check and this validator never disagree.
 */
export const isExportProviderCredentialsReference = (
  value: unknown
): value is ExportProviderAccountKeyReference => {
  if (!isPlainObject(value) || Object.keys(value as object).length !== 2) {
    return false;
  }

  const { type, key_id: keyId } = value as Record<string, unknown>;

  return (
    type === 'account_key' &&
    typeof keyId === 'string' &&
    EXPORT_PROVIDER_KEY_ID_PATTERN.test(keyId)
  );
};

/** Single source for the message shown when `credentials` isn't exactly a key reference */
export const getExportProviderCredentialsReferenceMessage = (label: string): string =>
  `${label}: credentials must be a key reference; set the key with PUT ${EXPORT_PROVIDER_KEY_ROUTE}`;

const getProviderErrors = (
  provider: Record<string, unknown>,
  index: number,
  otherIds: readonly string[]
): string[] => {
  const label = getProviderLabel(index, provider.id);
  const errors: string[] = [];

  for (const key of Object.keys(provider)) {
    if (key === 'credentials') {
      if (!isExportProviderCredentialsReference(provider.credentials)) {
        errors.push(getExportProviderCredentialsReferenceMessage(label));
      }
    } else if (!(PROVIDER_FIELDS as readonly string[]).includes(key)) {
      // Own-property check: keys such as `constructor` or `__proto__` must not hit the prototype
      const message = Object.hasOwn(NOT_YET_SUPPORTED_KEY_MESSAGES, key)
        ? NOT_YET_SUPPORTED_KEY_MESSAGES[key]
        : `${quoteForMessage(key)} is not supported`;
      errors.push(`${label}: ${message}`);
    }
  }

  const fieldErrors = getExportProviderFieldErrors(provider as Partial<ExportProvider>, otherIds);

  for (const field of PROVIDER_FIELDS) {
    const fieldError = fieldErrors[field];

    if (fieldError) {
      errors.push(`${label}: ${getFieldErrorMessage(field, fieldError)}`);
    }
  }

  return errors;
};

/** A policy root key such as `windows.response_actions` or `mac.response_actions.export_providers` */
const DOTTED_OS_RESPONSE_ACTIONS_KEY_PATTERN = /^(?:windows|mac|linux)\.response_actions(?:\.|$)/;

const findDottedResponseActionsKey = (policy: PolicyConfig): string | undefined => {
  const rootKey = Object.keys(policy).find((key) =>
    DOTTED_OS_RESPONSE_ACTIONS_KEY_PATTERN.test(key)
  );

  if (rootKey !== undefined) {
    return rootKey;
  }

  for (const os of POLICY_OPERATING_SYSTEMS) {
    const osConfig: unknown = policy[os];

    if (isPlainObject(osConfig)) {
      const osKey = Object.keys(osConfig as Record<string, unknown>).find((key) =>
        key.startsWith('response_actions.')
      );

      if (osKey !== undefined) {
        return osKey;
      }

      // e.g. `export_providers.0.service_url`, which would override a validated provider
      const responseActions = (osConfig as Record<string, unknown>).response_actions;
      const responseActionsKey = isPlainObject(responseActions)
        ? Object.keys(responseActions as Record<string, unknown>).find((key) => key.includes('.'))
        : undefined;

      if (responseActionsKey !== undefined) {
        return responseActionsKey;
      }
    }
  }

  return undefined;
};

/**
 * Rejects (400) a policy that sets `response_actions` through a dotted key. Elastic Agent expands
 * dotted keys into nested ones, so such a key would reach Endpoint without going through
 * `validateExportProviders()`.
 */
export const validateNoDottedResponseActionsKeys = (policy: PolicyConfig): void => {
  const dottedKey = findDottedResponseActionsKey(policy);

  if (dottedKey !== undefined) {
    throw new EndpointIntegrationFleetError(
      `response_actions can't be set with a dotted key (${quoteForMessage(dottedKey)})`
    );
  }
};

type PolicyOsConfig = PolicyConfig[(typeof POLICY_OPERATING_SYSTEMS)[number]];

const withoutDottedResponseActionsKeys = <OsConfig extends PolicyOsConfig>(
  os: OsConfig
): OsConfig => {
  if (!isPlainObject(os)) {
    return os;
  }

  const osConfig = omitBy(os, (_, key) => key.startsWith('response_actions.')) as OsConfig;

  return isPlainObject(osConfig.response_actions)
    ? {
        ...osConfig,
        response_actions: omitBy(osConfig.response_actions, (_, key) => key.includes('.')),
      }
    : osConfig;
};

/**
 * Returns a copy of `policy` without the dotted keys that `validateNoDottedResponseActionsKeys()`
 * rejects, for deployments where export providers are stripped (feature flag / product feature).
 */
export const removeDottedResponseActionsKeys = (policy: PolicyConfig): PolicyConfig => {
  if (findDottedResponseActionsKey(policy) === undefined) {
    return policy;
  }

  return {
    ...omitBy(policy, (_, key) => DOTTED_OS_RESPONSE_ACTIONS_KEY_PATTERN.test(key)),
    windows: withoutDottedResponseActionsKeys(policy.windows),
    mac: withoutDottedResponseActionsKeys(policy.mac),
    linux: withoutDottedResponseActionsKeys(policy.linux),
  } as PolicyConfig;
};

/** Rejects (400) a policy whose export providers are invalid. */
export const validateExportProviders = (policy: PolicyConfig): void => {
  // The policy comes from an unvalidated API payload, so every level is checked before it is read
  const providerLists = POLICY_OPERATING_SYSTEMS.map((os): unknown[] => {
    const responseActions: unknown = policy[os]?.response_actions;

    if (responseActions === undefined) {
      return [];
    }

    if (!isPlainObject(responseActions)) {
      throw new EndpointIntegrationFleetError(`${os}.response_actions must be an object`);
    }

    const exportProviders: unknown = (responseActions as Record<string, unknown>).export_providers;

    if (exportProviders === undefined) {
      return [];
    }

    if (!Array.isArray(exportProviders)) {
      throw new EndpointIntegrationFleetError(
        `${os}.response_actions.export_providers must be an array`
      );
    }

    return exportProviders;
  });

  const [providers, ...otherOsProviders] = providerLists;

  if (otherOsProviders.some((osProviders) => !isEqual(osProviders, providers))) {
    throw new EndpointIntegrationFleetError(
      'response_actions.export_providers must be the same for windows, mac and linux'
    );
  }

  if (providers.length > MAX_EXPORT_PROVIDERS_PER_POLICY) {
    throw new EndpointIntegrationFleetError(
      `response_actions.export_providers can have at most ${MAX_EXPORT_PROVIDERS_PER_POLICY} providers`
    );
  }

  const ids = providers.map((provider) =>
    isPlainObject(provider) ? (provider as Record<string, unknown>).id : undefined
  );

  const errors = providers.flatMap((provider, index) => {
    if (!isPlainObject(provider)) {
      return [`export_providers[${index}] must be an object`];
    }

    const otherIds = ids.filter(
      (id, idIndex): id is string => idIndex !== index && typeof id === 'string'
    );

    return getProviderErrors(provider as Record<string, unknown>, index, otherIds);
  });

  if (errors.length > 0) {
    throw new EndpointIntegrationFleetError(errors.join('; '));
  }
};
