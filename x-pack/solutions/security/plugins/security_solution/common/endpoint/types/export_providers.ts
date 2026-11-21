/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EXPORT_PROVIDER_TYPES } from '../service/response_actions/export_providers';

export type ExportProviderType = (typeof EXPORT_PROVIDER_TYPES)[number];

/** An export provider backed by an Azure Blob Storage container. */
export interface AzureBlobExportProvider {
  /** Name the admin chose; what `--export <id>` uses. Renaming a provider changes it in place */
  id: string;
  type: 'azure_blob';
  account_name: string;
  container: string;
  /** Optional; Endpoint defaults to https://<account_name>.blob.core.windows.net */
  service_url?: string;
}

// The union grows with S3 support (elastic/security-team#20836).
export type ExportProvider = AzureBlobExportProvider;

/** The `response_actions` settings of a policy's OS-specific config. */
export interface PolicyResponseActionsConfig {
  /**
   * Readonly so that `Immutable<PolicyConfig>` (UI store) stays assignable to `PolicyConfig`;
   * use `setExportProviders()` to change the list.
   */
  export_providers?: readonly ExportProvider[];
}

/** What the console may see about a provider. Never credentials or service_url. */
export interface ExportProviderSummary {
  id: string;
  type: ExportProviderType;
  account_name: string;
  container: string;
}

/** Response of the internal `EXPORT_PROVIDERS_ROUTE` API. */
export interface ExportProvidersApiResponse {
  data: ExportProviderSummary[];
}
