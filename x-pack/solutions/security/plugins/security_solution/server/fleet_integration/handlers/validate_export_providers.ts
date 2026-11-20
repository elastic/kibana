/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isPlainObject } from 'lodash';
import type { ExportProvider, PolicyConfig } from '../../../common/endpoint/types';
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
import { EndpointIntegrationFleetError } from './errors';

const POLICY_OPERATING_SYSTEMS = ['windows', 'mac', 'linux'] as const;

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
  credentials: 'credentials are not supported yet',
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

const getProviderLabel = (index: number, id: unknown): string =>
  typeof id === 'string' && id !== ''
    ? `export_providers[${index}] ${quoteForMessage(id)}`
    : `export_providers[${index}]`;

const getProviderErrors = (
  provider: Record<string, unknown>,
  index: number,
  otherIds: readonly string[]
): string[] => {
  const label = getProviderLabel(index, provider.id);
  const errors: string[] = [];

  for (const key of Object.keys(provider)) {
    if (!(PROVIDER_FIELDS as readonly string[]).includes(key)) {
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
