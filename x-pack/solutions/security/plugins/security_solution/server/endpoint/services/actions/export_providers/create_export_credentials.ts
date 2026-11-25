/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExportProvider } from '../../../../../common/endpoint/types';
import type { EndpointAppContextService } from '../../../endpoint_app_context_services';
import { createAzureBlobServiceSas } from './azure_blob_sas';

/** How long the SAS stays valid after the action expires, so an action picked up late can still finish its upload */
export const EXPORT_SAS_UPLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ExportCredentials {
  sas: string;
  /** When the SAS expires (ISO 8601) */
  expiresAt: string;
}

export interface CreateExportCredentialsOptions {
  endpointService: EndpointAppContextService;
  /** The host's Elastic Defend package policy (owner check in getAccountKey) */
  packagePolicyId: string;
  provider: ExportProvider;
  exportPath: string;
  /** The Fleet action's `expiration` */
  actionExpiration: string;
}

/**
 * The only code that reads the account key. `undefined` when getAccountKey returns no key.
 * Future credential types (e.g. a user delegation SAS) become a new branch here, not a new call site.
 */
export const createExportCredentials = async ({
  endpointService,
  packagePolicyId,
  provider,
  exportPath,
  actionExpiration,
}: CreateExportCredentialsOptions): Promise<ExportCredentials | undefined> => {
  const accountKey = await endpointService
    .getExportProviderKeyService()
    .getAccountKey(packagePolicyId, provider);

  if (!accountKey) {
    return undefined;
  }

  // Whole seconds: the SAS `se` has no milliseconds
  const expiresOn = new Date(
    Math.floor((Date.parse(actionExpiration) + EXPORT_SAS_UPLOAD_WINDOW_MS) / 1000) * 1000
  );
  const expiresAt = expiresOn.toISOString();
  const sas = createAzureBlobServiceSas({
    accountName: provider.account_name,
    accountKey,
    container: provider.container,
    blobPath: exportPath,
    expiresOn,
  });

  endpointService
    .createLogger('ExportCredentials')
    .debug(
      `Created a SAS for export provider [${provider.id}], path [${exportPath}], expiring at [${expiresAt}]`
    );

  return { sas, expiresAt };
};
