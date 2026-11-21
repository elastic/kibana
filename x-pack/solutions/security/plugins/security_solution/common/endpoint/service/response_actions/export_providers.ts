/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExportProvider } from '../../types';

/** Maximum length of an export provider `id`, the value sent in a response action's `parameters.export` */
export const EXPORT_PROVIDER_ID_MAX_LENGTH = 64;

/** An export provider `id` may only contain letters, digits, `_` and `-`. Case-sensitive. */
export const EXPORT_PROVIDER_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Maximum number of export providers a single policy may define. */
export const MAX_EXPORT_PROVIDERS_PER_POLICY = 10;

/** The export provider types supported so far. */
export const EXPORT_PROVIDER_TYPES = ['azure_blob'] as const;

/** An Azure Storage account name: 3-24 lowercase letters and digits. */
export const AZURE_STORAGE_ACCOUNT_NAME_PATTERN = /^[a-z0-9]{3,24}$/;

/**
 * An Azure Blob container name: 3-63 lowercase letters, digits and single hyphens, starting and
 * ending with a letter or digit.
 */
export const AZURE_BLOB_CONTAINER_NAME_PATTERN = /^(?=.{3,63}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Maximum length of an export provider's `service_url`. */
export const EXPORT_PROVIDER_SERVICE_URL_MAX_LENGTH = 2048;

export type ExportProviderFieldName = 'id' | 'type' | 'account_name' | 'container' | 'service_url';

export type ExportProviderFieldError =
  | 'required'
  | 'too_long'
  | 'invalid_format'
  | 'duplicate'
  | 'not_https'
  | 'unsupported';

/**
 * `id` is required, bounded, pattern-matched and unique among `otherIds` (exact, case-sensitive).
 * The value may come from unvalidated JSON, so it is checked regardless of its declared type.
 */
const getIdFieldError = (
  id: unknown,
  otherIds: readonly string[]
): ExportProviderFieldError | undefined => {
  if (id === undefined || id === null || id === '') {
    return 'required';
  }
  if (typeof id !== 'string') {
    return 'invalid_format';
  }
  if (id.length > EXPORT_PROVIDER_ID_MAX_LENGTH) {
    return 'too_long';
  }
  if (!EXPORT_PROVIDER_ID_PATTERN.test(id)) {
    return 'invalid_format';
  }
  if (otherIds.includes(id)) {
    return 'duplicate';
  }
  return undefined;
};

/** `type` is required and must be one of `EXPORT_PROVIDER_TYPES`. */
const getTypeFieldError = (type: unknown): ExportProviderFieldError | undefined => {
  if (type === undefined || type === null || type === '') {
    return 'required';
  }
  if (!(EXPORT_PROVIDER_TYPES as readonly unknown[]).includes(type)) {
    return 'unsupported';
  }
  return undefined;
};

/** Shared rule for `account_name` and `container`: required, then must match `pattern`. */
const getPatternFieldError = (
  value: unknown,
  pattern: RegExp
): ExportProviderFieldError | undefined => {
  if (value === undefined || value === null || value === '') {
    return 'required';
  }
  if (typeof value !== 'string' || !pattern.test(value)) {
    return 'invalid_format';
  }
  return undefined;
};

/**
 * `service_url` is optional. When present it must be a well-formed, credential-free `https` URL
 * within the length limit: a SAS token or `user:pass@` in the URL would put a credential into the
 * policy that every host receives.
 */
const getServiceUrlFieldError = (serviceUrl: unknown): ExportProviderFieldError | undefined => {
  if (serviceUrl === undefined) {
    return undefined;
  }
  if (typeof serviceUrl !== 'string') {
    return 'invalid_format';
  }
  if (serviceUrl.length > EXPORT_PROVIDER_SERVICE_URL_MAX_LENGTH) {
    return 'too_long';
  }
  // Endpoint gets the raw string, so it is checked as written. Printable ASCII only: no whitespace,
  // control characters, soft hyphens or look-alike Unicode hosts. WHATWG parsing would also accept
  // an empty `?` or `#`, and normalize `\` and forms like `https:/host` or `https:///host`. `@`
  // would be user info.
  if (!/^[\x21-\x7E]+$/.test(serviceUrl) || /[?#@\\]/.test(serviceUrl)) {
    return 'invalid_format';
  }

  let url: URL;
  try {
    url = new URL(serviceUrl);
  } catch {
    return 'invalid_format';
  }

  if (url.protocol !== 'https:') {
    return 'not_https';
  }
  if (!/^https:\/\/[^/]/.test(serviceUrl)) {
    return 'invalid_format';
  }
  return undefined;
};

/**
 * Field errors for one export provider. `otherIds` are the `id`s of the other providers defined
 * in the same policy, used to detect duplicates. An empty object means the provider is valid.
 * Used by the server (validation) and the UI (form feedback). Runtime-defensive: `provider` may
 * come from unvalidated JSON, so every field is checked regardless of its declared type.
 */
export const getExportProviderFieldErrors = (
  provider: Partial<ExportProvider>,
  otherIds: readonly string[]
): Partial<Record<ExportProviderFieldName, ExportProviderFieldError>> => {
  const errors: Partial<Record<ExportProviderFieldName, ExportProviderFieldError>> = {};

  const idError = getIdFieldError(provider.id, otherIds);
  if (idError) {
    errors.id = idError;
  }

  const typeError = getTypeFieldError(provider.type);
  if (typeError) {
    errors.type = typeError;
  }

  const accountNameError = getPatternFieldError(
    provider.account_name,
    AZURE_STORAGE_ACCOUNT_NAME_PATTERN
  );
  if (accountNameError) {
    errors.account_name = accountNameError;
  }

  const containerError = getPatternFieldError(
    provider.container,
    AZURE_BLOB_CONTAINER_NAME_PATTERN
  );
  if (containerError) {
    errors.container = containerError;
  }

  const serviceUrlError = getServiceUrlFieldError(provider.service_url);
  if (serviceUrlError) {
    errors.service_url = serviceUrlError;
  }

  return errors;
};
